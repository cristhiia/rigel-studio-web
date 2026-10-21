// Pruebas de seguridad: cada parámetro de cada endpoint (query, body, headers,
// método) se prueba con valores hostiles. Para toda entrada inválida se exige:
//   · una respuesta controlada (400/401/403/404/405/429), nunca 200 ni 5xx;
//   · cero llamadas a Mercado Pago y cero escrituras en la base;
//   · nada de secretos, rutas, stack traces ni eco del valor enviado;
//   · cabeceras seguras y logs sin saltos de línea ni caracteres de control.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import checkout from '../api/billing/checkout.js'
import webhook from '../api/billing/webhook.js'
import status from '../api/billing/status.js'
import download from '../api/billing/download.js'
import reconcileApi from '../api/billing/reconcile.js'
import adminSummary from '../api/admin/summary.js'
import { ENV, SECRETS, call, freshIp, get, mockRes, post, preapproval, routeMp, setup, signedReq } from './helpers/harness.js'

let t
beforeEach(() => { t = setup() })
afterEach(() => t.cleanup())

// ── Valores hostiles ──────────────────────────────────────────────────────
const HOSTILE_STRINGS = [
  '', ' ', '   ', 'a'.repeat(100_000), 'ÿ'.repeat(5000),
  "' OR '1'='1", "'; DROP TABLE billing_orders; --", '" OR ""="', "1; SELECT pg_sleep(10)", "x' UNION SELECT email FROM auth.users --",
  '../../etc/passwd', '..\\..\\windows\\system32', '%2e%2e%2f', '%00', '\u0000', 'a\u0000b', '\n', '\r\n', 'a\r\nSet-Cookie: x=1', 'x\nX-Injected: 1',
  '<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', 'javascript:alert(1)', '${process.env.MP_ACCESS_TOKEN}', '{{7*7}}', '#{7*7}', '$(id)', '`id`', '; ls',
  '__proto__', 'constructor', 'prototype', 'toString', '__proto__[admin]=1',
  '🔥', '‮', '﻿', 'ＡＢＣ', 'İ', '-1', '0', '1e999', 'NaN', 'Infinity', 'null', 'undefined', 'true', '[object Object]', '[]', '{}', '%', '%s%s%s%s', '\\', '/', '*', '%27',
  'a b', 'a;b', 'a,b', 'a=b', 'a&b=c', '*'.repeat(300), '9'.repeat(40), '0x41414141', '1.0.0.0',
  '5f1d3a56-3b6e-4bd0-9f8a-0d0b6a1c2e11\u0000', '5F1D3A56-3B6E-4BD0-9F8A-0D0B6A1C2E11 ', 'g'.repeat(36),
]
const WRONG_TYPES = [null, undefined, 0, 1, -1, 1.5, NaN, Infinity, true, false, [], [''], ['x'], ['keelwise', 'x'], [['nested']], {}, { a: 1 }, { $ne: null }, { toString: 1 }, { length: 99999 }, { __proto__: { admin: true } }]
const ALL_VALUES = [...HOSTILE_STRINGS, ...WRONG_TYPES]
const BAD_METHODS = ['PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT', 'get', 'post', '', undefined, null, 'GET\r\nX: 1']

const ALLOWED = [400, 401, 403, 404, 405, 429]

// ── Verificaciones comunes ────────────────────────────────────────────────
const noWrites = () => {
  expect(t.fetchMock).not.toHaveBeenCalled()
  expect(t.store.db.orders.size).toBe(0)
  expect(t.store.db.entitlements.size).toBe(0)
  expect(t.store.db.events.size).toBe(0)
  expect(t.store.db.signed).toHaveLength(0)
}

