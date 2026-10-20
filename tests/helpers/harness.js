// Armado común para probar los handlers de /api/billing/* sin red ni base.
import crypto from 'node:crypto'
import { vi } from 'vitest'
import { buildManifest } from '../../api/_lib/mercadopago.js'
import { deps } from '../../api/_lib/billing.js'
import { memoryStore } from './memoryStore.js'

export const ENV = {
  MP_ACCESS_TOKEN: 'TEST-token-SECRETO-mp',
  MP_WEBHOOK_SECRET: 'whsec-SECRETO-webhook',
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-SECRETO-supabase',
  SITE_URL: 'https://rigelstudio.com.ar',
  ADMIN_EMAILS: 'cris@rigel.com',
  CRON_SECRET: 'cron-secret-de-prueba-0123456789',
}
export const SECRETS = [ENV.MP_ACCESS_TOKEN, ENV.MP_WEBHOOK_SECRET, ENV.SUPABASE_SERVICE_ROLE_KEY, ENV.CRON_SECRET]

export const USERS = {
  'tok-admin': { email: 'Cris@Rigel.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
  'tok-unverified': { email: 'cris@rigel.com', email_confirmed_at: null },
  'tok-other': { email: 'ana@mail.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
}

const original = { ...deps }

// Devuelve el estado del test: { store, fetchMock, log } y una función de limpieza.
export function setup(storeOpts = {}) {
  Object.assign(process.env, ENV)
  const store = memoryStore({ users: USERS, ...storeOpts })
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const fetchMock = vi.fn(async () => json({ message: 'sin mock' }, 404))
  deps.createStore = async () => store
  deps.log = log
  vi.stubGlobal('fetch', fetchMock)
  return {
    store,
    log,
    fetchMock,
    cleanup() {
      Object.assign(deps, original)
      vi.unstubAllGlobals()
      for (const k of [...Object.keys(ENV), 'KEELWISE_PRICE_ARS']) delete process.env[k]
    },
  }
}

export const json = (body, code = 200) => ({ ok: code < 400, status: code, json: async () => body })

let ipSeq = 0
export const freshIp = () => `10.2.${Math.floor(ipSeq / 250)}.${ipSeq++ % 250}`

export function mockRes() {
  const res = { statusCode: 200, body: undefined, headers: {} }
  res.status = code => { res.statusCode = code; return res }
  res.json = body => { res.body = body; return res }
  res.setHeader = (k, v) => { res.headers[k] = v }
  return res
}

export async function call(handler, req) {
  const res = mockRes()
  await handler(req, res)
  return res
}

export const post = (body, headers = {}) => ({ method: 'POST', body, query: {}, headers: { 'x-forwarded-for': freshIp(), ...headers } })
export const get = (query, headers = {}) => ({ method: 'GET', query, headers: { 'x-forwarded-for': freshIp(), ...headers } })

export function routeMp(fetchMock, routes) {
  fetchMock.mockImplementation(async (url, init = {}) => {
    const path = url.replace('https://api.mercadopago.com', '')
    const fn = routes[`${init.method || 'GET'} ${path}`]
    if (!fn) return json({ message: `no mock for ${init.method || 'GET'} ${path}` }, 404)
    return json(await fn(init.body ? JSON.parse(init.body) : undefined))
  })
}

export const preapproval = (orderId, over = {}) => ({
  id: 'pre1',
  status: 'authorized',
  external_reference: orderId,
  date_created: new Date().toISOString(),
  next_payment_date: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  auto_recurring: { free_trial: { frequency: 7, frequency_type: 'days' } },
  ...over,
})

export function signedReq({ dataId = 'pre1', type = 'subscription_preapproval', secret = ENV.MP_WEBHOOK_SECRET, eventId = 'evt-1', ts = '1704908010' } = {}) {
  const requestId = `req-${eventId}`
  const v1 = crypto.createHmac('sha256', secret).update(buildManifest({ dataId, requestId, ts })).digest('hex')
  return {
    method: 'POST',
    query: { 'data.id': dataId, type },
    body: { id: eventId, type, data: { id: dataId } },
    headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId },
  }
}
