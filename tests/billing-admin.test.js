// Panel de gestión: listado, accesos manuales, baja, precio e historial.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decideEntitlement } from '../api/_lib/billing.js'
import { call, freshIp, get, routeMp, setup, SECRETS } from './helpers/harness.js'
import subscribers from '../api/admin/subscribers.js'
import manage from '../api/admin/manage.js'

const AUTH = { authorization: 'Bearer tok-admin' }
const act = (body, headers = AUTH) => ({ method: 'POST', body, query: {}, headers: { 'x-forwarded-for': freshIp(), ...headers } })
const list = (query = {}, headers = AUTH) => get(query, headers)

let t
beforeEach(() => { t = setup() })
afterEach(() => t.cleanup())

const seed = async (email, over = {}) =>
  t.store.upsertEntitlement({
    email, product_slug: 'keelwise', status: 'active',
    valid_until: new Date(Date.now() + 20 * 86_400_000).toISOString(),
    source_order_id: null, source: 'mp', note: null,
    updated_at: new Date().toISOString(), ...over,
  })

describe('autenticación de los endpoints nuevos', () => {
  const bads = [
    {}, { authorization: 'Bearer nope' }, { authorization: 'Bearer tok-other' },
    { authorization: 'Bearer tok-unverified' }, { cookie: 'x=tok-admin' },
  ]
  it('404 uniforme sin sesión de administrador, para leer y para escribir', async () => {
    for (const h of bads) {
      expect((await call(subscribers, list({}, h))).statusCode).toBe(404)
      expect((await call(manage, act({ action: 'grant', product: 'keelwise', email: 'a@b.com', days: 5 }, h))).statusCode).toBe(404)
      expect((await call(manage, get({}, h))).statusCode).toBe(404)
    }
    expect(t.store.db.entitlements.size).toBe(0)
  })
  it('métodos incorrectos dan 404', async () => {
    expect((await call(subscribers, { method: 'POST', query: {}, body: {}, headers: { ...AUTH, 'x-forwarded-for': freshIp() } })).statusCode).toBe(404)
    expect((await call(manage, { method: 'DELETE', query: {}, headers: { ...AUTH, 'x-forwarded-for': freshIp() } })).statusCode).toBe(404)
  })
  it('sin ADMIN_EMAILS configurado nadie entra', async () => {
    delete process.env.ADMIN_EMAILS
    expect((await call(subscribers, list())).statusCode).toBe(404)
  })
})

describe('listado de suscriptores', () => {
  it('lista, filtra por estado, busca por email y pagina', async () => {
    await seed('ana@mail.com')
    await seed('bea@mail.com', { status: 'trial', valid_until: new Date(Date.now() + 3 * 86_400_000).toISOString() })
    await seed('caro@mail.com', { status: 'cancelled', valid_until: new Date(Date.now() - 86_400_000).toISOString() })
    const all = await call(subscribers, list())
    expect(all.statusCode).toBe(200)
    expect(all.body.total).toBe(3)
    const byStatus = await call(subscribers, list({ status: 'trial' }))
    expect(byStatus.body.rows.map(r => r.email)).toEqual(['bea@mail.com'])
    const expiring = await call(subscribers, list({ status: 'expiring' }))
    expect(expiring.body.rows.map(r => r.email)).toEqual(['bea@mail.com'])
    const found = await call(subscribers, list({ q: 'AN' }))
    expect(found.body.rows.map(r => r.email)).toEqual(['ana@mail.com'])
    const page = await call(subscribers, list({ limit: '1', offset: '1' }))
    expect(page.body.rows).toHaveLength(1)
    expect(page.body.total).toBe(3)
  })
  it('rechaza parámetros inválidos', async () => {
    for (const q of [{ status: 'x' }, { product: 'Mal Slug' }, { limit: '0' }, { limit: '101' }, { offset: '-1' }, { limit: 'abc' }, { q: 'a'.repeat(101) }]) {
      expect((await call(subscribers, list(q))).statusCode, JSON.stringify(q)).toBe(400)
    }
  })
  it('un parámetro con forma rara no rompe nada', async () => {
    const res = await call(subscribers, list({ q: ['a', 'b'], status: { $ne: 1 }, product: ['x'] }))
    expect(res.statusCode).toBe(200)
  })
  it('no devuelve secretos ni datos de Mercado Pago', async () => {
    await seed('ana@mail.com')
    const res = await call(subscribers, list())
    const text = JSON.stringify(res.body)
    for (const s of SECRETS) expect(text).not.toContain(s)
    expect(text).not.toContain('preapproval')
  })
})

