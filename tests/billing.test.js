import crypto from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { buildManifest, verifySignature } from '../api/_lib/mercadopago.js'
import { createRateLimiter } from '../api/_lib/http.js'
import {
  buildPreapprovalPayload,
  buildPreferencePayload,
  composeSummary,
  checkout,
  decideEntitlement,
  fallbackPriceEnvName,
  isAdminUser,
  isEntitlementActive,
  isValidEmail,
  mapPaymentStatus,
  mapSubscriptionStatus,
  monthStartArgentina,
  normalizeEmail,
  parseAdminEmails,
  parsePriceArs,
  planPriceChange,
  processNotification,
  resolvePriceArs,
} from '../api/_lib/billing.js'
import { KEELWISE, PLANTILLA, memoryStore } from './helpers/memoryStore.js'

const SECRET = 'test-secret'
const NOW = new Date('2026-10-20T15:00:00.000Z')
const silent = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

function sign({ dataId, requestId, ts }) {
  const v1 = crypto.createHmac('sha256', SECRET).update(buildManifest({ dataId, requestId, ts })).digest('hex')
  return `ts=${ts},v1=${v1}`
}

describe('verifySignature', () => {
  const base = { requestId: 'req-123', dataId: 'abc123', ts: '1704908010' }

  it('acepta una firma válida', () => {
    expect(verifySignature({ ...base, signatureHeader: sign(base), secret: SECRET })).toBe(true)
  })

  it('normaliza data.id alfanumérico a minúsculas como MP', () => {
    expect(verifySignature({ ...base, dataId: 'ABC123', signatureHeader: sign(base), secret: SECRET })).toBe(true)
  })

  it('rechaza si cambia el data.id o el secreto', () => {
    expect(verifySignature({ ...base, dataId: 'otro', signatureHeader: sign(base), secret: SECRET })).toBe(false)
    expect(verifySignature({ ...base, signatureHeader: sign(base), secret: 'otro' })).toBe(false)
  })

  it('rechaza header ausente, mal formado o sin secreto configurado', () => {
    expect(verifySignature({ ...base, signatureHeader: undefined, secret: SECRET })).toBe(false)
    expect(verifySignature({ ...base, signatureHeader: 'ts=1,v1=zz', secret: SECRET })).toBe(false)
    expect(verifySignature({ ...base, signatureHeader: sign(base), secret: '' })).toBe(false)
  })

  it('arma el manifest omitiendo partes ausentes', () => {
    expect(buildManifest({ dataId: 'X1', requestId: 'r', ts: '9' })).toBe('id:x1;request-id:r;ts:9;')
    expect(buildManifest({ dataId: '', requestId: undefined, ts: '9' })).toBe('ts:9;')
  })
})

