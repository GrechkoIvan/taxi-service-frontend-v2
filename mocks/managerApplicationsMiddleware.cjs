const fs = require('fs')
const pathModule = require('path')
const crypto = require('crypto')
const { USER_ROLES } = require('./authConstants.cjs')

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
    if (!db.drivers) db.drivers = []
    if (!db.driverApplications) db.driverApplications = []
    if (!db.managers) db.managers = []
    return db
  } catch {
    return { users: [], drivers: [], driverApplications: [], managers: [] }
  }
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
}

function withoutSecrets(application) {
  const { passwordHash, ...rest } = application
  return rest
}

module.exports = (req, res, next) => {
  const path = normalizePath(req.path)

  // Only manager endpoints
  if (!path.startsWith('/manager/')) {
    return next()
  }

  const manager = req.manager
  if (!manager) {
    return json(res, 500, {
      message:
        'managerGuard не установил req.manager. Проверь порядок middleware: corsMiddleware -> managerGuard -> managerAuthMiddleware -> managerApplicationsMiddleware'
    })
  }

  // GET /manager/driver-applications
  if (req.method === 'GET' && path === '/manager/driver-applications') {
    const status = req.query?.status
    const db = readDb()

    let apps = db.driverApplications
    if (typeof status === 'string' && status.length) {
      apps = apps.filter((a) => a.status === status)
    }

    const safeApps = apps.map(withoutSecrets)
    return json(res, 200, safeApps)
  }

  // GET /manager/driver-applications/:id
  if (
    req.method === 'GET' &&
    /^\/manager\/driver-applications\/[^/]+$/.test(path)
  ) {
    const id = path.split('/')[3]
    const db = readDb()

    const app = db.driverApplications.find((a) => String(a.id) === String(id))
    if (!app) {
      return json(res, 404, { message: 'Заявка не найдена' })
    }

    return json(res, 200, withoutSecrets(app))
  }

  // POST /manager/driver-applications/:id/approve
  if (
    req.method === 'PATCH' &&
    /^\/manager\/driver-applications\/[^/]+$/.test(path)
  ) {
    const id = path.split('/')[3]
    const { action } = req.body ?? {}

    if (action !== 'approve') {
      return next()
    }

    const {
      driverLicenseNumber,
      carMake,
      carModel,
      carColor,
      carPlate,
      comfortLevel
    } = req.body ?? {}

    if (
      !driverLicenseNumber ||
      !carMake ||
      !carModel ||
      !carColor ||
      !carPlate ||
      !comfortLevel
    ) {
      return json(res, 400, { message: 'Некорректные данные' })
    }

    const normalizedComfortLevel = String(comfortLevel ?? '')
      .trim()
      .toLowerCase()

    if (
      normalizedComfortLevel !== 'economy' &&
      normalizedComfortLevel !== 'comfort' &&
      normalizedComfortLevel !== 'business'
    ) {
      return json(res, 400, { message: 'Некорректный уровень комфорта' })
    }

    const db = readDb()
    const app = db.driverApplications.find((a) => String(a.id) === String(id))
    if (!app) {
      return json(res, 404, { message: 'Заявка не найдена' })
    }

    if (app.status !== 'pending') {
      return json(res, 409, { message: 'Заявка уже рассмотрена' })
    }

    const emailTakenByDriver = db.users.some(
      (u) => u.email === app.email && u.role === USER_ROLES.DRIVER
    )
    if (emailTakenByDriver) {
      return json(res, 409, { message: 'Водитель с таким email уже существует' })
    }

    const newDriverUser = {
      id: crypto.randomUUID(),
      email: app.email,
      name: app.name,
      role: USER_ROLES.DRIVER,
      phone: app.phone,
      passwordHash: app.passwordHash
    }

    db.users.push(newDriverUser)

    // driver record used by ordersMiddleware (online/offline/location)
    db.drivers.push({
      id: String(newDriverUser.id),
      userId: newDriverUser.id,
      isOnline: false,
      coords: null,
      updatedAt: new Date().toISOString(),

      // extra profile fields
      comfortLevel: normalizedComfortLevel,
      driverLicenseNumber,
      car: {
        make: carMake,
        model: carModel,
        color: carColor,
        plate: carPlate
      }
    })

    app.status = 'approved'
    app.reviewedAt = new Date().toISOString()
    app.driverId = newDriverUser.id
    app.reviewedByManagerId = manager.id
    app.driverLicenseNumber = driverLicenseNumber
    app.car = {
      make: carMake,
      model: carModel,
      color: carColor,
      plate: carPlate
    }
    app.comfortLevel = normalizedComfortLevel

    writeDb(db)

    return json(res, 200, {
      ok: true,
      driverId: newDriverUser.id
    })
  }

  // PATCH /manager/driver-applications/:id (reject)
  if (
    req.method === 'PATCH' &&
    /^\/manager\/driver-applications\/[^/]+$/.test(path)
  ) {
    const id = path.split('/')[3]
    const { action } = req.body ?? {}

    if (action !== 'reject') {
      return next()
    }

    const { comment } = req.body ?? {}

    if (!comment || String(comment).trim().length < 3) {
      return json(res, 400, { message: 'Укажите причину отказа (минимум 3 символа)' })
    }

    const db = readDb()
    const app = db.driverApplications.find((a) => String(a.id) === String(id))
    if (!app) {
      return json(res, 404, { message: 'Заявка не найдена' })
    }

    if (app.status !== 'pending') {
      return json(res, 409, { message: 'Заявка уже рассмотрена' })
    }

    app.status = 'rejected'
    app.reviewedAt = new Date().toISOString()
    app.reviewedByManagerId = manager.id
    app.managerComment = String(comment).trim()

    writeDb(db)

    return json(res, 200, { ok: true })
  }

  return next()
}