describe('dar acceso manual', () => {
  it('crea un permiso activo por N días con nota, y queda en el historial', async () => {
    const res = await call(manage, act({ action: 'grant', product: 'keelwise', email: ' Tester@Mail.COM ', days: 30, note: 'beta tester' }))
    expect(res.statusCode).toBe(200)
    const ent = await t.store.getEntitlement('tester@mail.com', 'keelwise')
    expect(ent).toMatchObject({ status: 'active', source: 'manual', note: 'beta tester', source_order_id: null })
    const days = (new Date(ent.valid_until) - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(29.9)
    expect(days).toBeLessThan(30.1)
    const log = await call(manage, get({}, AUTH))
    expect(log.body.log[0]).toMatchObject({ action: 'grant', target_email: 'tester@mail.com', admin_email: 'cris@rigel.com' })
  })
  it('valida email, producto, días, nota y tipos', async () => {
    const base = { action: 'grant', product: 'keelwise', email: 'a@b.com', days: 5 }
    const cases = [
      { ...base, email: 'sin-arroba' }, { ...base, email: ['a@b.com'] }, { ...base, email: undefined },
      { ...base, product: 'no-existe' }, { ...base, product: 'MAL SLUG' }, { ...base, product: { a: 1 } },
      { ...base, days: 0 }, { ...base, days: 3651 }, { ...base, days: 1.5 }, { ...base, days: 'x' }, { ...base, days: null }, { ...base, days: undefined },
      { ...base, note: 'x'.repeat(201) }, { ...base, note: { a: 1 } },
      { ...base, forever: true }, // suscripción sin vencimiento exige confirmación
    ]
    for (const body of cases) {
      const res = await call(manage, act(body))
      expect(res.statusCode, JSON.stringify(body)).toBe(400)
    }
    expect(t.store.db.entitlements.size).toBe(0)
  })
  it('sin vencimiento solo si se confirma', async () => {
    const res = await call(manage, act({ action: 'grant', product: 'keelwise', email: 'a@b.com', forever: true, confirmForever: true }))
    expect(res.statusCode).toBe(200)
    expect((await t.store.getEntitlement('a@b.com', 'keelwise')).valid_until).toBeNull()
  })
  it('acción desconocida o body que no es objeto: 400', async () => {
    for (const body of [null, 'texto', [], 5, {}, { action: 'drop' }, { action: '__proto__' }, { action: 'constructor' }, { action: ['grant'] }]) {
      expect((await call(manage, act(body))).statusCode, JSON.stringify(body)).toBe(400)
    }
  })
  it('la nota sale sin caracteres de control', async () => {
    await call(manage, act({ action: 'grant', product: 'keelwise', email: 'a@b.com', days: 3, note: 'hola\r\n\tmundo\u0000' }))
    expect((await t.store.getEntitlement('a@b.com', 'keelwise')).note).toBe('hola mundo')
  })
})

describe('un permiso manual no se pisa con avisos viejos de Mercado Pago', () => {
  const next = status => ({ email: 'a@b.com', product_slug: 'keelwise', status, source: 'mp', source_order_id: 'o1', valid_until: null })
  const manual = over => ({ email: 'a@b.com', product_slug: 'keelwise', status: 'active', source: 'manual', valid_until: new Date(Date.now() + 86_400_000).toISOString(), ...over })
  it('un aviso "cancelado" no le quita el acceso al tester', () => {
    expect(decideEntitlement(manual(), next('cancelled'))).toBeNull()
    expect(decideEntitlement(manual(), next('past_due'))).toBeNull()
  })
  it('un aviso que da acceso sí lo reemplaza (pasó a pagar con MP)', () => {
    expect(decideEntitlement(manual(), next('active'))).toMatchObject({ source: 'mp' })
  })
  it('si el permiso manual ya venció o se revocó, MP vuelve a mandar', () => {
    expect(decideEntitlement(manual({ valid_until: new Date(Date.now() - 1000).toISOString() }), next('cancelled'))).not.toBeNull()
    expect(decideEntitlement(manual({ status: 'cancelled' }), next('active'))).not.toBeNull()
  })
})

describe('quitar acceso', () => {
  it('cancela el permiso ahora y avisa si hay una suscripción de MP viva', async () => {
    const order = await t.store.createOrder({ product_slug: 'keelwise', email: 'a@b.com', billing_type: 'subscription', status: 'authorized', amount_ars: 15500, mp_preapproval_id: 'pre1' })
    await seed('a@b.com', { source_order_id: order.id })
    const res = await call(manage, act({ action: 'revoke', product: 'keelwise', email: 'a@b.com' }))
    expect(res.statusCode).toBe(200)
    expect(res.body.warning).toMatch(/Mercado Pago/)
    expect((await t.store.getEntitlement('a@b.com', 'keelwise')).status).toBe('cancelled')
    expect(t.fetchMock).not.toHaveBeenCalled()
  })
  it('con cancelMp también cancela la suscripción en Mercado Pago', async () => {
    const order = await t.store.createOrder({ product_slug: 'keelwise', email: 'a@b.com', billing_type: 'subscription', status: 'authorized', amount_ars: 15500, mp_preapproval_id: 'pre1' })
    await seed('a@b.com', { source_order_id: order.id })
    const seen = []
    routeMp(t.fetchMock, { 'PUT /preapproval/pre1': body => { seen.push(body); return { id: 'pre1', status: 'cancelled' } } })
    const res = await call(manage, act({ action: 'revoke', product: 'keelwise', email: 'a@b.com', cancelMp: true }))
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ mp_cancelled: true, warning: null })
    expect(seen).toEqual([{ status: 'cancelled' }])
    expect(t.store.db.orders.get(order.id).status).toBe('cancelled')
  })
  it('si MP falla no se cambia nada', async () => {
    const order = await t.store.createOrder({ product_slug: 'keelwise', email: 'a@b.com', billing_type: 'subscription', status: 'authorized', amount_ars: 15500, mp_preapproval_id: 'pre1' })
    await seed('a@b.com', { source_order_id: order.id })
    const res = await call(manage, act({ action: 'revoke', product: 'keelwise', email: 'a@b.com', cancelMp: true }))
    expect(res.statusCode).toBe(502)
    expect((await t.store.getEntitlement('a@b.com', 'keelwise')).status).toBe('active')
  })
  it('un email sin permiso da 404 y no crea filas', async () => {
    const res = await call(manage, act({ action: 'revoke', product: 'keelwise', email: 'nadie@b.com' }))
    expect(res.statusCode).toBe(404)
    expect(t.store.db.entitlements.size).toBe(0)
  })
})

