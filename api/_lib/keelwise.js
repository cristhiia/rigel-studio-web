// Lógica compartida de suscripciones Keelwise (Mercado Pago Suscripciones).
// Los archivos con prefijo "_" dentro de /api no se publican como funciones.
// Todo lo que toca red recibe sus dependencias por parámetro para poder
// testearlo con mocks (ver tests/keelwise.test.js).
import crypto from 'node:crypto'

export const MP_API = 'https://api.mercadopago.com'
export const KEELWISE_REASON = 'Keelwise — suscripción mensual'
export const TABLE = 'keelwise_subscriptions'
const MP_TIMEOUT_MS = 3500

// ── Email ────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function isValidEmail(email) {
  const e = normalizeEmail(email)
  return e.length > 0 && e.length <= 254 && EMAIL_RE.test(e)
}

// ── IDs de Mercado Pago (preapproval / authorized payment) ───────────────
export function isValidMpId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id)
}

// ── Firma del webhook ────────────────────────────────────────────────────
// Header x-signature: "ts=<ts>,v1=<hmac>". Manifest según la documentación de
// MP: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" (se omite cada parte
// que no venga). data.id alfanumérico se pasa a minúsculas.
export function parseSignatureHeader(header) {
  const out = {}
  if (typeof header !== 'string') return out
  for (const part of header.split(',')) {
    const [k, v] = part.split('=').map(s => s && s.trim())
    if (k && v) out[k] = v
  }
  return out
}

export function buildManifest({ dataId, requestId, ts }) {
  let m = ''
  if (dataId) m += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`
  if (requestId) m += `request-id:${requestId};`
  if (ts) m += `ts:${ts};`
  return m
}

export function verifySignature({ signatureHeader, requestId, dataId, secret }) {
  if (!secret) return false
  const { ts, v1 } = parseSignatureHeader(signatureHeader)
  if (!ts || !v1 || !/^[a-f0-9]{64}$/i.test(v1)) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(buildManifest({ dataId, requestId, ts }))
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1.toLowerCase(), 'hex'))
}

// ── Estados ──────────────────────────────────────────────────────────────
const KNOWN_STATUSES = new Set(['authorized', 'pending', 'paused', 'cancelled'])

// Devuelve { status, active } o null si MP manda un estado que no conocemos.
export function mapStatus(mpStatus) {
  if (!KNOWN_STATUSES.has(mpStatus)) return null
  return { status: mpStatus, active: mpStatus === 'authorized' }
}

export function isKeelwisePreapproval(preapproval) {
  return Boolean(preapproval) && preapproval.reason === KEELWISE_REASON
}

export function toRow(preapproval, now = new Date()) {
  const mapped = mapStatus(preapproval.status)
  if (!mapped) return null
  const email = normalizeEmail(preapproval.external_reference || preapproval.payer_email)
  if (!email) return null
  return {
    email,
    mp_preapproval_id: String(preapproval.id),
    status: mapped.status,
    next_payment_date: preapproval.next_payment_date || null,
    updated_at: now.toISOString(),
  }
}

// ── Cliente de Mercado Pago ──────────────────────────────────────────────
export function createMpClient({ accessToken, fetchImpl = fetch }) {
  async function call(path, init = {}) {
    const res = await fetchImpl(`${MP_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(MP_TIMEOUT_MS),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(`MP ${init.method || 'GET'} ${path} -> ${res.status}`)
      err.status = res.status
      err.mpMessage = body && body.message
      throw err
    }
    return body
  }
  return {
    createPreapproval: payload => call('/preapproval', { method: 'POST', body: JSON.stringify(payload) }),
    getPreapproval: id => call(`/preapproval/${encodeURIComponent(id)}`),
    getAuthorizedPayment: id => call(`/authorized_payments/${encodeURIComponent(id)}`),
  }
}

export function buildPreapprovalPayload({ email, priceArs, siteUrl }) {
  const payer = normalizeEmail(email)
  return {
    reason: KEELWISE_REASON,
    payer_email: payer,
    external_reference: payer,
    back_url: `${siteUrl.replace(/\/$/, '')}/keelwise/gracias`,
    status: 'pending',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: priceArs,
      currency_id: 'ARS',
      free_trial: { frequency: 7, frequency_type: 'days' },
    },
  }
}

export function parsePriceArs(raw) {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

// ── Webhook: procesar una notificación ya verificada ─────────────────────
// mp: { getPreapproval, getAuthorizedPayment } · store: { upsert(row) }
// Idempotente: siempre consulta el estado actual en MP y hace upsert por
// mp_preapproval_id, así un evento repetido o desordenado no duplica filas.
export async function processNotification({ type, dataId }, { mp, store, log = console }) {
  if (!isValidMpId(dataId)) return { handled: false, reason: 'invalid-id' }

  let preapprovalId
  if (type === 'subscription_preapproval') {
    preapprovalId = dataId
  } else if (type === 'subscription_authorized_payment') {
    const payment = await mp.getAuthorizedPayment(dataId)
    preapprovalId = payment && payment.preapproval_id
    if (!isValidMpId(preapprovalId)) return { handled: false, reason: 'no-preapproval' }
  } else {
    return { handled: false, reason: 'ignored-type' }
  }

  const preapproval = await mp.getPreapproval(preapprovalId)
  if (!isKeelwisePreapproval(preapproval)) return { handled: false, reason: 'not-keelwise' }

  const row = toRow(preapproval)
  if (!row) {
    log.warn('[keelwise] estado desconocido o sin email, se ignora', {
      preapproval_id: preapprovalId,
      status: preapproval.status,
    })
    return { handled: false, reason: 'unknown-status' }
  }

  await store.upsert(row)
  return { handled: true, row }
}

// ── Supabase (service role, solo server) ─────────────────────────────────
export async function createSupabaseStore({ url, serviceRoleKey }) {
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
  return {
    client,
    async upsert(row) {
      const { error } = await client.from(TABLE).upsert(row, { onConflict: 'mp_preapproval_id' })
      if (error) throw new Error(`Supabase upsert: ${error.message}`)
    },
  }
}

// KEELWISE_APK_URL puede ser una URL pública o "supabase-storage://bucket/ruta.apk";
// en ese caso se firma server-side con validez corta.
export async function resolveApkUrl(apkUrl, { getSupabaseClient, expiresIn = 600 }) {
  if (!apkUrl) return null
  const m = /^supabase-storage:\/\/([^/]+)\/(.+)$/.exec(apkUrl)
  if (!m) return apkUrl
  const client = await getSupabaseClient()
  const { data, error } = await client.storage.from(m[1]).createSignedUrl(m[2], expiresIn)
  if (error) throw new Error(`Supabase signed URL: ${error.message}`)
  return data.signedUrl
}

// ── Rate limiting básico en memoria (por instancia de función) ───────────
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
  const fwd = req.headers['x-forwarded-for']
  return (typeof fwd === 'string' && fwd.split(',')[0].trim()) || req.socket?.remoteAddress || 'unknown'
}

// Consulta MP y responde si el preapproval de Keelwise está activo.
export async function isActivePreapproval(preapprovalId, mp) {
  if (!isValidMpId(preapprovalId)) return false
  try {
    const p = await mp.getPreapproval(preapprovalId)
    return isKeelwisePreapproval(p) && mapStatus(p.status)?.active === true
  } catch (err) {
    if (err.status === 404) return false
    throw err
  }
}
