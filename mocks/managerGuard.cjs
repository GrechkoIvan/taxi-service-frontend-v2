const fs = require('fs')
const pathModule = require('path')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not set. Create a .env file in project root (see .env.example)'
  )
}

const COOKIE_NAME = 'manager_access_token'

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
  return cookies[COOKIE_NAME] ?? null
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
    if (!db.managers) db.managers = []
    return db
  } catch {
    return { managers: [] }
  }
}

module.exports = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next()
  }

  const path = normalizePath(req.path)

  // Guard only manager endpoints (except login)
  if (!path.startsWith('/manager/')) {
    return next()
  }

  if (path === '/manager/auth/login') {
    return next()
  }

  const token = getTokenFromCookie(req)
  if (!token) {
    return json(res, 401, { message: 'Не авторизован' })
  }

  let decoded
  try {
    decoded = jwt.verify(token, JWT_SECRET)
  } catch {
    return json(res, 401, { message: 'Не авторизован' })
  }

  const db = readDb()
  const manager = db.managers.find((m) => String(m.id) === String(decoded.managerId))
  if (!manager) {
    return json(res, 401, { message: 'Менеджер не найден' })
  }

  req.manager = manager
  req.managerId = manager.id

  return next()
}