describe('precio según el dólar', () => {
  it('sin apply solo calcula; con apply guarda y registra', async () => {
    const preview = await call(manage, act({ action: 'price', product: 'keelwise', usd_rate: 1550 }))
    expect(preview.body).toMatchObject({ applied: false, plan: { next: 15500, current: 14500, changed: true } })
    expect((await t.store.getProduct('keelwise')).price_ars).toBe(14500)
    const applied = await call(manage, act({ action: 'price', product: 'keelwise', usd_rate: '1555', round: 50, apply: true }))
    expect(applied.body.applied).toBe(true)
    expect((await t.store.getProduct('keelwise')).price_ars).toBe(15550)
    const log = await call(manage, get({}, AUTH))
    expect(log.body.log[0]).toMatchObject({ action: 'price', product_slug: 'keelwise' })
  })
  it('rechaza cotizaciones y redondeos inválidos, y nada cambia', async () => {
    for (const body of [
      { usd_rate: 0 }, { usd_rate: -5 }, { usd_rate: 'abc' }, { usd_rate: NaN }, { usd_rate: Infinity }, { usd_rate: 2_000_000 },
      { usd_rate: null }, { usd_rate: {} }, { usd_rate: [1500] }, { usd_rate: 1500, round: 7 }, { usd_rate: 1500, round: 0 },
    ]) {
      const res = await call(manage, act({ action: 'price', product: 'keelwise', apply: true, ...body }))
      expect(res.statusCode, JSON.stringify(body)).toBe(400)
    }
    expect((await t.store.getProduct('keelwise')).price_ars).toBe(14500)
  })
  it('un producto sin price_usd no se puede recalcular', async () => {
    t.store.db.products.get('keelwise').price_usd = null
    expect((await call(manage, act({ action: 'price', product: 'keelwise', usd_rate: 1500 }))).statusCode).toBe(400)
  })
})

describe('GET manage: precios e historial', () => {
  it('devuelve precios vigentes y el historial, sin campos internos', async () => {
    const res = await call(manage, get({}, AUTH))
    expect(res.statusCode).toBe(200)
    const k = res.body.products.find(p => p.slug === 'keelwise')
    expect(k).toEqual({ slug: 'keelwise', name: 'Keelwise', billing_type: 'subscription', active: true, price_usd: 10, price_ars: 14500 })
    expect(Object.keys(k)).not.toContain('delivery_ref')
    expect(res.body.log).toEqual([])
  })
})
