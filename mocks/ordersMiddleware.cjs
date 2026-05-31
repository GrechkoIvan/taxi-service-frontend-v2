const fs = require('fs')
const pathModule = require('path')

const dbPath = pathModule.join(__dirname, 'db.json')

function json(res, status, data) {
  res.status(status)
  res.json(data)
}

function normalizePath(path) {
  if (typeof path !== 'string') return ''
  return path.startsWith('/api/') ? path.slice('/api'.length) : path
}

function readDb() {
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8')
    const db = JSON.parse(raw)
    if (!db.users) db.users = []
    if (!db.orders) db.orders = []
    if (!db.drivers) db.drivers = []
    if (!db.reviews) db.reviews = []
    return db
  } catch {
    return { users: [], orders: [], drivers: [], reviews: [] }
  }
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
}

function isFinalStatus(status) {
  return status === 'finished' || status === 'canceled_by_customer'
}

function isFinalStatusForCustomer(status) {
  return status === 'canceled_by_customer' || status === 'finished'
}

function canDriverSetStatus(current, next) {
  if (current === 'accepted' && next === 'arrived') return true
  if (current === 'arrived' && next === 'in_progress') return true
  if (current === 'in_progress' && next === 'finished') return true
  return false
}

module.exports = (req, res, next) => {
  const path = normalizePath(req.path)

  const user = req.user
  if (!user) {
    return json(res, 500, {
      message:
        'authGuard не установил req.user. Проверь порядок middleware: corsMiddleware -> authGuard -> остальные',
    })
  }

  // Never expose /users from json-server, because it contains passwordHash.
  // For UI data (name/phone) use dedicated endpoints with role checks.
  if (path === '/users' || path.startsWith('/users/')) {
    return json(res, 403, { message: 'Доступ запрещён' })
  }

  if (req.method === 'PATCH' && /^\/orders\/[^/]+$/.test(path)) {
    const orderId = path.split('/')[2]
    const { status } = req.body ?? {}

    if (typeof status !== 'string') {
      return next()
    }

    const db = readDb()
    const order = db.orders.find((o) => String(o.id) === String(orderId))
    if (!order) {
      return json(res, 404, { message: 'Заказ не найден' })
    }

    if (status === 'canceled_by_customer') {
      if (user.role !== 'customer') {
        return json(res, 403, { message: 'Доступ запрещён' })
      }

      if (String(order.customerId) !== String(user.id)) {
        return json(res, 403, { message: 'Это не ваш заказ' })
      }

      if (order.status !== 'searching_driver') {
        return json(res, 409, { message: 'Нельзя отменить заказ на этом этапе' })
      }

      order.status = 'canceled_by_customer'
      order.canceledAt = req.body?.canceledAt ?? new Date().toISOString()
      order.updatedAt = new Date().toISOString()

      writeDb(db)

      return json(res, 200, order)
    }

    if (user.role !== 'driver') {
      return json(res, 403, { message: 'Доступ запрещён' })
    }

    if (status === 'accepted') {
      if (order.status !== 'searching_driver' || order.driverId) {
        return json(res, 409, { message: 'Заказ уже принят другим водителем' })
      }

      order.status = 'accepted'
      order.driverId = user.id
      order.acceptedAt = req.body?.acceptedAt ?? new Date().toISOString()
      order.updatedAt = new Date().toISOString()

      writeDb(db)
      return json(res, 200, order)
    }

    if (String(order.driverId) !== String(user.id)) {
      return json(res, 403, { message: 'Это не ваш заказ' })
    }

    if (!canDriverSetStatus(order.status, status)) {
      return json(res, 409, { message: 'Нельзя перевести заказ в этот статус' })
    }

    order.status = status
    order.updatedAt = new Date().toISOString()

    writeDb(db)
    return json(res, 200, order)
  }

  // CUSTOMER endpoints
  if (path.startsWith('/customers/')) {
    // GET /customers/drivers/:id/public
    if (req.method === 'GET' && /^\/customers\/drivers\/[^/]+\/public$/.test(path)) {
      const driverId = path.split('/')[3]
      const db = readDb()

      const hasOrderWithThisDriver = db.orders.some((o) => {
        if (String(o.customerId) !== String(user.id)) return false
        if (!o.driverId) return false
        if (String(o.driverId) !== String(driverId)) return false
        if (o.status === 'canceled_by_customer') return false
        return true
      })

      if (!hasOrderWithThisDriver) {
        return json(res, 403, { message: 'Доступ запрещён' })
      }

      const driverUser = db.users.find((u) => String(u.id) === String(driverId))
      if (!driverUser) {
        return json(res, 404, { message: 'Водитель не найден' })
      }

      const driverRecord = db.drivers.find((d) => {
        if (String(d.userId) === String(driverId)) return true
        if (String(d.id) === String(driverId)) return true
        return false
      })

      return json(res, 200, {
        id: driverUser.id,
        name: driverUser.name,
        phone: driverUser.phone,
        comfortLevel: driverRecord?.comfortLevel ?? null,
        car: driverRecord?.car ?? null,
      })
    }

    // GET /customers/orders/current
    if (req.method === 'GET' && path === '/customers/orders/current') {
      const db = readDb()

      // last active order of this customer
      const activeOrders = db.orders.filter((o) => {
        if (String(o.customerId) !== String(user.id)) return false
        if (isFinalStatusForCustomer(o.status)) return false
        return true
      })

      if (activeOrders.length) {
        const order = activeOrders[activeOrders.length - 1]
        return json(res, 200, order)
      }

      // If there is no active order, return the latest finished order.
      // This helps UI show review form after reload.
      const finishedOrders = db.orders.filter((o) => {
        if (String(o.customerId) !== String(user.id)) return false
        return o.status === 'finished'
      })

      const lastFinished = finishedOrders.length
        ? finishedOrders[finishedOrders.length - 1]
        : null

      if (!lastFinished) {
        return json(res, 200, null)
      }

      const alreadyReviewed = db.reviews.some((r) => {
        if (String(r.orderId) !== String(lastFinished.id)) return false
        if (String(r.customerId) !== String(user.id)) return false
        return true
      })

      if (alreadyReviewed) {
        return json(res, 200, null)
      }

      return json(res, 200, lastFinished)
    }

    // GET /customers/orders/history
    if (req.method === 'GET' && path === '/customers/orders/history') {
      const db = readDb()

      const orders = db.orders
        .filter((o) => String(o.customerId) === String(user.id))
        .sort((a, b) => {
          const aTime = new Date(a.createdAt ?? 0).getTime()
          const bTime = new Date(b.createdAt ?? 0).getTime()
          return bTime - aTime
        })

      const items = orders.map((o) => {
        const review = db.reviews.find((r) => {
          if (String(r.orderId) !== String(o.id)) return false
          if (String(r.customerId) !== String(user.id)) return false
          return true
        })

        return {
          order: o,
          review: review ?? null,
        }
      })

      return json(res, 200, items)
    }

    // POST /customers/orders/:id/cancel
    return next()
  }

  // DRIVER endpoints
  if (!path.startsWith('/drivers/')) {
    return next()
  }

  // GET /drivers/customers/:id/public
  if (req.method === 'GET' && /^\/drivers\/customers\/[^/]+\/public$/.test(path)) {
    const customerId = path.split('/')[3]
    const db = readDb()

    const activeOrderForThisCustomer = db.orders.find((o) => {
      const driverId = o.driverId
      if (!driverId) return false
      if (String(driverId) !== String(user.id)) return false
      if (isFinalStatus(o.status)) return false
      if (String(o.customerId) !== String(customerId)) return false
      return true
    })

    if (!activeOrderForThisCustomer) {
      return json(res, 403, { message: 'Доступ запрещён' })
    }

    const customer = db.users.find((u) => String(u.id) === String(customerId))
    if (!customer) {
      return json(res, 404, { message: 'Клиент не найден' })
    }

    return json(res, 200, {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
    })
  }

  // POST /drivers/me/online
  // PATCH /drivers/me
  if (req.method === 'PATCH' && path === '/drivers/me') {
    const { isOnline, coords } = req.body ?? {}

    if (isOnline !== undefined && typeof isOnline !== 'boolean') {
      return json(res, 400, { message: 'Некорректный isOnline' })
    }

    if (
      coords !== undefined &&
      coords !== null &&
      (!Array.isArray(coords) || coords.length !== 2 || typeof coords[0] !== 'number' || typeof coords[1] !== 'number')
    ) {
      return json(res, 400, { message: 'Некорректные координаты' })
    }

    const db = readDb()
    const record = db.drivers.find((d) => String(d.userId) === String(user.id) || String(d.id) === String(user.id))
    if (!record) {
      return json(res, 404, { message: 'Профиль водителя не найден' })
    }

    if (typeof isOnline === 'boolean') {
      record.isOnline = isOnline
      if (isOnline === false) {
        record.coords = null
      }
    }

    if (coords !== undefined) {
      record.coords = coords
    }

    record.updatedAt = new Date().toISOString()

    writeDb(db)

    return json(res, 200, {
      id: record.id,
      userId: record.userId,
      isOnline: Boolean(record.isOnline),
      coords: record.coords ?? null,
      updatedAt: record.updatedAt,
    })
  }

  // GET /drivers/me/profile
  if (req.method === 'GET' && path === '/drivers/me/profile') {
    const db = readDb()
    const record = db.drivers.find((d) => String(d.userId) === String(user.id) || String(d.id) === String(user.id))
    if (!record) {
      return json(res, 404, { message: 'Профиль водителя не найден' })
    }

    return json(res, 200, {
      id: record.id,
      userId: record.userId,
      comfortLevel: record.comfortLevel ?? null,
      car: record.car ?? null,
      isOnline: Boolean(record.isOnline),
      updatedAt: record.updatedAt,
    })
  }

  // GET /drivers/me/reviews
  if (req.method === 'GET' && path === '/drivers/me/reviews') {
    const db = readDb()

    const reviews = db.reviews
      .filter((r) => String(r.driverId) === String(user.id))
      .sort((a, b) => {
        const aTime = new Date(a.createdAt ?? 0).getTime()
        const bTime = new Date(b.createdAt ?? 0).getTime()
        return bTime - aTime
      })

    const items = reviews.map((r) => {
      const customer = db.users.find((u) => String(u.id) === String(r.customerId))
      return {
        ...r,
        customerName: customer?.name ?? null,
      }
    })

    const totalReviews = items.length
    const avg = totalReviews
      ? items.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / totalReviews
      : 0

    return json(res, 200, {
      averageRating: avg,
      totalReviews,
      reviews: items,
    })
  }

  // GET /drivers/orders/current
  if (req.method === 'GET' && path === '/drivers/orders/current') {
    const db = readDb()

    const order = db.orders.find((o) => {
      const driverId = o.driverId
      if (!driverId) return false
      if (String(driverId) !== String(user.id)) return false
      if (isFinalStatus(o.status)) return false
      return true
    })

    return json(res, 200, order ?? null)
  }

  // GET /drivers/orders/history
  if (req.method === 'GET' && path === '/drivers/orders/history') {
    const db = readDb()

    const orders = db.orders
      .filter((o) => {
        if (String(o.driverId ?? '') !== String(user.id)) return false
        return o.status === 'finished'
      })
      .sort((a, b) => {
        const aTime = new Date(a.createdAt ?? 0).getTime()
        const bTime = new Date(b.createdAt ?? 0).getTime()
        return bTime - aTime
      })

    const items = orders.map((o) => {
      const review = db.reviews.find((r) => {
        if (String(r.orderId) !== String(o.id)) return false
        if (String(r.driverId) !== String(user.id)) return false
        return true
      })

      return {
        order: o,
        review: review ?? null,
      }
    })

    return json(res, 200, items)
  }

  // GET /drivers/orders/available
  if (req.method === 'GET' && path === '/drivers/orders/available') {
    const db = readDb()

    const driverRecord = db.drivers.find((d) => String(d.userId) === String(user.id))
    const comfortLevel = String(driverRecord?.comfortLevel ?? '')
      .trim()
      .toLowerCase()

    if (!comfortLevel) {
      return json(res, 200, [])
    }

    const orders = db.orders.filter((o) => {
      if (o.status !== 'searching_driver') return false
      if (o.driverId) return false
      if (String(o.comfortType ?? '').toLowerCase() !== comfortLevel) return false
      return true
    })

    return json(res, 200, orders)
  }

  return next()
}
