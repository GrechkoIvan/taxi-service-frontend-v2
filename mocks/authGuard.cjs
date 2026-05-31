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

function getTokenFromCookie(req) {
  const cookies = parseCookies(req)
  return cookies['access_token'] ?? null
}

function json(res, status, data) {
  res.status(status)
  res.json(data)
}

function normalizePath(path) {
  if (typeof path !== 'string') return ''
  return path.startsWith('/api/') ? path.slice('/api'.length) : path
}

function readDb() {
  const dbPath = pathModule.join(__dirname, 'db.json')
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8')
    const db = JSON.parse(raw)
    if (!db.users) db.users = []
    return db
  } catch {
    return { users: [] }
  }
}

const protectedEndpoints = {
  '/auth/me': [USER_ROLES.CUSTOMER, USER_ROLES.DRIVER],
  '/users': [USER_ROLES.CUSTOMER],
  '/customers': [USER_ROLES.CUSTOMER],
  '/customers/': [USER_ROLES.CUSTOMER],
  '/drivers': [USER_ROLES.DRIVER],
  '/drivers/': [USER_ROLES.DRIVER],
  '/orders': [USER_ROLES.CUSTOMER, USER_ROLES.DRIVER],
  '/reviews': [USER_ROLES.CUSTOMER, USER_ROLES.DRIVER]
}

module.exports = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next()
  }

  const path = normalizePath(req.path)

  let requiredRoles = null
  for (const [endpoint, roles] of Object.entries(protectedEndpoints)) {
    if (path.startsWith(endpoint)) {
      requiredRoles = roles
      break
    }
  }

  if (!requiredRoles) {
    return next()
  }

  const token = getTokenFromCookie(req)
  if (!token) {
    return json(res, 401, { message: 'Не авторизован' })
  }

  let decoded
  try {
    decoded = jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return json(res, 401, { message: 'Не авторизован' })
  }


  const db = readDb()
  const user = db.users.find(u => u.id === decoded.userId)
  if (!user) {
    return json(res, 401, { message: 'Пользователь не найден' })
  }

  if (!requiredRoles.includes(user.role)) {
    return json(res, 403, { message: 'Недостаточно прав' })
  }

  req.user = user
  req.userId = user.id

  return next()
}
