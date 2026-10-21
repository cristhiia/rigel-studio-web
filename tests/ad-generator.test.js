// Generador de publicidad: usa solo el brief, es determinista por semilla y sus
// piezas pasan la validación del servidor.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FORMATS, MAX_PER_RUN, briefIssues, briefOf, generatePieces, videoPrompt } from '../src/lib/adGenerator.js'
import { wrapLines, paletteFor } from '../src/lib/adRender.js'
import { parseCreative } from '../api/_lib/crmAdmin.js'
import { call, freshIp, get, setup } from './helpers/harness.js'
import crm from '../api/admin/crm.js'

const PRODUCT = {
  slug: 'kioscopro', name: 'KioscoPro', tagline: 'Caja, stock y precios para kioscos',
  audience: 'Dueños de kioscos', pains: 'Cerrás la caja y la plata no cierra.\nActualizar precios te lleva horas.',
  benefits: 'Vendé rápido.\nStock al día.\nSabés qué comprar.', features: 'Caja\nStock',
  cta: 'Probalo en tu kiosco', tone: 'simple', hashtags: '#kiosco', accent: '#ffb703', bg: '#1b263b',
}
const ALLOWED = new Set([
  ...PRODUCT.pains.split('\n'), ...PRODUCT.benefits.split('\n'), ...PRODUCT.features.split('\n'),
  PRODUCT.tagline, PRODUCT.cta, 'Así funciona', 'Hecho para dueños de kioscos', 'Para dueños de kioscos', '',
])

