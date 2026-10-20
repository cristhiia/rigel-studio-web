// Escala y robustez: conciliación diaria, límites de intentos compartidos,
// resumen del panel sin bajar tablas enteras.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { allow, handleReconcile, LIMITS, reconcile, syncPreapproval } from '../api/_lib/billing.js'
import checkout from '../api/billing/checkout.js'
import webhook from '../api/billing/webhook.js'
import status from '../api/billing/status.js'
import reconcileApi from '../api/billing/reconcile.js'
import adminSummary from '../api/admin/summary.js'
import { ENV, call, get, post, preapproval, routeMp, setup, signedReq } from './helpers/harness.js'
import { createMpClient } from '../api/_lib/mercadopago.js'

let t
beforeEach(() => { t = setup() })
afterEach(() => t.cleanup())

const DAY = 86_400_000

// Simula otra instancia de la función (contador en memoria vacío) con la misma base.
async function freshInstance(file) {
  vi.resetModules()
  const lib = await import('../api/_lib/billing.js')
  lib.deps.createStore = async () => t.store
  lib.deps.log = t.log
  return (await import(file)).default
}
const ctx = (extra = {}) => ({ store: t.store, mp: createMpClient({ accessToken: 'x' }), env: process.env, log: t.log, now: new Date(), ...extra })

async function subscribed(email, pre, { validUntil, status: st = 'active', createdAgo = 40 * DAY } = {}) {
  const order = await t.store.createOrder({
    product_slug: 'keelwise', email, billing_type: 'subscription', status: 'authorized', amount_ars: 14500,
    mp_preapproval_id: pre,
  })
  await t.store.upsertEntitlement({
    email, product_slug: 'keelwise', status: st, valid_until: new Date(validUntil).toISOString(),
    source_order_id: order.id, updated_at: new Date(Date.now() - createdAgo).toISOString(),
  })
  return order
}