describe('mapeo de estados', () => {
  it('suscripción: authorized/pending/paused/cancelled', () => {
    expect(mapSubscriptionStatus('authorized')).toEqual({ order: 'authorized', entitlement: 'active' })
    expect(mapSubscriptionStatus('authorized', { inTrial: true })).toEqual({ order: 'authorized', entitlement: 'trial' })
    expect(mapSubscriptionStatus('authorized', { paymentRejected: true })).toEqual({ order: 'authorized', entitlement: 'past_due' })
    expect(mapSubscriptionStatus('pending')).toEqual({ order: 'pending', entitlement: null })
    expect(mapSubscriptionStatus('paused')).toEqual({ order: 'paused', entitlement: 'past_due' })
    expect(mapSubscriptionStatus('cancelled')).toEqual({ order: 'cancelled', entitlement: 'cancelled' })
  })

  it('pago único: approved/rejected/refunded', () => {
    expect(mapPaymentStatus('approved')).toEqual({ order: 'approved', entitlement: 'active' })
    expect(mapPaymentStatus('rejected')).toEqual({ order: 'rejected', entitlement: null })
    expect(mapPaymentStatus('refunded')).toEqual({ order: 'refunded', entitlement: 'cancelled' })
    expect(mapPaymentStatus('charged_back')).toEqual({ order: 'refunded', entitlement: 'cancelled' })
    expect(mapPaymentStatus('in_process')).toEqual({ order: 'pending', entitlement: null })
  })

  it('estado desconocido devuelve null', () => {
    expect(mapSubscriptionStatus('finished')).toBeNull()
    expect(mapPaymentStatus('in_mediation_raro')).toBeNull()
    expect(mapPaymentStatus(undefined)).toBeNull()
  })

  it('permiso activo solo en trial/active y sin vencer', () => {
    expect(isEntitlementActive({ status: 'active', valid_until: null }, NOW)).toBe(true)
    expect(isEntitlementActive({ status: 'trial', valid_until: '2026-10-25T00:00:00Z' }, NOW)).toBe(true)
    expect(isEntitlementActive({ status: 'active', valid_until: '2026-10-01T00:00:00Z' }, NOW)).toBe(false)
    for (const s of ['past_due', 'cancelled', 'expired']) expect(isEntitlementActive({ status: s }, NOW)).toBe(false)
    expect(isEntitlementActive(null, NOW)).toBe(false)
  })

  it('un evento de otro pedido no baja un permiso activo', () => {
    const existing = { status: 'active', source_order_id: 'nuevo' }
    expect(decideEntitlement(existing, { status: 'cancelled', source_order_id: 'viejo' })).toBeNull()
    expect(decideEntitlement(existing, { status: 'active', source_order_id: 'viejo' })).toMatchObject({ source_order_id: 'viejo' })
    expect(decideEntitlement(existing, { status: 'cancelled', source_order_id: 'nuevo' })).toMatchObject({ status: 'cancelled' })
    expect(decideEntitlement(null, { status: 'trial', source_order_id: 'x' })).toMatchObject({ status: 'trial' })
  })
})

describe('email', () => {
  it('acepta emails comunes y normaliza', () => {
    expect(isValidEmail('  Ana.Perez@Gmail.com ')).toBe(true)
    expect(normalizeEmail('  Ana.Perez@Gmail.com ')).toBe('ana.perez@gmail.com')
  })

  it('rechaza formatos inválidos', () => {
    const malos = [
      '', 'ana', 'ana@', '@gmail.com', 'ana@gmail', 'ana @gmail.com', null, 42, undefined, {}, ['a@b.com'],
      'a<b>@x.com', 'a"b@x.com', "a';drop table x;--@x.com", 'a\u0000@x.com', 'a\n@x.com', 'a@x.com\nBcc: z@z.com',
      'a..b@x.com', '.a@x.com', 'a.@x.com', 'a@x..com', 'a@-x.com', 'a@x-.com', 'a@x.c', 'a@@x.com', 'a@b@x.com',
      'ñ@x.com', 'a@x.com,b@x.com', `${'a'.repeat(65)}@x.com`,
    ]
    for (const bad of malos) expect(isValidEmail(bad), JSON.stringify(bad)).toBe(false)
    expect(isValidEmail(`${'a'.repeat(250)}@x.com`)).toBe(false)
  })
})

describe('precio', () => {
  it('billing_products.price_ars es la fuente de verdad; la variable es respaldo', () => {
    expect(resolvePriceArs({ slug: 'keelwise', price_ars: 14500 }, { KEELWISE_PRICE_ARS: '99' })).toBe(14500)
    expect(resolvePriceArs({ slug: 'keelwise', price_ars: null }, { KEELWISE_PRICE_ARS: '15000' })).toBe(15000)
    expect(resolvePriceArs({ slug: 'keelwise', price_ars: null }, {})).toBeNull()
    expect(fallbackPriceEnvName('gestor-pacientes')).toBe('GESTOR_PACIENTES_PRICE_ARS')
  })

  it('parsePriceArs ignora valores no numéricos o no positivos', () => {
    expect(parsePriceArs('15000')).toBe(15000)
    expect(parsePriceArs('14500.00')).toBe(14500)
    for (const bad of [undefined, null, '', 'abc', '0', -3]) expect(parsePriceArs(bad)).toBeNull()
  })

  it('planPriceChange recalcula y redondea', () => {
    expect(planPriceChange(KEELWISE, { usdRate: 1450 })).toMatchObject({ current: 14500, next: 14500, changed: false })
    expect(planPriceChange(KEELWISE, { usdRate: 1487 })).toMatchObject({ current: 14500, next: 14870, changed: true })
    expect(planPriceChange(KEELWISE, { usdRate: 1487, round: 100 })).toMatchObject({ next: 14900 })
    expect(() => planPriceChange(KEELWISE, { usdRate: 'x' })).toThrow()
    expect(() => planPriceChange({ ...KEELWISE, price_usd: null }, { usdRate: 1450 })).toThrow()
  })
})