function expectSafeResponse(res, sent, label) {
  expect(ALLOWED, `${label}: status ${res.statusCode}`).toContain(res.statusCode)
  const out = JSON.stringify(res.body ?? null)
  for (const secret of SECRETS) expect(out, label).not.toContain(secret)
  expect(out, label).not.toMatch(/\bat\s+\S+\s+\(|node_modules|\/home\/|\\Users\\|stack|SUPABASE|service[_ ]role/i)
  // No devolver (reflejar) lo que mandó el cliente.
  for (const v of [].concat(sent)) {
    if (typeof v === 'string' && v.trim().length >= 4 && v.length < 2000) expect(out, `${label}: refleja la entrada`).not.toContain(JSON.stringify(v).slice(1, -1))
  }
  expect(res.headers['X-Content-Type-Options'], label).toBe('nosniff')
  expect(res.headers['Cache-Control'], label).toBe('no-store')
}

function expectCleanLogs() {
  for (const fn of Object.values(t.log)) {
    for (const call of fn.mock.calls) {
      const text = JSON.stringify(call)
      // JSON.stringify escapa \n como "\\n": si quedó escapado es porque el valor original tenía el salto.
      expect(text, 'log con saltos de línea o caracteres de control').not.toMatch(/\\n|\\r|\\u00[01]/)
    }
  }
}

// ── /api/billing/checkout ─────────────────────────────────────────────────
describe('checkout: parámetros hostiles', () => {
  it('POST body.product con cualquier valor inválido', async () => {
    for (const v of ALL_VALUES) {
      const res = await call(checkout, post({ product: v, email: 'ana@mail.com' }))
      if (v === 'keelwise') continue
      expectSafeResponse(res, v, `product=${JSON.stringify(v)?.slice(0, 40)}`)
    }
    noWrites()
    expectCleanLogs()
  })

  it('POST body.email con cualquier valor inválido', async () => {
    for (const v of ALL_VALUES) {
      const res = await call(checkout, post({ product: 'keelwise', email: v }))
      expectSafeResponse(res, v, `email=${JSON.stringify(v)?.slice(0, 40)}`)
    }
    noWrites()
    expectCleanLogs()
  })

  it('POST con el cuerpo entero inválido (no objeto, vacío, tipos raros)', async () => {
    for (const body of [undefined, null, '', 'texto', '{"product":"keelwise"}', 0, 1, true, [], [1, 2], 'x'.repeat(50_000), Symbol.iterator.toString()]) {
      expectSafeResponse(await call(checkout, post(body)), body, `body=${String(body).slice(0, 30)}`)
    }
    noWrites()
  })

  it('GET ?product= con cualquier valor inválido no consulta MP ni escribe', async () => {
    for (const v of ALL_VALUES) {
      const res = await call(checkout, get({ product: v }))
      if (res.statusCode === 200) continue
      expect(ALLOWED, JSON.stringify(v)?.slice(0, 40)).toContain(res.statusCode)
    }
    noWrites()
  })

  it('los métodos no permitidos devuelven 405 sin hacer nada', async () => {
    for (const method of BAD_METHODS) {
      const res = await call(checkout, { method, body: { product: 'keelwise', email: 'a@b.co' }, query: { product: 'keelwise' }, headers: { 'x-forwarded-for': freshIp() } })
      expect(res.statusCode, String(method)).toBe(405)
    }
    noWrites()
  })

  it('campos extra del cliente (precio, moneda, estado, admin) no cambian lo que se cobra', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'pre1', init_point: 'https://mp.example/sub' }) })
    const evil = { product: 'keelwise', email: 'ana@mail.com', price_ars: 1, amount_ars: 1, transaction_amount: 1, trial_days: 9999, status: 'active', amount: 1, currency_id: 'USD', external_reference: 'x', back_url: 'https://evil.example', payer_email: 'otro@x.com', __proto__: { price_ars: 1 }, constructor: { prototype: { admin: true } } }
    const res = await call(checkout, post(evil))
    expect(res.statusCode).toBe(200)
    const sent = JSON.parse(t.fetchMock.mock.calls[0][1].body)
    expect(sent.auto_recurring.transaction_amount).toBe(14500)
    expect(sent.auto_recurring.currency_id).toBe('ARS')
    expect(sent.auto_recurring.free_trial.frequency).toBe(7)
    expect(sent.back_url).toBe('https://rigelstudio.com.ar/keelwise/gracias')
    expect(sent.payer_email).toBe('ana@mail.com')
    expect(sent.external_reference).toMatch(/^[0-9a-f-]{36}$/)
    expect(({}).admin).toBeUndefined() // sin contaminación de prototipos
  })

  it('un email válido pero raro se normaliza y se guarda en minúsculas', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'pre1', init_point: 'u' }) })
    await call(checkout, post({ product: 'keelwise', email: "  O'Brien+tag@Sub.Mail-Server.COM " }))
    expect([...t.store.db.orders.values()][0].email).toBe("o'brien+tag@sub.mail-server.com")
  })

  it('un producto desactivado o inexistente nunca cobra', async () => {
    t.store.db.products.get('keelwise').active = false
    expect((await call(checkout, post({ product: 'keelwise', email: 'a@b.co' }))).statusCode).toBe(404)
    expect((await call(checkout, post({ product: 'no-existe', email: 'a@b.co' }))).statusCode).toBe(404)
    noWrites()
  })

  it('si falla la base o MP, el error al cliente es genérico', async () => {
    t.store.createOrder = async () => { throw new Error(`conexión rechazada ${ENV.SUPABASE_SERVICE_ROLE_KEY} postgres://u:p@host`) }
    const res = await call(checkout, post({ product: 'keelwise', email: 'a@b.co' }))
    expect(res.statusCode).toBe(502)
    const out = JSON.stringify(res.body)
    expect(out).not.toMatch(/SECRETO|postgres|conexión/)
  })
})

