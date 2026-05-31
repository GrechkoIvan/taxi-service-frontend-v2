const crypto = require('crypto')
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

const dbPath = pathModule.join(__dirname, 'db.json')

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
    if (!db.managers) db.managers = []
    return db
  } catch {
    return { managers: [] }
  }
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

function getTokenFromCookie(req) {
  const cookies = parseCookies(req)
  return cookies[COOKIE_NAME] ?? null
}

module.exports = (req, res, next) => {
  const path = normalizePath(req.path)

  // POST /manager/login
  if (req.method === 'POST' && path === '/manager/auth/login') {
    const { login, password } = req.body ?? {}

    if (!login || !password) {
      return json(res, 400, { message: 'Некорректные данные' })
    }

    const db = readDb()
    const manager = db.managers.find((m) => m.login === login)

    if (!manager) {
      return json(res, 401, { message: 'Неверный логин или пароль' })
    }

    const passwordHashFromDb = manager.passwordHash
      ? String(manager.passwordHash)
      : manager.password
        ? hashPassword(manager.password)
        : null

    if (!passwordHashFromDb || passwordHashFromDb !== hashPassword(password)) {
      return json(res, 401, { message: 'Неверный логин или пароль' })
    }

    const token = jwt.sign({ managerId: manager.id }, JWT_SECRET)
    setAuthCookie(req, res, token)

    return json(res, 200, {
      manager: {
        id: manager.id,
        login: manager.login,
        name: manager.name
      }
    })
  }

  // POST /manager/logout
  if (req.method === 'POST' && path === '/manager/auth/logout') {
    clearAuthCookie(req, res)
    return json(res, 200, { ok: true })
  }

  // GET /manager/me
  if (req.method === 'GET' && path === '/manager/auth/me') {
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

    return json(res, 200, {
      id: manager.id,
      login: manager.login,
      name: manager.name
    })
  }

  return next()
}
