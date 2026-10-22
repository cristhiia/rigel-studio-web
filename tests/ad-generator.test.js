// Generador de publicidad: usa solo el brief, es determinista por semilla y sus
// piezas pasan la validación del servidor.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FORMATS, MAX_PER_RUN, SLOTS, TEMPLATES, TEMPLATE_GROUPS, briefIssues, briefOf, generatePieces, groupOf, videoPrompt } from '../src/lib/adGenerator.js'
import { blockPalette, wrapLines, paletteFor } from '../src/lib/adRender.js'
import { isBlocked, learn, scoreOf, summarize } from '../src/lib/adLearning.js'
import { TEMPLATES as API_TEMPLATES, VIBES, parseCreative } from '../api/_lib/crmAdmin.js'
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
  it('genera la cantidad de ideas pedida (3 variantes cada una), con tope', () => {
    expect(generatePieces(PRODUCT, { kind: 'post', count: 3, seed: 3 }).ideas).toHaveLength(3)
    expect(generatePieces(PRODUCT, { kind: 'post', count: 3, seed: 3 }).pieces).toHaveLength(9)
    expect(generatePieces(PRODUCT, { kind: 'post', count: 99, seed: 3 }).ideas).toHaveLength(MAX_PER_RUN)
    expect(generatePieces(PRODUCT, { kind: 'post', count: 0, seed: 3 }).ideas).toHaveLength(1)
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
    const heads = generatePieces(PRODUCT, { kind: 'post', count: 5, seed: 5 }).ideas.map(i => i.variants[0].layout.headline)
    expect(new Set(heads).size).toBe(5)
  })
  it('cada idea trae 3 variantes con el mismo mensaje: relajada, estándar al medio y alocada', () => {
    for (const kind of Object.keys(FORMATS)) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        for (const idea of generatePieces(PRODUCT, { kind, count: MAX_PER_RUN, seed }).ideas) {
          expect(idea.variants.map(v => v.slot)).toEqual(SLOTS)
          const [calm, std, wild] = idea.variants.map(v => v.layout)
          expect(std.tpl).toBe('clasica')
          expect(TEMPLATE_GROUPS.relajada).toContain(calm.tpl)
          expect(TEMPLATE_GROUPS.alocada).toContain(wild.tpl)
          expect(new Set([calm.tpl, std.tpl, wild.tpl]).size).toBe(3)
          expect(calm.headline).toBe(std.headline)
          expect(wild.headline).toBe(std.headline)
          expect(calm.vibe).toBe('relajada')
          expect(wild.angle).toBe(idea.angle)
        }
      }
    }
  })
  it('los nombres de plantilla y estilo coinciden con los del servidor', () => {
    expect(new Set(TEMPLATES)).toEqual(API_TEMPLATES)
    expect(new Set(SLOTS)).toEqual(VIBES)
  })
  it('los videos traen prompt con el texto exacto y las reglas de seguridad', () => {
    const vs = generatePieces(PRODUCT, { kind: 'video', count: 1, seed: 9 }).pieces
    expect(vs).toHaveLength(3)
    for (const v of vs) {
      expect(v.prompt).toContain(v.layout.headline)
      expect(v.prompt).toContain(PRODUCT.cta)
      expect(v.prompt).toContain('1080×1920')
      expect(v.prompt).toMatch(/No inventes/)
      expect(v.prompt.length).toBeLessThanOrEqual(4000)
    }
    expect(vs[0].prompt).toMatch(/lentas/)
    expect(vs[2].prompt).toMatch(/rebote/)
    expect(new Set(vs.map(v => v.prompt)).size).toBe(3)
    expect(generatePieces(PRODUCT, { kind: 'post', count: 1, seed: 9 }).pieces[0].prompt).toBe('')
  })
  it('videoPrompt escala los segundos con la cantidad de puntos', () => {
    const b = briefOf(PRODUCT)
    const short = videoPrompt(b, { headline: 'A', sub: '', bullets: [], cta: 'X', theme: 'dark', tpl: 'clasica' })
    const long = videoPrompt(b, { headline: 'A', sub: '', bullets: ['1', '2', '3'], cta: 'X', theme: 'dark', tpl: 'clasica' })
    expect(short).toMatch(/de 6 segundos/)
    expect(long).toMatch(/de 15 segundos/)
  })
  it('todas las piezas pasan la validación del servidor', () => {
    for (const kind of Object.keys(FORMATS)) {
      for (const p of generatePieces(PRODUCT, { kind, count: MAX_PER_RUN, seed: 21 }).pieces) {
        const row = parseCreative({ product: 'kioscopro', kind: p.kind, title: p.title, concept: p.concept, caption: p.caption, hashtags: p.hashtags, status: 'listo', layout: p.layout, prompt: p.prompt, tick: 'verde' })
        expect(row.layout).toMatchObject({ headline: p.layout.headline, tpl: p.layout.tpl, vibe: p.slot, angle: p.angle })
        expect(row.tick).toBe('verde')
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
          const b = blockPalette({ theme }, accent, bg)
          expect(ratio(b.block, b.onBlock), `bloque ${theme} ${accent} ${bg}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })
})


describe('aprendizaje', () => {
  const mk = (id, patch = {}, layout = {}) => ({
    id, product_slug: 'kioscopro', kind: 'post', status: 'listo', created_at: '2026-10-21T12:00:00Z',
    tick: null, verdict: null, reach: null, views: null,
    layout: { headline: `h${id}`, tpl: 'clasica', theme: 'dark', angle: 'dolor', ...layout }, ...patch,
  })
  const run = (creatives, opts = {}) => generatePieces(PRODUCT, { kind: 'post', count: MAX_PER_RUN, seed: 7, creatives, ...opts })

  it('sin piezas calificadas no cambia nada y no se declara aprendizaje', () => {
    const r = run([mk(1), mk(2, {}, { tpl: 'cartel' })])
    expect(r.adapted).toBe(false)
    expect(r.learned.rated).toBe(0)
    for (const i of r.ideas) expect(i.variants[1].layout.tpl).toBe('clasica')
  })
  it('puntaje: tick, veredicto y alcance contra la mediana', () => {
    expect(scoreOf(mk(1, { tick: 'verde' }))).toBe(1)
    expect(scoreOf(mk(1, { tick: 'rojo', verdict: 'funciono' }))).toBe(0)
    expect(scoreOf(mk(1, { reach: 300 }), 100)).toBe(1)
    expect(scoreOf(mk(1, { reach: 50 }), 100)).toBe(-0.5)
    expect(scoreOf(mk(1, { reach: 50 }), 0)).toBe(0)
  })
  it('un estilo con ticks verdes pasa a ser el de la variante estándar', () => {
    const greens = [1, 2, 3].map(i => mk(i, { tick: 'verde' }, { tpl: 'cartel', theme: 'accent' }))
    const r = run(greens)
    expect(r.adapted).toBe(true)
    for (const idea of r.ideas) {
      expect(idea.variants[1].layout).toMatchObject({ tpl: 'cartel', theme: 'accent' })
      expect(groupOf(idea.variants[1].layout.tpl)).toBe('alocada')
      expect(new Set(idea.variants.map(v => v.layout.tpl)).size).toBe(3)
    }
    expect(summarize(learn(greens, { slug: 'kioscopro', kind: 'post' })).likes.map(l => l.trait)).toContain('tpl:cartel')
  })
  it('un estilo con tick rojo se evita y la pieza exacta no se repite', () => {
    const base = run([])
    const first = base.ideas[0].variants[2].layout
    const red = mk(1, { tick: 'rojo' }, { tpl: first.tpl, theme: first.theme, angle: first.angle, headline: first.headline })
    const learned = learn([red], { slug: 'kioscopro', kind: 'post' })
    expect(isBlocked(learned, first)).toBe(true)
    expect(isBlocked(learned, { ...first, theme: first.theme === 'dark' ? 'light' : 'dark' })).toBe(false)
    expect(isBlocked(learn([red, { ...red, id: 2, tick: 'verde' }], { slug: 'kioscopro', kind: 'post' }), first)).toBe(false)
    const again = run([red])
    const repeated = again.pieces.some(p => p.layout.tpl === first.tpl && p.layout.theme === first.theme && p.layout.headline === first.headline)
    expect(repeated).toBe(false)
  })
  it('aprende por producto y por tipo; reiniciar ignora lo anterior', () => {
    const greens = [1, 2, 3].map(i => mk(i, { tick: 'verde' }, { tpl: 'diagonal', theme: 'light' }))
    expect(run(greens, { creatives: greens.map(c => ({ ...c, product_slug: 'otro' })) }).adapted).toBe(false)
    expect(run(greens.map(c => ({ ...c, kind: 'historia' }))).adapted).toBe(false)
    expect(run(greens, { since: '2026-10-22T00:00:00Z' }).adapted).toBe(false)
    expect(run(greens, { since: '2026-10-21T00:00:00Z' }).adapted).toBe(true)
  })
  it('el alcance cuenta: lo que alcanzó más que la mediana suma, lo que alcanzó menos resta', () => {
    const published = [
      mk(1, { status: 'publicado', reach: 100 }, { tpl: 'clasica' }),
      mk(2, { status: 'publicado', reach: 120 }, { tpl: 'minimal' }),
      mk(3, { status: 'publicado', reach: 110 }, { tpl: 'aireada' }),
      mk(4, { status: 'publicado', reach: 900 }, { tpl: 'bloques', theme: 'accent' }),
      mk(5, { status: 'publicado', reach: 10 }, { tpl: 'cartel', theme: 'light' }),
    ]
    const l = learn(published, { slug: 'kioscopro', kind: 'post' })
    expect(l.traits.get('tpl:bloques').sum).toBeGreaterThan(0)
    expect(l.traits.get('tpl:cartel').sum).toBeLessThan(0)
  })
  it('lo generado con aprendizaje sigue usando solo texto del brief', () => {
    const greens = [1, 2, 3].map(i => mk(i, { tick: 'verde' }, { tpl: 'bloques', theme: 'dark' }))
    for (const p of run(greens).pieces) {
      for (const text of [p.layout.headline, p.layout.sub, ...p.layout.bullets]) expect(ALLOWED.has(text), text).toBe(true)
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
  it('guarda tick, devuelve el id, cambia solo el tick y reinicia lo aprendido', async () => {
    await call(crm, act({ action: 'product_save', slug: 'kioscopro', name: 'KioscoPro', pains: 'a', benefits: 'b\nc', cta: 'x', audience: 'y' }))
    const [p] = generatePieces(PRODUCT, { kind: 'post', count: 1, seed: 4 }).pieces
    const saved = await call(crm, act({ action: 'creative_save', product: 'kioscopro', kind: 'post', title: p.title, layout: p.layout, tick: 'verde' }))
    expect(saved.statusCode).toBe(200)
    expect(Number.isInteger(saved.body.id)).toBe(true)
    const ticked = await call(crm, act({ action: 'creative_tick', id: saved.body.id, tick: 'rojo' }))
    expect(ticked.statusCode).toBe(200)
    let res = await call(crm, { method: 'GET', query: {}, headers: { ...AUTH, 'x-forwarded-for': freshIp() } })
    expect(res.body.creatives[0]).toMatchObject({ tick: 'rojo', title: p.title })
    expect(res.body.creatives[0].layout.tpl).toBe(p.layout.tpl)
    await call(crm, act({ action: 'creative_tick', id: saved.body.id, tick: '' }))
    res = await call(crm, { method: 'GET', query: {}, headers: { ...AUTH, 'x-forwarded-for': freshIp() } })
    expect(res.body.creatives[0].tick).toBeNull()
    expect((await call(crm, act({ action: 'creative_tick', id: saved.body.id, tick: 'azul' }))).statusCode).toBe(400)
    expect((await call(crm, act({ action: 'creative_save', product: 'kioscopro', title: 't', tick: 'azul' }))).statusCode).toBe(400)
    expect((await call(crm, act({ action: 'creative_save', product: 'kioscopro', title: 't', layout: { headline: 'x', tpl: 'raro' } }))).statusCode).toBe(400)
    expect((await call(crm, act({ action: 'learning_reset', product: 'kioscopro' }))).statusCode).toBe(200)
    res = await call(crm, { method: 'GET', query: {}, headers: { ...AUTH, 'x-forwarded-for': freshIp() } })
    expect(typeof res.body.products[0].learning_since).toBe('string')
    expect((await call(crm, act({ action: 'learning_reset', product: 'no-existe' }))).statusCode).toBe(400)
  })
})