// ── /api/billing/status y /download ───────────────────────────────────────
for (const [name, handler] of [['status', status], ['download', download]]) {
  describe(`${name}: parámetros hostiles`, () => {
    const PARAMS = ['product', 'order', 'external_reference', 'preapproval_id', 'payment_id', 'collection_id']
    const baseOk = { product: 'keelwise', order: '5f1d3a56-3b6e-4bd0-9f8a-0d0b6a1c2e11' }

    for (const param of PARAMS) {
      it(`?${param}= con cualquier valor inválido`, async () => {
        for (const v of ALL_VALUES) {
          const res = await call(handler, get({ ...baseOk, [param]: v }))
          // Un valor inválido en un parámetro opcional puede ignorarse (200/403/404 sin datos), pero nunca 5xx ni datos.
          expect([200, ...ALLOWED], `${param}=${JSON.stringify(v)?.slice(0, 40)}`).toContain(res.statusCode)
          expect(res.statusCode, `${param}=${JSON.stringify(v)?.slice(0, 40)}`).toBeLessThan(500)
          const out = JSON.stringify(res.body ?? null)
          for (const secret of SECRETS) expect(out).not.toContain(secret)
          expect(out).not.toMatch(/https:\/\/signed\./)
        }
        expect(t.store.db.signed).toHaveLength(0)
        expect(t.store.db.orders.size).toBe(0)
        expect(t.store.db.entitlements.size).toBe(0)
        expectCleanLogs()
      })
    }

    it('sin ningún identificador de pedido: 400', async () => {
      for (const q of [{}, { product: 'keelwise' }, { product: 'keelwise', order: 'no-uuid' }, { product: 'keelwise', preapproval_id: '../x' }, { order: baseOk.order }]) {
        expect((await call(handler, get(q))).statusCode).toBe(400)
      }
      expect(t.fetchMock).not.toHaveBeenCalled()
    })

    it('los métodos distintos de GET devuelven 405', async () => {
      for (const method of ['POST', ...BAD_METHODS]) {
        const res = await call(handler, { method, query: baseOk, body: baseOk, headers: { 'x-forwarded-for': freshIp() } })
        expect(res.statusCode, String(method)).toBe(405)
      }
    })

    it('parámetros repetidos (?a=1&a=2) se descartan', async () => {
      const res = await call(handler, get({ product: ['keelwise', 'x'], order: [baseOk.order, baseOk.order] }))
      expect(res.statusCode).toBe(400)
    })

    it('no se puede usar el pedido de un producto para otro, ni adivinar pedidos ajenos', async () => {
      routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'pre1', init_point: 'u' }) })
      await call(checkout, post({ product: 'keelwise', email: 'ana@mail.com' }))
      const order = [...t.store.db.orders.values()][0]
      routeMp(t.fetchMock, { 'GET /preapproval/pre1': () => preapproval(order.id) })
      const other = await call(handler, get({ product: 'plantilla-kiosco', order: order.id }))
      expect(JSON.stringify(other.body)).not.toMatch(/signed|apk/)
      expect(other.body && other.body.active).not.toBe(true)
      const stranger = await call(handler, get({ product: 'keelwise', order: '00000000-0000-4000-8000-000000000000' }))
      expect(stranger.body && stranger.body.active).not.toBe(true)
    })
  })
}