describe('conciliación diaria (cron)', () => {
  it('un cobro cuyo aviso se perdió: MP dice authorized con nuevo vencimiento → el cliente sigue con acceso', async () => {
    const order = await subscribed('ana@mail.com', 'pre1', { validUntil: Date.now() - DAY })
    expect((await t.store.getEntitlement('ana@mail.com', 'keelwise')).valid_until < new Date().toISOString()).toBe(true)
    routeMp(t.fetchMock, { 'GET /preapproval/pre1': () => preapproval(order.id, { auto_recurring: { frequency: 1 }, date_created: new Date(Date.now() - 40 * DAY).toISOString(), next_payment_date: new Date(Date.now() + 29 * DAY).toISOString() }) })
    const r = await reconcile(ctx())
    expect(r).toMatchObject({ due: 1, checked: 1, changed: 1, failed: 0 })
    const e = await t.store.getEntitlement('ana@mail.com', 'keelwise')
    expect(e.status).toBe('active')
    expect(new Date(e.valid_until).getTime()).toBeGreaterThan(Date.now() + 29 * DAY)
  })

  it('MP dice cancelled (aviso perdido): se corta el acceso', async () => {
    const order = await subscribed('ana@mail.com', 'pre1', { validUntil: Date.now() + 3 * 3_600_000 })
    routeMp(t.fetchMock, { 'GET /preapproval/pre1': () => preapproval(order.id, { status: 'cancelled' }) })
    const r = await reconcile(ctx())
    expect(r.changed).toBe(1)
    expect((await t.store.getEntitlement('ana@mail.com', 'keelwise')).status).toBe('cancelled')
  })

  it('no toca permisos que no están por vencer ni consulta MP por ellos', async () => {
    await subscribed('ana@mail.com', 'pre1', { validUntil: Date.now() + 20 * DAY })
    const r = await reconcile(ctx())
    expect(r).toMatchObject({ due: 0, checked: 0 })
    expect(t.fetchMock).not.toHaveBeenCalled()
  })

  it('si MP falla con una suscripción, sigue con las demás y cuenta el error', async () => {
    const a = await subscribed('a@x.com', 'preA', { validUntil: Date.now() + 1000 })
    const b = await subscribed('b@x.com', 'preB', { validUntil: Date.now() + 2000 })
    t.fetchMock.mockImplementation(async url => {
      if (url.endsWith('/preapproval/preA')) return { ok: false, status: 500, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => preapproval(b.id, { id: 'preB', status: 'cancelled' }) }
    })
    const r = await reconcile(ctx())
    expect(r).toMatchObject({ due: 2, checked: 1, failed: 1 })
    expect((await t.store.getEntitlement('b@x.com', 'keelwise')).status).toBe('cancelled')
    expect(a.id).toBeTruthy()
  })

  it('procesa de a lotes: el resto queda para la próxima corrida', async () => {
    for (let i = 0; i < 5; i++) await subscribed(`u${i}@x.com`, `pre${i}`, { validUntil: Date.now() + (i + 1) * 1000 })
    routeMp(t.fetchMock, Object.fromEntries([0, 1, 2, 3, 4].map(i => [`GET /preapproval/pre${i}`, () => preapproval('x', { id: `pre${i}` })])))
    const r = await reconcile(ctx(), { batch: 3 })
    expect(r.due).toBe(3)
  })

  it('corta por tiempo y reporta lo que quedó sin revisar', async () => {
    for (let i = 0; i < 4; i++) await subscribed(`u${i}@x.com`, `pre${i}`, { validUntil: Date.now() + (i + 1) * 1000 })
    routeMp(t.fetchMock, Object.fromEntries([0, 1, 2, 3].map(i => [`GET /preapproval/pre${i}`, () => preapproval('x', { id: `pre${i}` })])))
    const r = await reconcile(ctx(), { deadlineMs: -1 })
    expect(r).toMatchObject({ due: 4, checked: 0, skipped: 4 })
  })

  it('siempre corre la limpieza, aunque no haya nada para conciliar', async () => {
    const spy = vi.spyOn(t.store, 'maintenance')
    const r = await reconcile(ctx())
    expect(spy).toHaveBeenCalledOnce()
    expect(r.maintenance).toBeDefined()
  })

  it('un evento viejo de otro pedido no pisa al permiso vigente (no se reabre acceso ni se corta de más)', async () => {
    const old = await subscribed('ana@mail.com', 'preOld', { validUntil: Date.now() + 1000 })
    const fresh = await t.store.createOrder({ product_slug: 'keelwise', email: 'ana@mail.com', billing_type: 'subscription', status: 'authorized', amount_ars: 14500, mp_preapproval_id: 'preNew' })
    await t.store.upsertEntitlement({ email: 'ana@mail.com', product_slug: 'keelwise', status: 'active', valid_until: new Date(Date.now() + 25 * DAY).toISOString(), source_order_id: fresh.id, updated_at: new Date().toISOString() })
    await syncPreapproval(preapproval(old.id, { id: 'preOld', status: 'cancelled' }), ctx())
    expect((await t.store.getEntitlement('ana@mail.com', 'keelwise')).status).toBe('active')
  })
})

