// Utilidades HTTP compartidas por las funciones de /api.
import crypto from 'node:crypto'

// Hash corto para usar IPs y emails como claves de límite sin guardarlos en claro.
export const hashKey = value => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 32)

// Texto que vino de afuera, seguro para escribir en los logs (sin saltos de
// línea ni caracteres de control, con largo máximo).
export const logSafe = (value, max = 64) => String(value ?? '').replace(/[^\w.@:/-]/g, '?').slice(0, max)

// Compara dos secretos sin filtrar información por tiempo.
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

// Rate limiting básico en memoria (por instancia de función).
export function createRateLimiter({ limit, windowMs }) {
  const hits = new Map()
  return function allow(key, now = Date.now()) {
    const entry = hits.get(key)
    if (!entry || now > entry.reset) {
      hits.set(key, { count: 1, reset: now + windowMs })
      if (hits.size > 5000) hits.clear()
      return true
    }
    entry.count += 1
    return entry.count <= limit
  }
}

export function clientIp(req) {
  const fwd = req.headers && req.headers['x-forwarded-for']
  return (typeof fwd === 'string' && fwd.split(',')[0].trim()) || req.socket?.remoteAddress || 'unknown'
}

export function bearerToken(req) {
  const h = req.headers && req.headers.authorization
  const m = typeof h === 'string' && /^Bearer\s+(\S+)$/i.exec(h)
  return m ? m[1] : ''
}

export function send(res, status, body, cacheControl = 'no-store') {
  if (res.setHeader) {
    res.setHeader('Cache-Control', cacheControl)
    res.setHeader('X-Content-Type-Options', 'nosniff')
  }
  return res.status(status).json(body)
}

// Rechaza si la promesa no termina a tiempo (el webhook tiene que responder < 5 s).
export function withDeadline(promise, ms) {
  let timer
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`deadline ${ms}ms`)), ms)
  })
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer))
}