describe('status: no filtra datos de otros clientes', () => {
  it('solo devuelve { active, status }, nunca email, ids ni montos', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'pre1', init_point: 'u' }) })
    await call(checkout, post({ product: 'keelwise', email: 'victima@mail.com' }))
    const order = [...t.store.db.orders.values()][0]
    routeMp(t.fetchMock, { 'GET /preapproval/pre1': () => preapproval(order.id) })
    const res = await call(status, get({ product: 'keelwise', order: order.id }))
    expect(Object.keys(res.body).sort()).toEqual(['active', 'status'])
    expect(JSON.stringify(res.body)).not.toMatch(/victima|pre1|14500/)
  })
})

// ── /api/billing/webhook ──────────────────────────────────────────────────
describe('webhook: firma y parámetros', () => {
  const ok = () => signedReq({ eventId: 'evt-ok' })

  it('sin firma, con firma mala o con la firma de otro secreto: 401 y sin efectos', async () => {
    const good = ok()
    const variants = [
      { ...good, headers: {} },
      { ...good, headers: { ...good.headers, 'x-signature': '' } },
      { ...good, headers: { ...good.headers, 'x-signature': 'ts=1,v1=' + 'a'.repeat(64) } },
      { ...good, headers: { ...good.headers, 'x-signature': good.headers['x-signature'].replace(/v1=./, 'v1=0') } },
      { ...good, headers: { ...good.headers, 'x-signature': `${good.headers['x-signature']},v1=${'b'.repeat(64)}` } },
      { ...good, headers: { ...good.headers, 'x-signature': 'v1=' + 'a'.repeat(64) } },
      { ...good, headers: { ...good.headers, 'x-signature': 'ts=1704908010' } },
      { ...good, headers: { ...good.headers, 'x-signature': 'ts=1704908010,v1=zzzz' } },
      { ...good, headers: { ...good.headers, 'x-signature': 'x'.repeat(100_000) } },
      signedReq({ eventId: 'evt-2', secret: 'otro-secreto' }),
    ]
    for (const req of variants) {
      const res = await call(webhook, req)
      expect(res.statusCode).toBe(401)
      expect(res.body).toEqual({ error: 'Firma inválida' })
    }
    noWrites()
  })

  it('una firma válida no sirve para otro data.id, otro request-id ni otro ts', async () => {
    const good = ok()
    for (const tampered of [
      { ...good, query: { ...good.query, 'data.id': 'otroid' } },
      { ...good, headers: { ...good.headers, 'x-request-id': 'otro-request' } },
      { ...good, headers: { ...good.headers, 'x-signature': good.headers['x-signature'].replace('ts=1704908010', 'ts=1704908011') } },
    ]) {
      expect((await call(webhook, tampered)).statusCode).toBe(401)
    }
    noWrites()
  })

  it('sin MP_WEBHOOK_SECRET configurado, ninguna firma pasa (ni una vacía)', async () => {
    delete process.env.MP_WEBHOOK_SECRET
    for (const req of [ok(), { ...ok(), headers: {} }, signedReq({ secret: '' })]) {
      expect((await call(webhook, req)).statusCode).toBe(401)
    }
    noWrites()
  })

  it('query.data.id, type y topic hostiles: nunca 5xx, nunca consultan MP', async () => {
    for (const v of ALL_VALUES) {
      for (const query of [{ 'data.id': v, type: 'payment' }, { 'data.id': 'pre1', type: v }, { 'data.id': 'pre1', topic: v }]) {
        const req = { method: 'POST', query, body: {}, headers: ok().headers }
        const res = await call(webhook, req)
        expect([200, ...ALLOWED], JSON.stringify(query).slice(0, 80)).toContain(res.statusCode)
        expect(res.statusCode).toBeLessThan(500)
      }
    }
    // Con firma válida el aviso se registra (idempotencia), pero no pasa nada más.
    expect(t.fetchMock).not.toHaveBeenCalled()
    expect(t.store.db.orders.size).toBe(0)
    expect(t.store.db.entitlements.size).toBe(0)
    expectCleanLogs()
  })

  it('body hostil (tipos raros, id enorme, data no objeto) no rompe el handler', async () => {
    for (const body of [undefined, null, '', 'x', 5, [], {}, { id: {}, data: 'x' }, { id: 'a'.repeat(5000), data: { id: [] } }, { type: {}, data: null }, { data: { id: { toString: 1 } } }]) {
      const res = await call(webhook, { method: 'POST', query: {}, body, headers: ok().headers })
      expect(res.statusCode).toBeLessThan(500)
    }
    noWrites()
  })

  it('firma válida con un data.id malicioso (traversal, SQL) no llega a MP', async () => {
    for (const dataId of ['../payments/1', 'pre1/../../x', "1' OR '1'='1", 'a'.repeat(200), '%2e%2e', 'pre 1', 'pre1?x=1', 'pre1#', 'pre1\n']) {
      for (const type of ['subscription_preapproval', 'payment', 'subscription_authorized_payment']) {
        const res = await call(webhook, signedReq({ dataId, type, eventId: `evt-${Math.random()}` }))
        expect(res.statusCode, dataId).toBe(200)
      }
    }
    expect(t.fetchMock).not.toHaveBeenCalled()
    expectCleanLogs()
  })

  it('firma válida con un tipo desconocido se ignora sin tocar MP ni la base de pedidos', async () => {
    const res = await call(webhook, signedReq({ type: 'merchant_order', dataId: '123', eventId: 'evt-mo' }))
    expect(res.statusCode).toBe(200)
    expect(t.fetchMock).not.toHaveBeenCalled()
    expect(t.store.db.orders.size).toBe(0)
  })

  it('replay: reenviar el mismo aviso firmado no cambia nada la segunda vez', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'pre1', init_point: 'u' }) })
    await call(checkout, post({ product: 'keelwise', email: 'ana@mail.com' }))
    const order = [...t.store.db.orders.values()][0]
    routeMp(t.fetchMock, { 'GET /preapproval/pre1': () => preapproval(order.id) })
    const req = signedReq({ eventId: 'evt-replay' })
    await call(webhook, req)
    const snapshot = JSON.stringify([...t.store.db.entitlements.values()])
    const calls = t.fetchMock.mock.calls.length
    expect((await call(webhook, req)).statusCode).toBe(200)
    expect(JSON.stringify([...t.store.db.entitlements.values()])).toBe(snapshot)
    expect(t.fetchMock.mock.calls.length).toBe(calls)
  })

  it('un aviso "authorized" para un pedido de OTRO producto o de pago único no da acceso a Keelwise', async () => {
    routeMp(t.fetchMock, { 'POST /checkout/preferences': () => ({ id: 'p', init_point: 'u' }) })
    await call(checkout, post({ product: 'plantilla-kiosco', email: 'ana@mail.com' }))
    const order = [...t.store.db.orders.values()][0]
    routeMp(t.fetchMock, { 'GET /preapproval/pre9': () => preapproval(order.id, { id: 'pre9' }) })
    await call(webhook, signedReq({ dataId: 'pre9', eventId: 'evt-x' }))
    expect(await t.store.getEntitlement('ana@mail.com', 'keelwise')).toBeNull()
  })

  it('pago aprobado por un monto menor o en otra moneda no habilita el acceso', async () => {
    routeMp(t.fetchMock, { 'POST /checkout/preferences': () => ({ id: 'p', init_point: 'u' }) })
    await call(checkout, post({ product: 'plantilla-kiosco', email: 'ana@mail.com' }))
    const order = [...t.store.db.orders.values()][0]
    for (const [i, over] of [{ transaction_amount: 1 }, { currency_id: 'USD' }, { transaction_amount: -43500 }, { transaction_amount: '0' }].entries()) {
      routeMp(t.fetchMock, { [`GET /v1/payments/9${i}`]: () => ({ id: 9 + i, status: 'approved', external_reference: order.id, transaction_amount: 43500, currency_id: 'ARS', ...over }) })
      await call(webhook, signedReq({ dataId: `9${i}`, type: 'payment', eventId: `evt-m${i}` }))
    }
    expect(await t.store.getEntitlement('ana@mail.com', 'plantilla-kiosco')).toBeNull()
  })

  it('los métodos distintos de POST devuelven 405', async () => {
    for (const method of ['GET', ...BAD_METHODS]) {
      expect((await call(webhook, { ...ok(), method })).statusCode, String(method)).toBe(405)
    }
    noWrites()
  })
})