describe('GET /api/billing/reconcile (autenticación del cron)', () => {
  const auth = token => ({ authorization: `Bearer ${token}` })

  it('sin CRON_SECRET configurada o muy corta no responde nunca', async () => {
    delete process.env.CRON_SECRET
    expect((await call(reconcileApi, get({}, auth('cualquiera')))).statusCode).toBe(404)
    process.env.CRON_SECRET = 'corta'
    expect((await call(reconcileApi, get({}, auth('corta')))).statusCode).toBe(404)
  })

  it('404 con token ausente, incorrecto, parecido o con otro esquema', async () => {
    for (const headers of [{}, auth(''), auth('mal'), auth(`${ENV.CRON_SECRET}x`), auth(ENV.CRON_SECRET.slice(0, -1)), { authorization: ENV.CRON_SECRET }, { authorization: `Basic ${ENV.CRON_SECRET}` }]) {
      const res = await call(reconcileApi, get({}, headers))
      expect(res.statusCode).toBe(404)
      expect(res.body).toEqual({ error: 'No encontrado' })
    }
    expect(t.fetchMock).not.toHaveBeenCalled()
  })

  it('solo acepta GET', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      expect((await call(reconcileApi, { method, query: {}, headers: auth(ENV.CRON_SECRET) })).statusCode).toBe(404)
    }
  })

  it('200 con el token correcto y devuelve el conteo', async () => {
    const res = await call(reconcileApi, get({}, auth(ENV.CRON_SECRET)))
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ ok: true, due: 0 })
  })

  it('error interno: 500 sin detalles', async () => {
    t.store.dueOrders = async () => { throw new Error(`falló ${ENV.SUPABASE_SERVICE_ROLE_KEY}`) }
    const res = await call(reconcileApi, get({}, auth(ENV.CRON_SECRET)))
    expect(res.statusCode).toBe(500)
    expect(JSON.stringify(res.body)).not.toContain('SECRETO')
  })

  it('handleReconcile también corta si falta MP o Supabase', async () => {
    delete process.env.MP_ACCESS_TOKEN
    expect((await call(handleReconcile, get({}, auth(ENV.CRON_SECRET)))).statusCode).toBe(500)
  })
})

describe('límites de intentos compartidos', () => {
  it('por email: el sexto intento en una hora se corta, sin llamar a MP', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: `pre${Math.random()}`, init_point: 'https://mp.example/sub' }) })
    const codes = []
    for (let i = 0; i < 7; i++) codes.push((await call(checkout, post({ product: 'keelwise', email: 'ana@mail.com' }))).statusCode)
    expect(codes).toEqual([200, 200, 200, 200, 200, 429, 429])
    expect(t.fetchMock).toHaveBeenCalledTimes(5)
    expect(t.store.db.orders.size).toBe(5)
  })

  it('el límite por email no depende de mayúsculas ni espacios, y es por producto', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'p', init_point: 'u' }), 'POST /checkout/preferences': () => ({ id: 'p', init_point: 'u' }) })
    for (const e of ['ana@mail.com', ' ANA@mail.com', 'Ana@Mail.com', 'ana@mail.com ', 'ana@MAIL.com']) await call(checkout, post({ product: 'keelwise', email: e }))
    expect((await call(checkout, post({ product: 'keelwise', email: 'ANA@mail.com' }))).statusCode).toBe(429)
    expect((await call(checkout, post({ product: 'plantilla-kiosco', email: 'ana@mail.com' }))).statusCode).toBe(200)
  })

  it('por IP compartido entre instancias: aunque se cambie el email, se corta', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'p', init_point: 'u' }) })
    const ipFija = { 'x-forwarded-for': '203.0.113.9' }
    let last
    for (let i = 0; i <= LIMITS.checkoutIp.limit; i++) {
      const fresh = await freshInstance('../api/billing/checkout.js')
      last = await call(fresh, post({ product: 'keelwise', email: `u${i}@mail.com` }, ipFija))
      if (last.statusCode === 429) break
    }
    expect(last.statusCode).toBe(429)
  })

  it('status también se limita por IP en la base', async () => {
    const ipFija = { 'x-forwarded-for': '203.0.113.10' }
    let last
    for (let i = 0; i <= LIMITS.statusIp.limit; i++) {
      const fresh = await freshInstance('../api/billing/status.js')
      last = await call(fresh, get({ product: 'keelwise', order: '5f1d3a56-3b6e-4bd0-9f8a-0d0b6a1c2e11' }, ipFija))
      if (last.statusCode === 429) break
    }
    expect(last.statusCode).toBe(429)
  })

  it('si la base de límites falla, se deja pasar (no se corta una venta) y se avisa en el log', async () => {
    t.store.rateHit = async () => { throw new Error('db caída') }
    expect(await allow(t.store, 'k', 1, 60, t.log)).toBe(true)
    expect(t.log.warn).toHaveBeenCalled()
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'p', init_point: 'https://mp.example/sub' }) })
    expect((await call(checkout, post({ product: 'keelwise', email: 'ana@mail.com' }))).statusCode).toBe(200)
  })

  it('las claves guardadas no contienen IP ni email en claro', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'p', init_point: 'u' }) })
    await call(checkout, post({ product: 'keelwise', email: 'ana@mail.com' }, { 'x-forwarded-for': '198.51.100.7' }))
    const keys = [...t.store.db.rates.keys()].join(' ')
    expect(keys).not.toContain('ana@mail.com')
    expect(keys).not.toContain('198.51.100.7')
    expect(keys).toMatch(/co:ip:[0-9a-f]{32}/)
  })
})