describe('payloads de Mercado Pago', () => {
  const order = { id: '7b0c2a9e-6a8e-4f3e-9c35-1f2d3c4b5a69', email: 'ana@mail.com' }

  it('suscripción: reason del producto, external_reference = pedido, prueba y back_url', () => {
    const p = buildPreapprovalPayload({ product: KEELWISE, order, priceArs: 14500, siteUrl: 'https://rigelstudio.com.ar/', trialDays: 7 })
    expect(p.reason).toBe('Keelwise — suscripción mensual')
    expect(p.external_reference).toBe(order.id)
    expect(p.payer_email).toBe('ana@mail.com')
    expect(p.back_url).toBe('https://rigelstudio.com.ar/keelwise/gracias')
    expect(p.auto_recurring).toEqual({
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 14500,
      currency_id: 'ARS',
      free_trial: { frequency: 7, frequency_type: 'days' },
    })
  })

  it('suscripción sin prueba no manda free_trial', () => {
    const p = buildPreapprovalPayload({ product: KEELWISE, order, priceArs: 14500, siteUrl: 'https://x.com', trialDays: 0 })
    expect(p.auto_recurring.free_trial).toBeUndefined()
  })

  it('pago único: preferencia con un ítem en pesos y back_urls', () => {
    const p = buildPreferencePayload({ product: PLANTILLA, order, priceArs: 43500, siteUrl: 'https://x.com' })
    expect(p.items).toEqual([{ id: 'plantilla-kiosco', title: 'Plantilla KioscoPro', quantity: 1, unit_price: 43500, currency_id: 'ARS' }])
    expect(p.external_reference).toBe(order.id)
    expect(p.back_urls.success).toBe('https://x.com/plantilla-kiosco/gracias')
    expect(p.auto_return).toBe('approved')
  })
})

// ── Checkout y webhook con store en memoria ──────────────────────────────
function mpMock(over = {}) {
  return {
    createPreapproval: vi.fn(async payload => ({ id: 'pre1', init_point: 'https://mp.example/sub', ...payload })),
    createPreference: vi.fn(async () => ({ id: 'pref1', init_point: 'https://mp.example/pay' })),
    getPreapproval: vi.fn(),
    getAuthorizedPayment: vi.fn(),
    getPayment: vi.fn(),
    ...over,
  }
}

function ctxFor(store, mp, now = NOW) {
  return { store, mp, env: { SITE_URL: 'https://rigelstudio.com.ar' }, now, log: silent }
}