// ── /api/admin/summary y /api/billing/reconcile ───────────────────────────
describe('admin y cron: autenticación', () => {
  const HEADERS = [
    {}, { authorization: '' }, { authorization: 'Bearer' }, { authorization: 'Bearer ' }, { authorization: 'bearer tok-nope' }, { authorization: 'Bearer a b' },
    { authorization: 'Basic dG9rLWFkbWlu' }, { authorization: 'tok-admin' }, { authorization: 'Bearer ' + 'a'.repeat(100_000) }, { authorization: "Bearer ' OR 1=1 --" },
    { authorization: 'Bearer tok-admin\r\nX-Evil: 1' }, { authorization: ['Bearer tok-admin', 'Bearer tok-admin'] }, { authorization: 'Bearer tok-unverified' }, { authorization: 'Bearer tok-other' },
    { 'x-forwarded-authorization': 'Bearer tok-admin' }, { cookie: 'sb-access-token=tok-admin' },
  ]

  it('admin: 404 uniforme (no confirma que el panel exista) con cualquier credencial inválida', async () => {
    for (const headers of HEADERS) {
      const res = await call(adminSummary, get({}, headers))
      expect(res.statusCode, JSON.stringify(headers).slice(0, 60)).toBe(404)
      expect(res.body).toEqual({ error: 'No encontrado' })
    }
  })

  it('admin: la query o el body no sirven para saltear la sesión', async () => {
    for (const q of [{ token: 'tok-admin' }, { access_token: 'tok-admin' }, { admin: '1' }, { email: 'cris@rigel.com' }, { 'x': ALL_VALUES }]) {
      expect((await call(adminSummary, get(q))).statusCode).toBe(404)
    }
    for (const method of ['POST', ...BAD_METHODS]) {
      expect((await call(adminSummary, { method, query: {}, body: { email: 'cris@rigel.com' }, headers: { authorization: 'Bearer tok-admin', 'x-forwarded-for': freshIp() } })).statusCode, String(method)).toBe(404)
    }
  })

  it('admin: si Supabase falla al validar el token, 404/502 genérico y sin datos', async () => {
    t.store.verifyUser = async () => { throw new Error(`boom ${ENV.SUPABASE_SERVICE_ROLE_KEY}`) }
    const res = await call(adminSummary, get({}, { authorization: 'Bearer tok-admin' }))
    expect([404, 502]).toContain(res.statusCode)
    expect(JSON.stringify(res.body)).not.toMatch(/SECRETO|boom/)
  })

  it('admin: un admin con el email sin verificar o con otro email no entra, aunque el token sea de Supabase', async () => {
    for (const token of ['tok-unverified', 'tok-other']) {
      expect((await call(adminSummary, get({}, { authorization: `Bearer ${token}` }))).statusCode).toBe(404)
    }
  })

  it('cron: 404 uniforme con cualquier credencial inválida', async () => {
    for (const headers of HEADERS) {
      expect((await call(reconcileApi, get({}, headers))).statusCode).toBe(404)
    }
    expect(t.fetchMock).not.toHaveBeenCalled()
  })

  it('admin y cron respetan el límite de intentos por IP', async () => {
    const h = { 'x-forwarded-for': '203.0.113.77', authorization: 'Bearer mal' }
    let last
    for (let i = 0; i < 40; i++) last = await call(adminSummary, { method: 'GET', query: {}, headers: h })
    expect(last.statusCode).toBe(429)
  })
})

