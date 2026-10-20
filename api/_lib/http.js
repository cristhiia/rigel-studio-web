// Utilidades HTTP compartidas por las funciones de /api.

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
  if (res.setHeader) res.setHeader('Cache-Control', cacheControl)
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