describe('checkout', () => {
  it('suscripción: crea pedido + preapproval con prueba gratis', async () => {
    const store = memoryStore()
    const mp = mpMock()
    const r = await checkout({ product: 'keelwise', email: ' Ana@Mail.com ' }, ctxFor(store, mp))
    expect(r.url).toBe('https://mp.example/sub')
    const payload = mp.createPreapproval.mock.calls[0][0]
    expect(payload.auto_recurring.free_trial).toEqual({ frequency: 7, frequency_type: 'days' })
    const order = store.db.orders.get(r.order_id)
    expect(order).toMatchObject({ email: 'ana@mail.com', status: 'pending', mp_preapproval_id: 'pre1', amount_ars: 14500, billing_type: 'subscription' })
    expect(payload.external_reference).toBe(order.id)
  })

  it('suscripción: quien ya tuvo acceso no repite la prueba', async () => {
    const store = memoryStore()
    await store.upsertEntitlement({ email: 'ana@mail.com', product_slug: 'keelwise', status: 'cancelled', updated_at: NOW.toISOString() })
    const mp = mpMock()
    await checkout({ product: 'keelwise', email: 'ana@mail.com' }, ctxFor(store, mp))
    expect(mp.createPreapproval.mock.calls[0][0].auto_recurring.free_trial).toBeUndefined()
  })

  it('pago único: crea una preferencia de Checkout Pro', async () => {
    const store = memoryStore()
    const mp = mpMock()
    const r = await checkout({ product: 'plantilla-kiosco', email: 'ana@mail.com' }, ctxFor(store, mp))
    expect(r.url).toBe('https://mp.example/pay')
    expect(mp.createPreapproval).not.toHaveBeenCalled()
    expect(store.db.orders.get(r.order_id)).toMatchObject({ billing_type: 'one_time', status: 'pending', amount_ars: 43500 })
  })

  it('rechaza producto inexistente o inactivo, y email inválido, sin llamar a MP', async () => {
    const store = memoryStore({ products: [{ ...KEELWISE, active: false }] })
    const mp = mpMock()
    await expect(checkout({ product: 'keelwise', email: 'ana@mail.com' }, ctxFor(store, mp))).rejects.toMatchObject({ status: 404 })
    await expect(checkout({ product: 'no-existe', email: 'ana@mail.com' }, ctxFor(store, mp))).rejects.toMatchObject({ status: 404 })
    await expect(checkout({ product: 'keelwise', email: 'nope' }, ctxFor(store, mp))).rejects.toMatchObject({ status: 400 })
    await expect(checkout({ product: '../x', email: 'ana@mail.com' }, ctxFor(store, mp))).rejects.toMatchObject({ status: 400 })
    expect(mp.createPreapproval).not.toHaveBeenCalled()
    expect(store.db.orders.size).toBe(0)
  })

  it('503 sin precio; si MP falla el pedido queda failed', async () => {
    const noPrice = memoryStore({ products: [{ ...KEELWISE, price_ars: null }] })
    await expect(checkout({ product: 'keelwise', email: 'a@b.co' }, ctxFor(noPrice, mpMock()))).rejects.toMatchObject({ status: 503 })

    const store = memoryStore()
    const mp = mpMock({ createPreapproval: vi.fn(async () => { throw Object.assign(new Error('MP 400'), { status: 400 }) }) })
    await expect(checkout({ product: 'keelwise', email: 'a@b.co' }, ctxFor(store, mp))).rejects.toMatchObject({ status: 502 })
    expect([...store.db.orders.values()][0].status).toBe('failed')
  })
})

async function subscribedStore() {
  const store = memoryStore()
  const mp = mpMock()
  const { order_id } = await checkout({ product: 'keelwise', email: 'ana@mail.com' }, ctxFor(store, mp))
  return { store, orderId: order_id }
}

const preapproval = (orderId, over = {}) => ({
  id: 'pre1',
  status: 'authorized',
  external_reference: orderId,
  date_created: '2026-10-18T12:00:00.000-03:00',
  next_payment_date: '2026-10-25T12:00:00.000-03:00',
  auto_recurring: { free_trial: { frequency: 7, frequency_type: 'days' } },
  ...over,
})

