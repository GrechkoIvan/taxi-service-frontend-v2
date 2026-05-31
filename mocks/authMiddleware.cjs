const crypto = require('crypto')
const fs = require('fs')
const pathModule = require('path')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
const { USER_ROLES } = require('./authConstants.cjs')

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not set. Create a .env file in project root (see .env.example)'
  )
}
const dbPath = pathModule.join(__dirname, 'db.json')

const COOKIE_NAME = 'access_token'

function parseCookies(req) {
  const header = req.headers.cookie
  if (!header) return {}

  return header.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=')
    if (!rawKey) return acc
    const key = rawKey
    const value = rest.join('=')
    acc[key] = decodeURIComponent(value)
    return acc
  }, {})
}

function setAuthCookie(req, res, token) {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https'
  const sameSite = 'Lax'
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `SameSite=${sameSite}`
  ]
  if (isSecure) {
    parts.push('Secure')
  }
  res.setHeader('Set-Cookie', parts.join('; '))
}

function clearAuthCookie(req, res) {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https'
  const sameSite = 'Lax'
  const parts = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    `SameSite=${sameSite}`
  ]
  if (isSecure) {
    parts.push('Secure')
  }
  res.setHeader('Set-Cookie', parts.join('; '))
}

function readDb() {
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8')
    const db = JSON.parse(raw)
    if (!db.users) db.users = []
    if (!db.driverApplications) db.driverApplications = []
    return db
  } catch {
    return { users: [], driverApplications: [] }
  }
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex')
}

function json(res, status, data) {
  res.status(status)
  res.json(data)
}

function normalizePath(path) {
  if (typeof path !== 'string') return ''
  return path.startsWith('/api/') ? path.slice('/api'.length) : path
}

function buildUser({ role, email, name, phone }) {
  return {
    id: crypto.randomUUID(),
    email,
    name,
    role,
    phone
  }
}

function getTokenFromCookie(req) {
  const cookies = parseCookies(req)
  return cookies[COOKIE_NAME] ?? null
}

module.exports = (req, res, next) => {
  const path = normalizePath(req.path)

  // POST /auth/login
  if (req.method === 'POST' && path === '/auth/login') {
    const { email, password, role } = req.body ?? {}

    if (!email || !password || !role) {
      return json(res, 400, { message: 'Некорректные данные' })
    }

    const db = readDb()
    const existingUser = db.users.find(
      (u) => u.email === email && u.role === role
    )

    if (!existingUser) {
      return json(res, 401, { message: 'Неверный email или пароль' })
    }

    if (existingUser.passwordHash !== hashPassword(password)) {
      return json(res, 401, { message: 'Неверный email или пароль' })
    }

    const token = jwt.sign({ userId: existingUser.id }, JWT_SECRET)

    setAuthCookie(req, res, token)

    const user = {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      role: existingUser.role,
      phone: existingUser.phone
    }

    return json(res, 200, { user })
  }

  // POST /auth/register/customer
  if (req.method === 'POST' && path === '/auth/register/customer') {
    const { email, password, name, phone } = req.body ?? {}

    if (!email || !password || !name || !phone) {
      return json(res, 400, { message: 'Некорректные данные' })
    }

    const db = readDb()

    const emailTaken = db.users.some(
      (u) => u.email === email && u.role === USER_ROLES.CUSTOMER
    )
    if (emailTaken) {
      return json(res, 409, { message: 'Email уже занят' })
    }

    const newUser = buildUser({ role: USER_ROLES.CUSTOMER, email, name, phone })
    db.users.push({
      ...newUser,
      passwordHash: hashPassword(password)
    })
    writeDb(db)

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET)

    setAuthCookie(req, res, token)

    return json(res, 200, { user: newUser })
  }

  // POST /auth/driver-applications
  if (req.method === 'POST' && path === '/auth/driver-applications') {
    const { email, password, name, phone } = req.body ?? {}

    if (!email || !password || !name || !phone) {
      return json(res, 400, { message: 'Некорректные данные' })
    }

    const db = readDb()

    const emailTakenByDriver = db.users.some(
      (u) => u.email === email && u.role === USER_ROLES.DRIVER
    )
    if (emailTakenByDriver) {
      return json(res, 409, { message: 'Водитель с таким email уже существует' })
    }

    const hasPendingApplication = db.driverApplications.some(
      (a) => a.email === email && a.status === 'pending'
    )
    if (hasPendingApplication) {
      return json(res, 409, { message: 'Заявка уже отправлена и ожидает рассмотрения' })
    }

    const application = {
      id: crypto.randomUUID(),
      email,
      name,
      phone,
      passwordHash: hashPassword(password),
      status: 'pending',
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      driverId: null,
    }

    db.driverApplications.push(application)
    writeDb(db)

    return json(res, 200, { ok: true })
  }

  // POST /auth/logout
  if (req.method === 'DELETE' && path === '/auth/session') {
    clearAuthCookie(req, res)
    return json(res, 200, { ok: true })
  }

  // GET /auth/me
  if (req.method === 'GET' && path === '/auth/me') {
    const user = req.user
    if (!user) {
      return json(res, 401, { message: 'Не авторизован' })
    }

    return json(res, 200, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
    })
  }

  return next()
}
