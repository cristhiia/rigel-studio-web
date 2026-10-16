import crypto from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  KEELWISE_REASON,
  buildManifest,
  buildPreapprovalPayload,
  createRateLimiter,
  isValidEmail,
  mapStatus,
  normalizeEmail,
  parsePriceArs,
  processNotification,
  verifySignature,
} from '../api/_lib/keelwise.js'

const SECRET = 'test-secret'

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

  it('rechaza si cambia el data.id', () => {
    expect(verifySignature({ ...base, dataId: 'otro', signatureHeader: sign(base), secret: SECRET })).toBe(false)
  })

  it('rechaza con otro secreto', () => {
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

describe('mapStatus', () => {
  it('solo authorized es activo', () => {
    expect(mapStatus('authorized')).toEqual({ status: 'authorized', active: true })
    expect(mapStatus('pending')).toEqual({ status: 'pending', active: false })
    expect(mapStatus('paused')).toEqual({ status: 'paused', active: false })
    expect(mapStatus('cancelled')).toEqual({ status: 'cancelled', active: false })
  })

  it('estado desconocido devuelve null', () => {
    expect(mapStatus('finished')).toBeNull()
    expect(mapStatus(undefined)).toBeNull()
  })
})

describe('validación de email', () => {
  it('acepta emails comunes y normaliza', () => {
    expect(isValidEmail('  Ana.Perez@Gmail.com ')).toBe(true)
    expect(normalizeEmail('  Ana.Perez@Gmail.com ')).toBe('ana.perez@gmail.com')
  })

  it('rechaza formatos inválidos', () => {
    for (const bad of ['', 'ana', 'ana@', '@gmail.com', 'ana@gmail', 'ana @gmail.com', null, 42]) {
      expect(isValidEmail(bad)).toBe(false)
    }
    expect(isValidEmail(`${'a'.repeat(250)}@x.com`)).toBe(false)
  })
})

describe('payload de suscripción', () => {
  it('usa reason, external_reference normalizado, prueba de 7 días y back_url', () => {
    const p = buildPreapprovalPayload({ email: 'Ana@Mail.com', priceArs: 15000, siteUrl: 'https://rigelstudio.com.ar/' })
    expect(p.reason).toBe(KEELWISE_REASON)
    expect(p.external_reference).toBe('ana@mail.com')
    expect(p.back_url).toBe('https://rigelstudio.com.ar/keelwise/gracias')
    expect(p.auto_recurring).toMatchObject({
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 15000,
      currency_id: 'ARS',
      free_trial: { frequency: 7, frequency_type: 'days' },
    })
  })

  it('parsePriceArs ignora valores no numéricos o no positivos', () => {
    expect(parsePriceArs('15000')).toBe(15000)
    expect(parsePriceArs(undefined)).toBeNull()
    expect(parsePriceArs('abc')).toBeNull()
    expect(parsePriceArs('0')).toBeNull()
  })
})

function memoryStore() {
  const rows = new Map()
  return { rows, upsert: vi.fn(async row => { rows.set(row.mp_preapproval_id, { ...row }) }) }
}

function mpMock(preapproval, payment) {
  return {
    getPreapproval: vi.fn(async () => preapproval),
    getAuthorizedPayment: vi.fn(async () => payment),
  }
}

const PRE = {
  id: 'pre123',
  reason: KEELWISE_REASON,
  status: 'authorized',
  external_reference: 'ana@mail.com',
  payer_email: 'otro@mail.com',
  next_payment_date: '2026-11-23T00:00:00.000-03:00',
}

describe('processNotification (idempotencia y estados)', () => {
  it('el mismo evento dos veces deja una sola fila', async () => {
    const store = memoryStore()
    const mp = mpMock(PRE)
    const evt = { type: 'subscription_preapproval', dataId: 'pre123' }
    await processNotification(evt, { mp, store })
    await processNotification(evt, { mp, store })
    expect(store.rows.size).toBe(1)
    expect(store.rows.get('pre123')).toMatchObject({ email: 'ana@mail.com', status: 'authorized' })
  })

  it('un cambio de estado actualiza la misma fila', async () => {
    const store = memoryStore()
    await processNotification({ type: 'subscription_preapproval', dataId: 'pre123' }, { mp: mpMock(PRE), store })
    await processNotification(
      { type: 'subscription_preapproval', dataId: 'pre123' },
      { mp: mpMock({ ...PRE, status: 'cancelled' }), store },
    )
    expect(store.rows.size).toBe(1)
    expect(store.rows.get('pre123').status).toBe('cancelled')
  })

  it('pagos autorizados resuelven su preapproval', async () => {
    const store = memoryStore()
    const mp = mpMock(PRE, { id: 'pay1', preapproval_id: 'pre123' })
    const r = await processNotification({ type: 'subscription_authorized_payment', dataId: 'pay1' }, { mp, store })
    expect(r.handled).toBe(true)
    expect(mp.getPreapproval).toHaveBeenCalledWith('pre123')
  })

  it('estado desconocido: loguea y no escribe', async () => {
    const store = memoryStore()
    const log = { warn: vi.fn() }
    const r = await processNotification(
      { type: 'subscription_preapproval', dataId: 'pre123' },
      { mp: mpMock({ ...PRE, status: 'algo_nuevo' }), store, log },
    )
    expect(r).toMatchObject({ handled: false, reason: 'unknown-status' })
    expect(store.upsert).not.toHaveBeenCalled()
    expect(log.warn).toHaveBeenCalled()
  })

  it('ignora preapprovals ajenos, tipos ajenos e ids inválidos', async () => {
    const store = memoryStore()
    const notKeelwise = await processNotification(
      { type: 'subscription_preapproval', dataId: 'pre123' },
      { mp: mpMock({ ...PRE, reason: 'Otro producto' }), store },
    )
    expect(notKeelwise.reason).toBe('not-keelwise')
    const otherType = await processNotification({ type: 'payment', dataId: '1' }, { mp: mpMock(PRE), store })
    expect(otherType.reason).toBe('ignored-type')
    const badId = await processNotification({ type: 'subscription_preapproval', dataId: '../x' }, { mp: mpMock(PRE), store })
    expect(badId.reason).toBe('invalid-id')
    expect(store.upsert).not.toHaveBeenCalled()
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