describe('webhook: suscripción', () => {
  it('authorized dentro de la prueba → trial, vence en el primer cobro + gracia', async () => {
    const { store, orderId } = await subscribedStore()
    const mp = mpMock({ getPreapproval: vi.fn(async () => preapproval(orderId)) })
    const r = await processNotification({ type: 'subscription_preapproval', dataId: 'pre1' }, ctxFor(store, mp))
    expect(r.handled).toBe(true)
    const ent = await store.getEntitlement('ana@mail.com', 'keelwise')
    expect(ent).toMatchObject({ status: 'trial', source_order_id: orderId })
    expect(ent.valid_until).toBe('2026-10-28T15:00:00.000Z')
    expect(store.db.orders.get(orderId).status).toBe('authorized')
  })

  it('el mismo evento dos veces deja un solo permiso', async () => {
    const { store, orderId } = await subscribedStore()
    const mp = mpMock({ getPreapproval: vi.fn(async () => preapproval(orderId)) })
    const evt = { type: 'subscription_preapproval', dataId: 'pre1' }
    await processNotification(evt, ctxFor(store, mp))
    await processNotification(evt, ctxFor(store, mp))
    expect(store.db.entitlements.size).toBe(1)
  })

  it('cobro aprobado → active y paid_at; cobro rechazado → past_due', async () => {
    const { store, orderId } = await subscribedStore()
    const after = new Date('2026-10-26T15:00:00.000Z')
    const pre = preapproval(orderId, { next_payment_date: '2026-11-25T12:00:00.000-03:00' })
    const okMp = mpMock({
      getAuthorizedPayment: vi.fn(async () => ({ id: 'ap1', preapproval_id: 'pre1', payment: { id: 'pay1', status: 'approved' } })),
      getPreapproval: vi.fn(async () => pre),
    })
    await processNotification({ type: 'subscription_authorized_payment', dataId: 'ap1' }, ctxFor(store, okMp, after))
    expect(await store.getEntitlement('ana@mail.com', 'keelwise')).toMatchObject({ status: 'active' })
    expect(store.db.orders.get(orderId)).toMatchObject({ mp_payment_id: 'pay1', paid_at: after.toISOString() })

    const badMp = mpMock({
      getAuthorizedPayment: vi.fn(async () => ({ id: 'ap2', preapproval_id: 'pre1', payment: { id: 'pay2', status: 'rejected' } })),
      getPreapproval: vi.fn(async () => pre),
    })
    await processNotification({ type: 'subscription_authorized_payment', dataId: 'ap2' }, ctxFor(store, badMp, after))
    expect(await store.getEntitlement('ana@mail.com', 'keelwise')).toMatchObject({ status: 'past_due' })
  })

  it('paused → past_due, cancelled → cancelled', async () => {
    const { store, orderId } = await subscribedStore()
    for (const [mpStatus, expected] of [['paused', 'past_due'], ['cancelled', 'cancelled']]) {
      const mp = mpMock({ getPreapproval: vi.fn(async () => preapproval(orderId, { status: mpStatus })) })
      await processNotification({ type: 'subscription_preapproval', dataId: 'pre1' }, ctxFor(store, mp))
      expect((await store.getEntitlement('ana@mail.com', 'keelwise')).status).toBe(expected)
    }
  })

  it('pending no crea permiso', async () => {
    const { store, orderId } = await subscribedStore()
    const mp = mpMock({ getPreapproval: vi.fn(async () => preapproval(orderId, { status: 'pending' })) })
    await processNotification({ type: 'subscription_preapproval', dataId: 'pre1' }, ctxFor(store, mp))
    expect(store.db.entitlements.size).toBe(0)
  })

  it('estado desconocido: loguea y no escribe', async () => {
    const { store, orderId } = await subscribedStore()
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const mp = mpMock({ getPreapproval: vi.fn(async () => preapproval(orderId, { status: 'algo_nuevo' })) })
    const r = await processNotification({ type: 'subscription_preapproval', dataId: 'pre1' }, { ...ctxFor(store, mp), log })
    expect(r).toMatchObject({ handled: false, reason: 'unknown-status' })
    expect(store.db.entitlements.size).toBe(0)
    expect(store.db.orders.get(orderId).status).toBe('pending')
    expect(log.warn).toHaveBeenCalled()
  })

  it('ignora preapprovals sin pedido, tipos ajenos e ids inválidos', async () => {
    const store = memoryStore()
    const mp = mpMock({ getPreapproval: vi.fn(async () => preapproval('00000000-0000-4000-8000-000000000000', { id: 'otro' })) })
    expect((await processNotification({ type: 'subscription_preapproval', dataId: 'otro' }, ctxFor(store, mp))).reason).toBe('unknown-order')
    expect((await processNotification({ type: 'merchant_order', dataId: '1' }, ctxFor(store, mp))).reason).toBe('ignored-type')
    expect((await processNotification({ type: 'payment', dataId: '../x' }, ctxFor(store, mp))).reason).toBe('invalid-id')
    expect(store.db.entitlements.size).toBe(0)
  })
})

