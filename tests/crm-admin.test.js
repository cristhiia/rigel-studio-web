// CRM del panel: acceso, validación y operaciones de fichas, bitácora y publicidad.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { call, freshIp, get, setup } from './helpers/harness.js'
import crm from '../api/admin/crm.js'
import { cleanLinks, cleanText, cleanUrl, parseCreative, parseProduct } from '../api/_lib/crmAdmin.js'

const AUTH = { authorization: 'Bearer tok-admin' }
const act = (body, headers = AUTH) => ({ method: 'POST', body, query: {}, headers: { 'x-forwarded-for': freshIp(), ...headers } })
const PRODUCT = { action: 'product_save', slug: 'kioscopro', name: 'KioscoPro', status: 'beta', manual_users: 3, manual_mrr_ars: 45000 }

let t
beforeEach(() => { t = setup() })
afterEach(() => t.cleanup())

describe('acceso', () => {
  it('404 uniforme sin sesión de administrador', async () => {
    for (const h of [{}, { authorization: 'Bearer nope' }, { authorization: 'Bearer tok-other' }, { authorization: 'Bearer tok-unverified' }]) {
      expect((await call(crm, get({}, h))).statusCode).toBe(404)
      expect((await call(crm, act(PRODUCT, h))).statusCode).toBe(404)
    }
    expect(t.store.db.crmProducts.size).toBe(0)
  })
  it('métodos incorrectos dan 404', async () => {
    expect((await call(crm, { method: 'DELETE', query: {}, headers: { ...AUTH, 'x-forwarded-for': freshIp() } })).statusCode).toBe(404)
  })
  it('acción desconocida o cuerpo inválido da 400', async () => {
    expect((await call(crm, act({ action: 'drop_tables' }))).statusCode).toBe(400)
    expect((await call(crm, act({ action: '__proto__' }))).statusCode).toBe(400)
    expect((await call(crm, act(null))).statusCode).toBe(400)
  })
})

describe('fichas', () => {
  it('crea, edita y lista un producto', async () => {
    expect((await call(crm, act(PRODUCT))).statusCode).toBe(200)
    expect((await call(crm, act({ ...PRODUCT, tagline: 'Caja y stock', status: 'vendiendo' }))).statusCode).toBe(200)
    const res = await call(crm, get({}, AUTH))
    expect(res.statusCode).toBe(200)
    expect(res.body.products).toHaveLength(1)
    expect(res.body.products[0]).toMatchObject({ slug: 'kioscopro', tagline: 'Caja y stock', status: 'vendiendo', manual_users: 3 })
  })
  it('rechaza datos inválidos y no guarda nada', async () => {
    const bads = [
      { slug: 'Mal Slug' }, { slug: 'a' }, { name: '' }, { name: 'x'.repeat(61) }, { status: 'otro' },
      { manual_users: -1 }, { manual_users: 1.5 }, { manual_mrr_ars: 'mucho' }, { links: 'javascript:alert(1)' },
      { links: 'Web | data:text/html,<script>' }, { billing_slug: 'No Valido' }, { how_it_works: 'x'.repeat(4001) },
    ]
    for (const b of bads) expect((await call(crm, act({ ...PRODUCT, ...b }))).statusCode).toBe(400)
    expect(t.store.db.crmProducts.size).toBe(0)
  })
})

describe('bitácora', () => {
  beforeEach(async () => { await call(crm, act(PRODUCT)) })
  it('agrega y borra avances', async () => {
    expect((await call(crm, act({ action: 'log_add', product: 'kioscopro', kind: 'avance', text: 'Terminamos el cierre de caja' }))).statusCode).toBe(200)
    let res = await call(crm, get({}, AUTH))
    expect(res.body.log).toHaveLength(1)
    const id = res.body.log[0].id
    expect((await call(crm, act({ action: 'log_delete', id }))).statusCode).toBe(200)
    res = await call(crm, get({}, AUTH))
    expect(res.body.log).toHaveLength(0)
  })
  it('valida producto, tipo y texto', async () => {
    for (const b of [{ product: 'no-existe' }, { product: 'Mal Slug' }, { kind: 'chisme' }, { text: '   ' }, { text: 'x'.repeat(601) }]) {
      expect((await call(crm, act({ action: 'log_add', product: 'kioscopro', text: 'ok', ...b }))).statusCode).toBe(400)
    }
    expect((await call(crm, act({ action: 'log_delete', id: 'DROP' }))).statusCode).toBe(400)
    expect(t.store.db.crmLog).toHaveLength(0)
  })
})