describe('resumen del panel', () => {
  it('no pide tablas enteras: usa una sola consulta agregada en la base', async () => {
    const spy = vi.spyOn(t.store, 'adminSummary')
    for (const forbidden of ['listOrders', 'listEntitlements']) expect(t.store[forbidden]).toBeUndefined()
    const res = await call(adminSummary, get({}, { authorization: 'Bearer tok-admin' }))
    expect(res.statusCode).toBe(200)
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toBeInstanceOf(Date)
  })

  it('un permiso activo que ya venció se cuenta como vencido, no como activo', async () => {
    await subscribed('viejo@x.com', 'preV', { validUntil: Date.now() - 2 * DAY })
    await subscribed('vivo@x.com', 'preW', { validUntil: Date.now() + 10 * DAY })
    const res = await call(adminSummary, get({}, { authorization: 'Bearer tok-admin' }))
    expect(res.body.products.find(p => p.slug === 'keelwise')).toMatchObject({ active: 1, cancelled: 1, mrr_ars: 14500 })
  })
})

describe('webhook: reintentos y duplicados a escala', () => {
  it('el mismo aviso 20 veces seguidas procesa una sola vez', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'pre1', init_point: 'u' }) })
    await call(checkout, post({ product: 'keelwise', email: 'ana@mail.com' }))
    const order = [...t.store.db.orders.values()][0]
    routeMp(t.fetchMock, { 'GET /preapproval/pre1': () => preapproval(order.id) })
    const writes = vi.spyOn(t.store, 'upsertEntitlement')
    for (let i = 0; i < 20; i++) expect((await call(webhook, signedReq({ eventId: 'evt-dup' }))).statusCode).toBe(200)
    expect(writes).toHaveBeenCalledTimes(1)
  })

  it('50 avisos de clientes distintos en paralelo quedan todos bien', async () => {
    const orders = []
    for (let i = 0; i < 50; i++) {
      orders.push(await t.store.createOrder({ product_slug: 'keelwise', email: `u${i}@x.com`, billing_type: 'subscription', status: 'pending', amount_ars: 14500, mp_preapproval_id: `pre${i}` }))
    }
    routeMp(t.fetchMock, Object.fromEntries(orders.map((o, i) => [`GET /preapproval/pre${i}`, () => preapproval(o.id, { id: `pre${i}` })])))
    const results = await Promise.all(orders.map((o, i) => call(webhook, signedReq({ dataId: `pre${i}`, eventId: `evt-${i}` }))))
    expect(results.every(r => r.statusCode === 200)).toBe(true)
    expect(t.store.db.entitlements.size).toBe(50)
  })

  it('si MP o la base fallan el webhook devuelve 500 para que MP reintente, y el reintento funciona', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'pre1', init_point: 'u' }) })
    await call(checkout, post({ product: 'keelwise', email: 'ana@mail.com' }))
    const order = [...t.store.db.orders.values()][0]
    t.fetchMock.mockImplementationOnce(async () => ({ ok: false, status: 503, json: async () => ({}) }))
    expect((await call(webhook, signedReq({ eventId: 'evt-r' }))).statusCode).toBe(500)
    routeMp(t.fetchMock, { 'GET /preapproval/pre1': () => preapproval(order.id) })
    expect((await call(webhook, signedReq({ eventId: 'evt-r' }))).statusCode).toBe(200)
    expect((await t.store.getEntitlement('ana@mail.com', 'keelwise')).status).toBe('trial')
    expect(status).toBeDefined()
  })
})