describe('webhook: pago único', () => {
  async function paidSetup() {
    const store = memoryStore()
    const { order_id } = await checkout({ product: 'plantilla-kiosco', email: 'ana@mail.com' }, ctxFor(store, mpMock()))
    const payment = (over = {}) => ({ id: 'pay9', status: 'approved', external_reference: order_id, transaction_amount: 43500, currency_id: 'ARS', date_approved: '2026-10-20T12:00:00.000-03:00', ...over })
    return { store, orderId: order_id, payment }
  }

  it('approved → permiso activo sin vencimiento; refunded → cancelled', async () => {
    const { store, orderId, payment } = await paidSetup()
    await processNotification({ type: 'payment', dataId: 'pay9' }, ctxFor(store, mpMock({ getPayment: vi.fn(async () => payment()) })))
    expect(await store.getEntitlement('ana@mail.com', 'plantilla-kiosco')).toMatchObject({ status: 'active', valid_until: null })
    expect(store.db.orders.get(orderId)).toMatchObject({ status: 'approved', mp_payment_id: 'pay9', paid_at: '2026-10-20T12:00:00.000-03:00' })

    await processNotification({ type: 'payment', dataId: 'pay9' }, ctxFor(store, mpMock({ getPayment: vi.fn(async () => payment({ status: 'refunded' })) })))
    expect((await store.getEntitlement('ana@mail.com', 'plantilla-kiosco')).status).toBe('cancelled')
    expect(store.db.orders.get(orderId).status).toBe('refunded')
  })

  it('rejected → pedido rechazado sin permiso; un rechazo posterior no pisa un aprobado', async () => {
    const { store, orderId, payment } = await paidSetup()
    await processNotification({ type: 'payment', dataId: 'pay8' }, ctxFor(store, mpMock({ getPayment: vi.fn(async () => payment({ id: 'pay8', status: 'rejected' })) })))
    expect(store.db.orders.get(orderId).status).toBe('rejected')
    expect(store.db.entitlements.size).toBe(0)

    await processNotification({ type: 'payment', dataId: 'pay9' }, ctxFor(store, mpMock({ getPayment: vi.fn(async () => payment()) })))
    const late = await processNotification({ type: 'payment', dataId: 'pay7' }, ctxFor(store, mpMock({ getPayment: vi.fn(async () => payment({ id: 'pay7', status: 'rejected' })) })))
    expect(late.reason).toBe('already-approved')
    expect(store.db.orders.get(orderId).status).toBe('approved')
  })

  it('no habilita si el monto aprobado es menor al del pedido', async () => {
    const { store, payment } = await paidSetup()
    const r = await processNotification({ type: 'payment', dataId: 'pay9' }, ctxFor(store, mpMock({ getPayment: vi.fn(async () => payment({ transaction_amount: 10 })) })))
    expect(r.reason).toBe('amount-mismatch')
    expect(store.db.entitlements.size).toBe(0)
  })

  it('los cobros de una suscripción que llegan como payment se ignoran', async () => {
    const { store, orderId } = await subscribedStore()
    const mp = mpMock({ getPayment: vi.fn(async () => ({ id: 'p1', status: 'approved', external_reference: orderId })) })
    expect((await processNotification({ type: 'payment', dataId: 'p1' }, ctxFor(store, mp))).reason).toBe('subscription-payment')
  })
})

describe('permisos por producto', () => {
  it('tener Keelwise no da acceso a otro producto', async () => {
    const { store, orderId } = await subscribedStore()
    const mp = mpMock({ getPreapproval: vi.fn(async () => preapproval(orderId)) })
    await processNotification({ type: 'subscription_preapproval', dataId: 'pre1' }, ctxFor(store, mp))
    expect(isEntitlementActive(await store.getEntitlement('ana@mail.com', 'keelwise'), NOW)).toBe(true)
    expect(await store.getEntitlement('ana@mail.com', 'plantilla-kiosco')).toBeNull()
  })
})