describe('publicidad', () => {
  beforeEach(async () => { await call(crm, act(PRODUCT)) })
  const piece = over => ({ action: 'creative_save', product: 'kioscopro', title: 'Reel cierre de caja', ...over })
  it('crea una pieza, la edita con resultados y la borra', async () => {
    expect((await call(crm, act(piece({ kind: 'video', concept: 'Antes/después' })))).statusCode).toBe(200)
    const id = (await call(crm, get({}, AUTH))).body.creatives[0].id
    expect((await call(crm, act(piece({
      id, kind: 'video', status: 'publicado', published_on: '2026-10-25', views: '1200', likes: 80, conversions: 4, spend_ars: 15000, verdict: 'funciono', learnings: 'El gancho de los primeros 2 segundos',
    })))).statusCode).toBe(200)
    const c = (await call(crm, get({}, AUTH))).body.creatives[0]
    expect(c).toMatchObject({ status: 'publicado', views: 1200, likes: 80, conversions: 4, spend_ars: 15000, verdict: 'funciono' })
    expect(c.reach).toBeNull()
    expect((await call(crm, act({ action: 'creative_delete', id }))).statusCode).toBe(200)
    expect((await call(crm, get({}, AUTH))).body.creatives).toHaveLength(0)
  })
  it('rechaza datos inválidos', async () => {
    const bads = [
      { title: '' }, { kind: 'meme' }, { status: 'x' }, { platform: 'myspace' }, { verdict: 'tal vez' },
      { published_on: '2026-02-31' }, { published_on: 'ayer' }, { views: -5 }, { likes: 1e12 }, { spend_ars: 'gratis' },
      { media_url: 'javascript:alert(1)' }, { media_url: 'ftp://x.com/a' }, { product: 'no-existe' },
    ]
    for (const b of bads) expect((await call(crm, act(piece(b)))).statusCode).toBe(400)
    expect(t.store.db.crmCreatives).toHaveLength(0)
  })
})

describe('limpieza de texto', () => {
  it('quita caracteres de control y respeta saltos de línea solo donde corresponde', () => {
    expect(cleanText('a\u0000b\tc\nd', 50, 'x')).toBe('a b c d')
    expect(cleanText('a\u0000b\n\n\n\nc', 50, 'x', { multiline: true })).toBe('a b\n\nc')
    expect(() => cleanText(5, 10, 'x')).toThrow()
  })
  it('solo deja pasar enlaces http(s)', () => {
    expect(cleanUrl('https://drive.google.com/x', 'x')).toBe('https://drive.google.com/x')
    for (const u of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'no es url']) expect(() => cleanUrl(u, 'x')).toThrow()
    expect(cleanUrl('', 'x')).toBe('')
  })
  it('normaliza la lista de enlaces', () => {
    expect(cleanLinks('Web | https://a.com\nhttps://b.com')).toBe('Web | https://a.com/\nhttps://b.com/')
    expect(() => cleanLinks('Web | javascript:1')).toThrow()
  })
  it('parseProduct y parseCreative devuelven solo columnas conocidas', () => {
    const p = parseProduct({ ...PRODUCT, hack: 'x', updated_at: 'ya' })
    expect(Object.keys(p)).not.toContain('hack')
    expect(Object.keys(p)).not.toContain('updated_at')
    const c = parseCreative({ product: 'kioscopro', title: 't', id: 99, hack: 1 })
    expect(Object.keys(c)).not.toContain('id')
    expect(Object.keys(c)).not.toContain('hack')
  })
})