// ── Entrega ──────────────────────────────────────────────────────────────
describe('descarga: solo con acceso activo y link de corta vida', () => {
  it('sin pago, pago pendiente, cancelado o vencido: 403 y ningún link firmado', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'pre1', init_point: 'u' }) })
    await call(checkout, post({ product: 'keelwise', email: 'ana@mail.com' }))
    const order = [...t.store.db.orders.values()][0]
    for (const st of ['pending', 'cancelled', 'paused']) {
      routeMp(t.fetchMock, { 'GET /preapproval/pre1': () => preapproval(order.id, { status: st }) })
      const res = await call(download, get({ product: 'keelwise', order: order.id }))
      expect(res.statusCode, st).toBe(403)
    }
    await t.store.upsertEntitlement({ email: 'ana@mail.com', product_slug: 'keelwise', status: 'active', valid_until: new Date(Date.now() - 1000).toISOString(), source_order_id: order.id, updated_at: new Date().toISOString() })
    routeMp(t.fetchMock, { 'GET /preapproval/pre1': () => preapproval(order.id, { status: 'cancelled' }) })
    expect((await call(download, get({ product: 'keelwise', order: order.id }))).statusCode).toBe(403)
    expect(t.store.db.signed).toHaveLength(0)
  })

  it('el link dura 10 minutos y sale de un bucket privado', async () => {
    routeMp(t.fetchMock, { 'POST /preapproval': () => ({ id: 'pre1', init_point: 'u' }) })
    await call(checkout, post({ product: 'keelwise', email: 'ana@mail.com' }))
    const order = [...t.store.db.orders.values()][0]
    routeMp(t.fetchMock, { 'GET /preapproval/pre1': () => preapproval(order.id) })
    const res = await call(download, get({ product: 'keelwise', order: order.id }))
    expect(res.body.expires_in).toBe(600)
    expect(t.store.db.signed).toEqual([{ bucket: 'apks', path: 'keelwise.apk', expiresIn: 600 }])
  })

  it('un delivery_ref inseguro (http://, javascript:) nunca se entrega', async () => {
    t.store.db.products.get('plantilla-kiosco').delivery_ref = 'http://inseguro.example'
    routeMp(t.fetchMock, { 'POST /checkout/preferences': () => ({ id: 'p', init_point: 'u' }) })
    await call(checkout, post({ product: 'plantilla-kiosco', email: 'ana@mail.com' }))
    const order = [...t.store.db.orders.values()][0]
    routeMp(t.fetchMock, { 'GET /v1/payments/55': () => ({ id: 55, status: 'approved', external_reference: order.id, transaction_amount: 43500, currency_id: 'ARS' }) })
    const res = await call(download, get({ product: 'plantilla-kiosco', external_reference: order.id, payment_id: '55' }))
    expect(res.statusCode).toBe(503)
    expect(JSON.stringify(res.body)).not.toContain('inseguro')
  })
})

