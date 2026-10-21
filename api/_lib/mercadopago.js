// Cliente mínimo de Mercado Pago + verificación de firma de webhooks.
// Los archivos con prefijo "_" dentro de /api no se publican como funciones.
import crypto from 'node:crypto'

export const MP_API = 'https://api.mercadopago.com'
const DEFAULT_TIMEOUT_MS = 3500

// ── IDs de Mercado Pago (preapproval, pago, pago autorizado) ─────────────
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

// ── Cliente ──────────────────────────────────────────────────────────────
export function createMpClient({ accessToken, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  async function call(path, init = {}) {
    const res = await fetchImpl(`${MP_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(timeoutMs),
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
  const post = (path, payload) => call(path, { method: 'POST', body: JSON.stringify(payload) })
  return {
    createPreapproval: payload => post('/preapproval', payload),
    getPreapproval: id => call(`/preapproval/${encodeURIComponent(id)}`),
    getAuthorizedPayment: id => call(`/authorized_payments/${encodeURIComponent(id)}`),
    createPreference: payload => post('/checkout/preferences', payload),
    getPayment: id => call(`/v1/payments/${encodeURIComponent(id)}`),
    // Cancela una suscripción (el cliente deja de ser cobrado). Según la
    // documentación de MP: PUT /preapproval/{id} con status "cancelled".
    cancelPreapproval: id =>
      call(`/preapproval/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) }),
  }
}