describe('panel: acceso y resumen', () => {
  it('ADMIN_EMAILS se normaliza y exige email verificado', () => {
    const admins = parseAdminEmails(' Cris@Rigel.com , ,otra@x.com')
    expect([...admins]).toEqual(['cris@rigel.com', 'otra@x.com'])
    expect(isAdminUser({ email: 'CRIS@rigel.com', email_confirmed_at: '2026-01-01' }, admins)).toBe(true)
    expect(isAdminUser({ email: 'cris@rigel.com', email_confirmed_at: null }, admins)).toBe(false)
    expect(isAdminUser({ email: 'intruso@x.com', email_confirmed_at: '2026-01-01' }, admins)).toBe(false)
    expect(isAdminUser(null, admins)).toBe(false)
    expect(isAdminUser({ email: 'cris@rigel.com', email_confirmed_at: 'x' }, parseAdminEmails(''))).toBe(false)
  })

  it('el mes arranca a las 00:00 de Argentina', () => {
    expect(monthStartArgentina(new Date('2026-11-01T02:00:00Z')).toISOString()).toBe('2026-10-01T03:00:00.000Z')
    expect(monthStartArgentina(new Date('2026-11-01T04:00:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z')
  })

  it('sin datos: todo en cero y sin pedidos', () => {
    const s = composeSummary({ products: [], recent_orders: [] }, NOW)
    expect(s.totals).toEqual({ active: 0, trial: 0, past_due: 0, cancelled: 0, mrr_ars: 0, one_time_month_ars: 0, new_this_month: 0, churned_this_month: 0 })
    expect(s.products).toEqual([])
    expect(s.recent_orders).toEqual([])
    expect(s.month_start).toBe(monthStartArgentina(NOW).toISOString())
  })

  it('suma los totales de cada producto y normaliza números (la base los puede mandar como texto)', () => {
    const s = composeSummary({
      products: [
        { slug: 'keelwise', name: 'Keelwise', billing_type: 'subscription', on_sale: true, active: 2, trial: 1, past_due: 0, cancelled: 1, mrr_ars: '26500.00', one_time_month_ars: 0, new_this_month: 2, churned_this_month: 1 },
        { slug: 'plantilla', name: 'Plantilla', billing_type: 'one_time', on_sale: false, active: 1, trial: 0, past_due: 0, cancelled: 0, mrr_ars: 0, one_time_month_ars: '43500', new_this_month: 1, churned_this_month: 0 },
      ],
      recent_orders: [{ id: 'o1', product_slug: 'keelwise', email: 'a@x.com', billing_type: 'subscription', status: 'authorized', amount_ars: '14500.00', created_at: '2026-10-05T00:00:00Z', paid_at: null }],
    }, NOW)
    expect(s.totals).toMatchObject({ active: 3, trial: 1, cancelled: 1, mrr_ars: 26500, one_time_month_ars: 43500, new_this_month: 3, churned_this_month: 1 })
    expect(s.products[1].on_sale).toBe(false)
    expect(s.recent_orders[0]).toMatchObject({ amount_ars: 14500, paid_at: null })
  })

  it('no confía en el largo de recent_orders ni en campos faltantes', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ id: `o${i}`, created_at: '2026-10-01T00:00:00Z' }))
    const s = composeSummary({ products: [{ slug: 'x', name: 'X', billing_type: 'one_time' }], recent_orders: many }, NOW)
    expect(s.recent_orders).toHaveLength(20)
    expect(s.products[0]).toMatchObject({ active: 0, mrr_ars: 0, on_sale: false })
  })
})

describe('rate limiter', () => {
  it('corta después del límite y se reinicia con la ventana', () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 1000 })
    expect(allow('ip', 0)).toBe(true)
    expect(allow('ip', 10)).toBe(true)
    expect(allow('ip', 20)).toBe(false)
    expect(allow('ip', 1500)).toBe(true)
  })
})
