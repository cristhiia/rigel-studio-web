import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildManifest } from '../api/_lib/mercadopago.js'
import { deps } from '../api/_lib/billing.js'
import { memoryStore } from './helpers/memoryStore.js'

import checkout from '../api/billing/checkout.js'
import webhook from '../api/billing/webhook.js'
import status from '../api/billing/status.js'
import download from '../api/billing/download.js'
import adminSummary from '../api/admin/summary.js'

const ENV = {
  MP_ACCESS_TOKEN: 'TEST-token',
  MP_WEBHOOK_SECRET: 'whsec',
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  SITE_URL: 'https://rigelstudio.com.ar',
  ADMIN_EMAILS: 'cris@rigel.com',
}

const USERS = {
  'tok-admin': { email: 'Cris@Rigel.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
  'tok-unverified': { email: 'cris@rigel.com', email_confirmed_at: null },
  'tok-other': { email: 'ana@mail.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
}

let store
let fetchMock
const original = { ...deps }
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

beforeEach(() => {
  Object.assign(process.env, ENV)
  store = memoryStore({ users: USERS })
  deps.createStore = async () => store
  deps.log = log
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  Object.assign(deps, original)
  vi.unstubAllGlobals()
  for (const k of [...Object.keys(ENV), 'KEELWISE_PRICE_ARS']) delete process.env[k]
})

let ipSeq = 0
const ip = () => `10.1.${Math.floor(ipSeq / 250)}.${ipSeq++ % 250}`

function mockRes() {
  const res = { statusCode: 200, body: undefined, headers: {} }
  res.status = code => { res.statusCode = code; return res }
  res.json = body => { res.body = body; return res }
  res.setHeader = (k, v) => { res.headers[k] = v }
  return res
}

const json = (body, code = 200) => ({ ok: code < 400, status: code, json: async () => body })
const post = (body, headers = {}) => ({ method: 'POST', body, query: {}, headers: { 'x-forwarded-for': ip(), ...headers } })
const get = (query, headers = {}) => ({ method: 'GET', query, headers: { 'x-forwarded-for': ip(), ...headers } })

async function call(handler, req) {
  const res = mockRes()
  await handler(req, res)
  return res
}

// Responde según la URL que pide el cliente real de MP.
function routeMp(routes) {
  fetchMock.mockImplementation(async (url, init = {}) => {
    const path = url.replace('https://api.mercadopago.com', '')
    const key = `${init.method || 'GET'} ${path}`
    const fn = routes[key]
    if (!fn) return json({ message: `no mock for ${key}` }, 404)
    return json(await fn(init.body ? JSON.parse(init.body) : undefined))
  })
}

async function subscribe(email = 'ana@mail.com') {
  routeMp({ 'POST /preapproval': () => ({ id: 'pre1', init_point: 'https://mp.example/sub' }) })
  const res = await call(checkout, post({ product: 'keelwise', email }))
  const order = [...store.db.orders.values()].at(-1)
  return { res, order }
}

const preapproval = (orderId, over = {}) => ({
  id: 'pre1',
  status: 'authorized',
  external_reference: orderId,
  date_created: new Date().toISOString(),
  next_payment_date: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  auto_recurring: { free_trial: { frequency: 7, frequency_type: 'days' } },
  ...over,
})

function signedReq({ dataId = 'pre1', type = 'subscription_preapproval', secret = ENV.MP_WEBHOOK_SECRET, eventId = 'evt-1' } = {}) {
  const ts = '1704908010'
  const requestId = `req-${eventId}`
  const v1 = crypto.createHmac('sha256', secret).update(buildManifest({ dataId, requestId, ts })).digest('hex')
  return {
    method: 'POST',
    query: { 'data.id': dataId, type },
    body: { id: eventId, type, data: { id: dataId } },
    headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId },
  }
}

describe('POST /api/billing/checkout', () => {
  it('suscripción: devuelve la URL del preapproval', async () => {
    const { res, order } = await subscribe(' Ana@Mail.com ')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ url: 'https://mp.example/sub' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.mercadopago.com/preapproval')
    expect(init.headers.Authorization).toBe('Bearer TEST-token')
    const payload = JSON.parse(init.body)
    expect(payload).toMatchObject({ payer_email: 'ana@mail.com', external_reference: order.id })
    expect(payload.auto_recurring).toMatchObject({ transaction_amount: 14500, free_trial: { frequency: 7 } })
  })

  it('pago único: devuelve la URL de Checkout Pro', async () => {
    routeMp({ 'POST /checkout/preferences': () => ({ id: 'pref1', init_point: 'https://mp.example/pay' }) })
    const res = await call(checkout, post({ product: 'plantilla-kiosco', email: 'ana@mail.com' }))
    expect(res.body).toEqual({ url: 'https://mp.example/pay' })
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.mercadopago.com/checkout/preferences')
  })

  it('400 email o producto inválido, 404 producto inexistente, sin llamar a MP', async () => {
    expect((await call(checkout, post({ product: 'keelwise', email: 'no-es-email' }))).statusCode).toBe(400)
    expect((await call(checkout, post({ product: 'Mal Slug', email: 'a@b.co' }))).statusCode).toBe(400)
    expect((await call(checkout, post({ product: 'no-existe', email: 'a@b.co' }))).statusCode).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('503 si falta el precio en la base y no hay respaldo; usa KEELWISE_PRICE_ARS si está', async () => {
    store.db.products.get('keelwise').price_ars = null
    expect((await call(checkout, post({ product: 'keelwise', email: 'a@b.co' }))).statusCode).toBe(503)
    process.env.KEELWISE_PRICE_ARS = '15000'
    routeMp({ 'POST /preapproval': body => ({ id: 'pre2', init_point: 'https://mp.example/sub', amount: body.auto_recurring.transaction_amount }) })
    expect((await call(checkout, post({ product: 'keelwise', email: 'a@b.co' }))).statusCode).toBe(200)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).auto_recurring.transaction_amount).toBe(15000)
  })

  it('502 si MP falla, sin filtrar el detalle', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'payer_email invalid' }, 400))
    const res = await call(checkout, post({ product: 'keelwise', email: 'ana@mail.com' }))
    expect(res.statusCode).toBe(502)
    expect(JSON.stringify(res.body)).not.toContain('payer_email')
  })

  it('GET devuelve los datos públicos del producto (sin delivery_ref)', async () => {
    const res = await call(checkout, get({ product: 'keelwise' }))
    expect(res.body).toEqual({ slug: 'keelwise', name: 'Keelwise', billing_type: 'subscription', price_usd: 10, price_ars: 14500, trial_days: 7 })
  })
})

