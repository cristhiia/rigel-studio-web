import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KEELWISE_REASON, buildManifest } from '../api/_lib/keelwise.js'

// Supabase mockeado: guarda en memoria y registra las llamadas.
const db = new Map()
const upsertCalls = []
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      upsert: async (row, opts) => {
        upsertCalls.push({ row, opts })
        db.set(row.mp_preapproval_id, row)
        return { error: null }
      },
    }),
    storage: {
      from: bucket => ({
        createSignedUrl: async (p, exp) => ({ data: { signedUrl: `https://signed.example/${bucket}/${p}?exp=${exp}` }, error: null }),
      }),
    },
  }),
}))

const subscribe = (await import('../api/keelwise/subscribe.js')).default
const webhook = (await import('../api/keelwise/webhook.js')).default
const status = (await import('../api/keelwise/status.js')).default
const download = (await import('../api/keelwise/download.js')).default

function mockRes() {
  const res = { statusCode: 200, body: undefined, headers: {} }
  res.status = code => { res.statusCode = code; return res }
  res.json = body => { res.body = body; return res }
  res.setHeader = (k, v) => { res.headers[k] = v }
  return res
}

const ENV = {
  MP_ACCESS_TOKEN: 'TEST-token',
  MP_WEBHOOK_SECRET: 'whsec',
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  KEELWISE_PRICE_ARS: '15000',
  KEELWISE_APK_URL: 'supabase-storage://apks/keelwise.apk',
  SITE_URL: 'https://rigelstudio.com.ar',
}

let fetchMock
beforeEach(() => {
  Object.assign(process.env, ENV)
  db.clear()
  upsertCalls.length = 0
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  for (const k of Object.keys(ENV)) delete process.env[k]
})

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })
const preapproval = (over = {}) => ({
  id: 'pre1', reason: KEELWISE_REASON, status: 'authorized', external_reference: 'ana@mail.com',
  next_payment_date: '2026-11-23T00:00:00.000-03:00', ...over,
})

describe('POST /api/keelwise/subscribe', () => {
  it('crea el preapproval y devuelve init_point', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 'pre1', init_point: 'https://mp.example/checkout' }))
    const res = mockRes()
    await subscribe({ method: 'POST', body: { email: ' Ana@Mail.com ' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ init_point: 'https://mp.example/checkout' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.mercadopago.com/preapproval')
    expect(init.headers.Authorization).toBe('Bearer TEST-token')
    const payload = JSON.parse(init.body)
    expect(payload).toMatchObject({ payer_email: 'ana@mail.com', external_reference: 'ana@mail.com' })
    expect(payload.auto_recurring.transaction_amount).toBe(15000)
  })

  it('rechaza email inválido sin llamar a MP', async () => {
    const res = mockRes()
    await subscribe({ method: 'POST', body: { email: 'no-es-email' } }, res)
    expect(res.statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('503 si falta el precio', async () => {
    delete process.env.KEELWISE_PRICE_ARS
    const res = mockRes()
    await subscribe({ method: 'POST', body: { email: 'ana@mail.com' } }, res)
    expect(res.statusCode).toBe(503)
  })

  it('502 si MP falla, sin filtrar el detalle', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'payer_email invalid' }, 400))
    const res = mockRes()
    await subscribe({ method: 'POST', body: { email: 'ana@mail.com' } }, res)
    expect(res.statusCode).toBe(502)
    expect(JSON.stringify(res.body)).not.toContain('payer_email')
  })
})

function signedReq({ dataId = 'pre1', type = 'subscription_preapproval', secret = ENV.MP_WEBHOOK_SECRET } = {}) {
  const ts = '1704908010'
  const requestId = 'req-1'
  const v1 = crypto.createHmac('sha256', secret).update(buildManifest({ dataId, requestId, ts })).digest('hex')
  return {
    method: 'POST',
    query: { 'data.id': dataId, type },
    body: { type, data: { id: dataId } },
    headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId },
  }
}

describe('POST /api/keelwise/webhook', () => {
  it('401 con firma inválida y no consulta MP', async () => {
    const res = mockRes()
    await webhook(signedReq({ secret: 'otro' }), res)
    expect(res.statusCode).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('guarda el estado y es idempotente ante el mismo evento', async () => {
    fetchMock.mockResolvedValue(json(preapproval()))
    for (let i = 0; i < 2; i++) {
      const res = mockRes()
      await webhook(signedReq(), res)
      expect(res.statusCode).toBe(200)
    }
    expect(db.size).toBe(1)
    expect(db.get('pre1')).toMatchObject({ email: 'ana@mail.com', status: 'authorized' })
    expect(upsertCalls.every(c => c.opts.onConflict === 'mp_preapproval_id')).toBe(true)
  })

  it('estado desconocido: 200 sin escribir', async () => {
    fetchMock.mockResolvedValue(json(preapproval({ status: 'raro' })))
    const res = mockRes()
    await webhook(signedReq(), res)
    expect(res.statusCode).toBe(200)
    expect(db.size).toBe(0)
  })

  it('500 si MP no responde, para que reintente', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'))
    const res = mockRes()
    await webhook(signedReq(), res)
    expect(res.statusCode).toBe(500)
  })
})

describe('GET /api/keelwise/status y /download', () => {
  const req = id => ({ method: 'GET', query: { preapproval_id: id }, headers: { 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` } })

  it('status devuelve solo {active}', async () => {
    fetchMock.mockResolvedValueOnce(json(preapproval()))
    const res = mockRes()
    await status(req('pre1'), res)
    expect(res.body).toEqual({ active: true })
  })

  it('status false para pending, ajeno o inexistente', async () => {
    for (const r of [json(preapproval({ status: 'pending' })), json(preapproval({ reason: 'otro' })), json({}, 404)]) {
      fetchMock.mockResolvedValueOnce(r)
      const res = mockRes()
      await status(req('pre1'), res)
      expect(res.body).toEqual({ active: false })
    }
  })

  it('status rechaza ids inválidos', async () => {
    const res = mockRes()
    await status(req('../../x'), res)
    expect(res.statusCode).toBe(400)
  })

  it('rate limit por IP', async () => {
    fetchMock.mockResolvedValue(json(preapproval()))
    const fixed = { method: 'GET', query: { preapproval_id: 'pre1' }, headers: { 'x-forwarded-for': '9.9.9.9' } }
    let last
    for (let i = 0; i < 31; i++) { last = mockRes(); await status(fixed, last) }
    expect(last.statusCode).toBe(429)
  })

  it('download entrega link firmado solo si está activo', async () => {
    fetchMock.mockResolvedValueOnce(json(preapproval()))
    const ok = mockRes()
    await download(req('pre1'), ok)
    expect(ok.body.url).toBe('https://signed.example/apks/keelwise.apk?exp=600')

    fetchMock.mockResolvedValueOnce(json(preapproval({ status: 'cancelled' })))
    const no = mockRes()
    await download(req('pre1'), no)
    expect(no.statusCode).toBe(403)
    expect(no.body.url).toBeUndefined()
  })
})