describe('brief', () => {
  it('pide lo mínimo para generar', () => {
    expect(briefIssues(briefOf({ ...PRODUCT, benefits: '', cta: '' }))).toHaveLength(2)
    expect(briefIssues(briefOf(PRODUCT))).toEqual([])
    const r = generatePieces({ ...PRODUCT, benefits: 'uno' }, { kind: 'post', count: 3, seed: 1 })
    expect(r.pieces).toEqual([])
    expect(r.issues.length).toBeGreaterThan(0)
  })
  it('usa colores por defecto si los del producto no son válidos', () => {
    const b = briefOf({ ...PRODUCT, accent: 'rojo', bg: '' })
    expect(b.accent).toMatch(/^#[0-9a-f]{6}$/i)
    expect(b.bg).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

describe('generatePieces', () => {
  it('genera la cantidad pedida, con tope', () => {
    expect(generatePieces(PRODUCT, { kind: 'post', count: 5, seed: 3 }).pieces).toHaveLength(5)
    expect(generatePieces(PRODUCT, { kind: 'post', count: 99, seed: 3 }).pieces).toHaveLength(MAX_PER_RUN)
    expect(generatePieces(PRODUCT, { kind: 'post', count: 0, seed: 3 }).pieces).toHaveLength(1)
    expect(() => generatePieces(PRODUCT, { kind: 'reel' })).toThrow()
  })
  it('es determinista por semilla y cambia con otra', () => {
    const a = generatePieces(PRODUCT, { kind: 'post', count: 5, seed: 11 }).pieces
    const b = generatePieces(PRODUCT, { kind: 'post', count: 5, seed: 11 }).pieces
    const c = generatePieces(PRODUCT, { kind: 'post', count: 5, seed: 12 }).pieces
    expect(a).toEqual(b)
    expect(a.map(p => p.title)).not.toEqual(c.map(p => p.title))
  })
  it('no inventa texto: titular, bajada y puntos salen del brief', () => {
    for (const kind of Object.keys(FORMATS)) {
      for (const seed of [1, 2, 3, 4]) {
        for (const p of generatePieces(PRODUCT, { kind, count: MAX_PER_RUN, seed }).pieces) {
          for (const text of [p.layout.headline, p.layout.sub, ...p.layout.bullets]) expect(ALLOWED.has(text), text).toBe(true)
          expect(p.layout.cta).toBe(PRODUCT.cta)
        }
      }
    }
  })
  it('una tanda no repite el mismo titular salvo que se agoten los ángulos', () => {
    const heads = generatePieces(PRODUCT, { kind: 'post', count: 5, seed: 5 }).pieces.map(p => p.layout.headline)
    expect(new Set(heads).size).toBe(5)
  })
  it('los videos traen prompt con el texto exacto y las reglas de seguridad', () => {
    const [v] = generatePieces(PRODUCT, { kind: 'video', count: 1, seed: 9 }).pieces
    expect(v.prompt).toContain(v.layout.headline)
    expect(v.prompt).toContain(PRODUCT.cta)
    expect(v.prompt).toContain('1080×1920')
    expect(v.prompt).toMatch(/No inventes/)
    expect(v.prompt.length).toBeLessThanOrEqual(4000)
    expect(generatePieces(PRODUCT, { kind: 'post', count: 1, seed: 9 }).pieces[0].prompt).toBe('')
  })
  it('videoPrompt escala los segundos con la cantidad de puntos', () => {
    const b = briefOf(PRODUCT)
    const short = videoPrompt(b, { headline: 'A', sub: '', bullets: [], cta: 'X', theme: 'dark' })
    const long = videoPrompt(b, { headline: 'A', sub: '', bullets: ['1', '2', '3'], cta: 'X', theme: 'dark' })
    expect(short).toMatch(/de 6 segundos/)
    expect(long).toMatch(/de 15 segundos/)
  })
  it('todas las piezas pasan la validación del servidor', () => {
    for (const kind of Object.keys(FORMATS)) {
      for (const p of generatePieces(PRODUCT, { kind, count: MAX_PER_RUN, seed: 21 }).pieces) {
        const row = parseCreative({ product: 'kioscopro', kind: p.kind, title: p.title, concept: p.concept, caption: p.caption, hashtags: p.hashtags, status: 'listo', layout: p.layout, prompt: p.prompt })
        expect(row.layout.headline).toBe(p.layout.headline)
      }
    }
  })
  it('recorta textos largos del brief sin romper la validación', () => {
    const long = { ...PRODUCT, pains: 'palabra '.repeat(60).trim(), benefits: `${'beneficio '.repeat(30).trim()}\n${'otro '.repeat(40).trim()}`, tagline: 'x '.repeat(200).trim() }
    for (const p of generatePieces(long, { kind: 'post', count: 5, seed: 2 }).pieces) {
      expect(() => parseCreative({ product: 'kioscopro', title: p.title, caption: p.caption, layout: p.layout })).not.toThrow()
    }
  })
})

describe('dibujo', () => {
  it('wrapLines respeta el ancho', () => {
    const measure = t => t.length * 10
    const ls = wrapLines(measure, 'uno dos tres cuatro cinco', 100)
    expect(ls.every(l => measure(l) <= 100)).toBe(true)
    expect(ls.join(' ')).toBe('uno dos tres cuatro cinco')
    expect(wrapLines(measure, '', 100)).toEqual([])
  })
  it('el texto siempre contrasta con el fondo', () => {
    const lum = hex => {
      const n = parseInt(hex.slice(1), 16)
      const f = v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
      return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
    }
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
    for (const accent of ['#ffb703', '#6aa7ff', '#7dd3a8', '#e63946', '#2a9d8f']) {
      for (const bg of ['#0b1530', '#1b263b', '#f4f4f4']) {
        for (const theme of ['dark', 'accent', 'light']) {
          const p = paletteFor({ theme }, accent, bg)
          expect(ratio(p.bg, p.fg), `${theme} ${accent} ${bg}`).toBeGreaterThanOrEqual(4.5)
          expect(ratio(p.pillBg, p.pillFg), `pill ${theme} ${accent} ${bg}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })
})

describe('guardado en el servidor', () => {
  let t
  beforeEach(() => { t = setup() })
  afterEach(() => t.cleanup())
  const AUTH = { authorization: 'Bearer tok-admin' }
  const act = body => ({ method: 'POST', body, query: {}, headers: { ...AUTH, 'x-forwarded-for': freshIp() } })

  it('guarda y devuelve layout y prompt; rechaza diseños inválidos', async () => {
    await call(crm, act({ action: 'product_save', slug: 'kioscopro', name: 'KioscoPro', accent: '#FFB703', bg: '#1b263b', pains: 'a', benefits: 'b\nc', cta: 'x', audience: 'y', tone: 'z', hashtags: '#k' }))
    const [p] = generatePieces(PRODUCT, { kind: 'video', count: 1, seed: 4 }).pieces
    const ok = await call(crm, act({ action: 'creative_save', product: 'kioscopro', kind: 'video', title: p.title, layout: p.layout, prompt: p.prompt, status: 'listo' }))
    expect(ok.statusCode).toBe(200)
    const res = await call(crm, { method: 'GET', query: {}, headers: { ...AUTH, 'x-forwarded-for': freshIp() } })
    expect(res.body.products[0]).toMatchObject({ accent: '#ffb703', bg: '#1b263b', cta: 'x' })
    expect(res.body.creatives[0].layout.headline).toBe(p.layout.headline)
    expect(res.body.creatives[0].prompt).toBe(p.prompt)
    for (const layout of [{ headline: '' }, { headline: 'x', theme: 'neon' }, { headline: 'x', bullets: ['1', '2', '3', '4', '5'] }, 'texto', []]) {
      expect((await call(crm, act({ action: 'creative_save', product: 'kioscopro', title: 't', layout }))).statusCode).toBe(400)
    }
    for (const bad of [{ accent: 'rojo' }, { bg: '#12345' }, { cta: 'x'.repeat(101) }]) {
      expect((await call(crm, act({ action: 'product_save', slug: 'otro-prod', name: 'Otro', ...bad }))).statusCode).toBe(400)
    }
  })
})