// ── Revisión estática del repo ───────────────────────────────────────────
const ROOT = path.resolve(import.meta.dirname, '..')
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

describe('revisión estática', () => {
  const clientFiles = walk(path.join(ROOT, 'src')).filter(f => /\.(jsx?|css|html)$/.test(f))
  const read = f => fs.readFileSync(f, 'utf8')

  it('ningún secreto del servidor aparece en el código que va al navegador', () => {
    for (const f of clientFiles) {
      expect(read(f), path.relative(ROOT, f)).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|MP_ACCESS_TOKEN|MP_WEBHOOK_SECRET|CRON_SECRET|service_role/)
    }
  })

  it('las únicas variables VITE_ de billing son las públicas', () => {
    const found = new Set()
    for (const f of clientFiles) for (const m of read(f).matchAll(/import\.meta\.env\.(VITE_\w+)/g)) found.add(m[1])
    const billing = [...found].filter(v => /BILLING|SUPABASE|KEY|SECRET|TOKEN/.test(v))
    expect(billing.sort()).toEqual(['VITE_BILLING_SUPABASE_ANON_KEY', 'VITE_BILLING_SUPABASE_URL'])
  })

  it('.env.example no trae valores reales', () => {
    for (const line of read(path.join(ROOT, '.env.example')).split('\n')) {
      if (/^[A-Z_]+=/.test(line)) expect(line, line).toMatch(/^[A-Z_]+=$/)
    }
  })

  it('el SQL: toda tabla de billing tiene RLS y no hay políticas ni grants a anon/authenticated sobre tablas', () => {
    const sql = read(path.join(ROOT, 'supabase/migrations/billing.sql'))
    const tables = [...sql.matchAll(/create table if not exists public\.(billing_\w+)/g)].map(m => m[1])
    expect(tables.length).toBe(6)
    for (const tb of tables) expect(sql, tb).toMatch(new RegExp(`alter table public\\.${tb}\\s+enable row level security`))
    expect(sql).not.toMatch(/create policy/i)
    expect(sql).not.toMatch(/grant\s+(all|select|insert|update|delete)\s+on\s+(table\s+)?public\.billing/i)
  })

  it('el SQL: toda función security definer fija el search_path', () => {
    const sql = read(path.join(ROOT, 'supabase/migrations/billing.sql'))
    const fns = sql.split(/create or replace function/i).slice(1)
    for (const fn of fns) {
      const head = fn.slice(0, fn.search(/\$\$/))
      if (/security definer/i.test(head)) expect(head, head.slice(0, 40)).toMatch(/set search_path\s*=\s*public,\s*pg_temp/i)
    }
  })

  it('los handlers no usan eval, new Function ni exec de comandos', () => {
    for (const f of walk(path.join(ROOT, 'api')).filter(f => f.endsWith('.js'))) {
      expect(read(f), path.relative(ROOT, f)).not.toMatch(/\beval\(|new Function\(|child_process|execSync|\bspawn\(/)
    }
  })

  it('las consultas a Supabase usan el cliente parametrizado (sin armar SQL con texto)', () => {
    const store = read(path.join(ROOT, 'api/_lib/billingStore.js'))
    expect(store).not.toMatch(/\.rpc\(\s*`|`\s*(select|insert|update|delete)\s/i)
    expect(store).not.toMatch(/\.query\(|\.sql\(|rawQuery|\.raw\(/)
  })

  it('vercel.json: cabeceras de seguridad y cron de conciliación configurados', () => {
    const cfg = JSON.parse(read(path.join(ROOT, 'vercel.json')))
    const all = (cfg.headers || []).flatMap(h => h.headers.map(x => `${x.key}:${x.value}`)).join('\n')
    expect(all).toMatch(/X-Content-Type-Options:nosniff/)
    expect(all).toMatch(/X-Frame-Options:DENY/)
    expect(all).toMatch(/Referrer-Policy:/)
    expect(all).toMatch(/Permissions-Policy:/)
    expect(cfg.crons).toEqual([{ path: '/api/billing/reconcile', schedule: expect.stringMatching(/^\S+ \S+ \S+ \S+ \S+$/) }])
  })

  it('el plan Hobby permite 12 funciones: quedan al menos 2 libres (con el CRM son 10)', () => {
    const fns = walk(path.join(ROOT, 'api')).filter(f => f.endsWith('.js') && !path.relative(path.join(ROOT, 'api'), f).split(path.sep).some(p => p.startsWith('_')))
    expect(fns.length, fns.map(f => path.relative(ROOT, f)).join(', ')).toBeLessThanOrEqual(10)
  })
})

// ── Defensa en profundidad de las respuestas ─────────────────────────────
describe('respuestas', () => {
  it('toda respuesta de error trae nosniff y no se cachea', async () => {
    const cases = [
      [checkout, post({})], [status, get({})], [download, get({})], [webhook, { method: 'POST', query: {}, body: {}, headers: {} }],
      [adminSummary, get({})], [reconcileApi, get({})],
    ]
    for (const [handler, req] of cases) {
      const res = await call(handler, req)
      expect(res.headers['X-Content-Type-Options']).toBe('nosniff')
      expect(res.headers['Cache-Control']).toBe('no-store')
    }
    expect(mockRes).toBeDefined()
  })
})