describe('POST /api/billing/webhook', () => {
  it('401 con firma inválida y no consulta MP', async () => {
    const res = await call(webhook, signedReq({ secret: 'otro' }))
    expect(res.statusCode).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('actualiza pedido y permiso; el mismo evento repetido no se procesa dos veces', async () => {
    const { order } = await subscribe()
    fetchMock.mockReset()
    routeMp({ 'GET /preapproval/pre1': () => preapproval(order.id) })
    for (let i = 0; i < 2; i++) expect((await call(webhook, signedReq())).statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(store.db.events.get('evt-1').processed_at).toBeTruthy()
    expect(await store.getEntitlement('ana@mail.com', 'keelwise')).toMatchObject({ status: 'trial', source_order_id: order.id })
    expect(store.db.orders.get(order.id).status).toBe('authorized')
  })

  it('un evento que falló se reintenta (no queda marcado como procesado)', async () => {
    const { order } = await subscribe()
    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce(new Error('timeout'))
    expect((await call(webhook, signedReq())).statusCode).toBe(500)
    routeMp({ 'GET /preapproval/pre1': () => preapproval(order.id) })
    expect((await call(webhook, signedReq())).statusCode).toBe(200)
    expect((await store.getEntitlement('ana@mail.com', 'keelwise')).status).toBe('trial')
  })

  it('estado desconocido: 200 sin escribir permiso', async () => {
    const { order } = await subscribe()
    routeMp({ 'GET /preapproval/pre1': () => preapproval(order.id, { status: 'raro' }) })
    const res = await call(webhook, signedReq())
    expect(res.statusCode).toBe(200)
    expect(store.db.entitlements.size).toBe(0)
    expect(log.warn).toHaveBeenCalled()
  })

  it('pago único aprobado por webhook', async () => {
    routeMp({ 'POST /checkout/preferences': () => ({ id: 'pref1', init_point: 'https://mp.example/pay' }) })
    await call(checkout, post({ product: 'plantilla-kiosco', email: 'ana@mail.com' }))
    const order = [...store.db.orders.values()].at(-1)
    routeMp({ 'GET /v1/payments/555': () => ({ id: 555, status: 'approved', external_reference: order.id, transaction_amount: 43500, currency_id: 'ARS' }) })
    const res = await call(webhook, signedReq({ type: 'payment', dataId: '555', eventId: 'evt-pay' }))
    expect(res.statusCode).toBe(200)
    expect(await store.getEntitlement('ana@mail.com', 'plantilla-kiosco')).toMatchObject({ status: 'active' })
  })
})

describe('GET /api/billing/status y /download', () => {
  it('status sincroniza con MP si el webhook todavía no llegó', async () => {
    const { order } = await subscribe()
    routeMp({ 'GET /preapproval/pre1': () => preapproval(order.id) })
    const byOrder = await call(status, get({ product: 'keelwise', order: order.id }))
    expect(byOrder.body).toEqual({ active: true, status: 'trial' })
    const byPreapproval = await call(status, get({ product: 'keelwise', preapproval_id: 'pre1' }))
    expect(byPreapproval.body).toEqual({ active: true, status: 'trial' })
  })

  it('status false para pending, otro producto o pedido inexistente', async () => {
    const { order } = await subscribe()
    routeMp({ 'GET /preapproval/pre1': () => preapproval(order.id, { status: 'pending' }) })
    expect((await call(status, get({ product: 'keelwise', order: order.id }))).body).toEqual({ active: false, status: null })
    expect((await call(status, get({ product: 'plantilla-kiosco', order: order.id }))).body.active).toBe(false)
    expect((await call(status, get({ product: 'keelwise', order: crypto.randomUUID() }))).body.active).toBe(false)
  })

  it('status rechaza códigos inválidos', async () => {
    expect((await call(status, get({ product: 'keelwise', preapproval_id: '../../x' }))).statusCode).toBe(400)
    expect((await call(status, get({ product: 'keelwise' }))).statusCode).toBe(400)
  })

  it('rate limit por IP', async () => {
    let last
    for (let i = 0; i < 31; i++) last = await call(status, { method: 'GET', query: { product: 'keelwise', order: 'x' }, headers: { 'x-forwarded-for': '9.9.9.9' } })
    expect(last.statusCode).toBe(429)
  })

  it('download: apk firmado por 10 minutos solo con permiso activo', async () => {
    const { order } = await subscribe()
    routeMp({ 'GET /preapproval/pre1': () => preapproval(order.id) })
    const ok = await call(download, get({ product: 'keelwise', order: order.id }))
    expect(ok.body).toEqual({ type: 'apk', url: 'https://signed.example/apks/keelwise.apk?exp=600', expires_in: 600 })
    expect(ok.headers['Cache-Control']).toBe('no-store')

    routeMp({ 'GET /preapproval/pre1': () => preapproval(order.id, { status: 'cancelled' }) })
    await call(webhook, signedReq({ eventId: 'evt-cancel' }))
    const no = await call(download, get({ product: 'keelwise', order: order.id }))
    expect(no.statusCode).toBe(403)
    expect(no.body.url).toBeUndefined()
  })

  it('download web_access devuelve la URL del producto tras el pago', async () => {
    routeMp({ 'POST /checkout/preferences': () => ({ id: 'pref1', init_point: 'https://mp.example/pay' }) })
    await call(checkout, post({ product: 'plantilla-kiosco', email: 'ana@mail.com' }))
    const order = [...store.db.orders.values()].at(-1)
    routeMp({ 'GET /v1/payments/777': () => ({ id: 777, status: 'approved', external_reference: order.id, transaction_amount: 43500, currency_id: 'ARS' }) })
    const res = await call(download, get({ product: 'plantilla-kiosco', external_reference: order.id, payment_id: '777' }))
    expect(res.body).toEqual({ type: 'web_access', url: 'https://kiosco.example/acceso' })
  })
})

describe('GET /api/admin/summary', () => {
  const auth = token => ({ authorization: `Bearer ${token}` })

  it('404 sin token, con token inválido, sin email verificado o fuera de ADMIN_EMAILS', async () => {
    for (const headers of [{}, auth('tok-nope'), auth('tok-unverified'), auth('tok-other')]) {
      const res = await call(adminSummary, get({}, headers))
      expect(res.statusCode).toBe(404)
      expect(res.body).toEqual({ error: 'No encontrado' })
    }
  })

  it('404 si ADMIN_EMAILS no está configurada', async () => {
    delete process.env.ADMIN_EMAILS
    expect((await call(adminSummary, get({}, auth('tok-admin')))).statusCode).toBe(404)
  })

  it('200 con el resumen para un admin, también sin datos', async () => {
    const empty = await call(adminSummary, get({}, auth('tok-admin')))
    expect(empty.statusCode).toBe(200)
    expect(empty.body.totals.active).toBe(0)
    expect(empty.body.recent_orders).toEqual([])

    const { order } = await subscribe()
    routeMp({ 'GET /preapproval/pre1': () => preapproval(order.id) })
    await call(webhook, signedReq({ eventId: 'evt-admin' }))
    const one = await call(adminSummary, get({}, auth('tok-admin')))
    expect(one.body.products.find(p => p.slug === 'keelwise')).toMatchObject({ trial: 1, active: 0, new_this_month: 1 })
    expect(one.body.recent_orders).toHaveLength(1)
    expect(one.headers['Cache-Control']).toBe('no-store')
  })
})
