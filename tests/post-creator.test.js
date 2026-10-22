// Creador de posts: mapa de dolor → conceptos distintos (tipo de mensaje × cliente),
// texto del posteo, hashtags (máx. 5), prompt para Claude y la línea semanal.
import { describe, expect, it } from 'vitest'
import {
  CONCEPTS, MAX_HASHTAGS, MAX_PER_RUN, conceptCode, conceptsFor, briefOf, generatePieces, hashtagPool, hashtagsFor, painMapOf,
} from '../src/lib/adGenerator.js'
import { labelOf, learn, traitsOf } from '../src/lib/adLearning.js'
import { cleanLayout, cleanPainMap, parseCreative, parseProduct } from '../api/_lib/crmAdmin.js'

const MAP = {
  personas: [
    { name: 'quienes llegan a fin de mes sin saber en qué gastaron', pain: 'Llegás a fin de mes y no sabés a dónde se fue la plata.', promise: 'Sabés en qué gastás, sin planillas.', proof: '', objection: '¿Otra app más? Ya las dejé todas.', answer: 'Anotás un gasto en dos toques y el reporte se arma solo.' },
    { name: 'quienes ahorran y ven cómo la inflación se lo come', pain: 'La inflación te licúa lo que ahorrás.', promise: 'Simulá cuánto crece tu ahorro con interés compuesto.', proof: '', objection: '', answer: '' },
    { name: 'quienes probaron planillas y las abandonaron', pain: 'Las planillas de gastos las abandonás a la semana.', promise: 'Reportes claros de en qué se te va la plata.', proof: 'Caso real cargado a mano', objection: '', answer: '' },
  ],
  belief: 'Ordenar la plata no es anotar cada peso.',
  story: '',
  math: '',
}
const PRODUCT = {
  slug: 'keelwise', name: 'Keelwise', tagline: 'Finanzas personales para Argentina, con reportes claros de tu plata',
  audience: 'argentinos que quieren ordenar su plata sin planillas',
  pains: 'Llegás a fin de mes y no sabés a dónde se fue la plata.\nLa inflación te licúa lo que ahorrás.',
  benefits: 'Sabés en qué gastás, sin planillas.\nReportes claros de en qué se te va la plata.\nTus datos quedan en tu celular.',
  features: 'Reportes de tus gastos\nPuerto Seguro (meta de ahorro configurable)\nLista de compras',
  cta: 'Sumate al acceso anticipado', tone: 'directo', hashtags: '#finanzaspersonales #ahorro #argentina #keelwise #sanjuan #inflacion #plata',
  accent: '#6aa7ff', bg: '#0b1530', motif: 'nautico', pain_map: MAP,
}
// Todo texto que aparece en una pieza tiene que venir de la ficha (o ser un conector fijo).
const FROM_FICHA = new Set([
  ...MAP.personas.flatMap(p => Object.values(p)), MAP.belief,
  ...PRODUCT.benefits.split('\n'), ...PRODUCT.features.split('\n'), PRODUCT.tagline, PRODUCT.cta,
  ...MAP.personas.map(p => `Para ${p.name}`), 'Así funciona', '',
])

describe('mapa de dolor en la API', () => {
  it('limpia y valida clientes y textos de marca', () => {
    const m = cleanPainMap({ personas: [{ name: '  quienes  venden ', pain: 'a', promise: 'b' }], belief: 'x', story: 'línea 1\nlínea 2', math: '' })
    expect(m.personas[0]).toEqual({ name: 'quienes venden', pain: 'a', promise: 'b', proof: '', objection: '', answer: '' })
    expect(m.story).toBe('línea 1\nlínea 2')
    expect(cleanPainMap(undefined)).toEqual({})
  })
  it('rechaza formas inválidas', () => {
    expect(() => cleanPainMap('hola')).toThrow()
    expect(() => cleanPainMap({ personas: Array.from({ length: 5 }, () => ({ name: 'x' })) })).toThrow(/hasta 4/)
    expect(() => cleanPainMap({ personas: [{ pain: 'sin nombre' }] })).toThrow(/para quién/)
    expect(() => cleanPainMap({ personas: [{ name: 'x', objection: '¿y?' }] })).toThrow(/respuesta/)
    expect(() => cleanPainMap({ personas: [{ name: 'x', pain: 'a'.repeat(121) }] })).toThrow(/120/)
    expect(() => cleanPainMap({ belief: 'a'.repeat(121) })).toThrow()
  })
  it('la ficha guarda el mapa solo si viene', () => {
    const base = { slug: 'keelwise', name: 'Keelwise' }
    expect(parseProduct(base)).not.toHaveProperty('pain_map')
    expect(parseProduct({ ...base, pain_map: MAP }).pain_map.personas).toHaveLength(3)
  })
  it('el diseño acepta el cliente al que le habla la pieza', () => {
    expect(cleanLayout({ headline: 'h', persona: 2 }).persona).toBe(2)
    expect(cleanLayout({ headline: 'h' }).persona).toBeNull()
    expect(() => cleanLayout({ headline: 'h', persona: 7 })).toThrow()
    expect(() => cleanLayout({ headline: 'h', persona: '1' })).toThrow()
  })
})

describe('conceptos', () => {
  it('el mapa se lee con la posición original de cada cliente', () => {
    const m = painMapOf({ pain_map: { personas: [{ name: '' }, { name: 'b', pain: 'p' }] } })
    expect(m.personas).toEqual([expect.objectContaining({ index: 1, name: 'b' })])
    expect(painMapOf({}).personas).toEqual([])
  })
  it('avisa qué tipos de mensaje faltan y por qué', () => {
    const { usesMap, locked } = conceptsFor(briefOf(PRODUCT))
    expect(usesMap).toBe(true)
    expect(locked.map(l => l.id).sort()).toEqual(['cuenta', 'fundador'])
    for (const l of locked) expect(l.needs).toBeTruthy()
  })
  it('una tanda no repite la combinación tipo × cliente mientras queden sin usar', () => {
    const total = conceptsFor(briefOf(PRODUCT)).available.length
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const ideas = generatePieces(PRODUCT, { kind: 'post', count: MAX_PER_RUN, seed }).ideas
      expect(ideas).toHaveLength(MAX_PER_RUN)
      expect(new Set(ideas.map(i => i.code)).size).toBe(Math.min(MAX_PER_RUN, total))
      // Con 6 tipos disponibles y 5 ideas, ninguno se repite.
      expect(new Set(ideas.map(i => i.angle)).size).toBe(MAX_PER_RUN)
    }
  })
  it('con pocos datos no repite un concepto mientras haya otro sin usar', () => {
    const thin = { ...PRODUCT, features: '', pain_map: { personas: MAP.personas.map(p => ({ name: p.name, pain: p.pain, promise: p.promise })) } }
    for (const seed of [1, 2, 3]) {
      const codes = generatePieces(thin, { kind: 'post', count: MAX_PER_RUN, seed }).ideas.map(i => i.code)
      expect(new Set(codes).size).toBe(5)
    }
  })
  it('la línea alterna problema → salida → confianza y reparte lunes, miércoles y viernes', () => {
    const ideas = generatePieces(PRODUCT, { kind: 'post', count: MAX_PER_RUN, seed: 4 }).ideas
    const stage = Object.fromEntries(CONCEPTS.map(c => [c.id, c.stage]))
    expect(stage[ideas[0].angle]).toBe(1)
    expect(stage[ideas[1].angle]).toBe(2)
    expect(stage[ideas[2].angle]).toBe(3)
    expect(ideas.map(i => i.plan)).toEqual(['Semana 1 · lunes', 'Semana 1 · miércoles', 'Semana 1 · viernes', 'Semana 2 · lunes', 'Semana 2 · miércoles'])
  })
  it('no inventa: titular, bajada y puntos salen de la ficha', () => {
    for (const kind of ['post', 'historia', 'video']) {
      for (const seed of [1, 2, 3]) {
        for (const p of generatePieces(PRODUCT, { kind, count: MAX_PER_RUN, seed }).pieces) {
          for (const t of [p.layout.headline, p.layout.sub, p.layout.cta, ...p.layout.bullets]) expect(FROM_FICHA.has(t), t).toBe(true)
        }
      }
    }
  })
  it('las 3 versiones de un concepto comparten texto del posteo y código', () => {
    for (const idea of generatePieces(PRODUCT, { kind: 'post', count: 3, seed: 2 }).ideas) {
      expect(new Set(idea.variants.map(v => v.caption)).size).toBe(1)
      expect(new Set(idea.variants.map(v => conceptCode(v.layout))).size).toBe(1)
      expect(conceptCode(idea.variants[0].layout)).toBe(idea.code)
    }
  })
  it('todas las piezas pasan la validación del servidor con el cliente incluido', () => {
    for (const kind of ['post', 'historia', 'video']) {
      for (const p of generatePieces(PRODUCT, { kind, count: MAX_PER_RUN, seed: 9 }).pieces) {
        const row = parseCreative({ product: 'keelwise', kind: p.kind, title: p.title, concept: p.concept, caption: p.caption, hashtags: p.hashtags, status: 'listo', layout: p.layout, prompt: p.prompt })
        expect(row.layout.persona).toBe(p.layout.persona)
        expect(row.layout.angle).toBe(p.angle)
      }
    }
  })
  it('sin mapa de dolor sigue andando con el brief', () => {
    const r = generatePieces({ ...PRODUCT, pain_map: {} }, { kind: 'post', count: 3, seed: 1 })
    expect(r.usesMap).toBe(false)
    expect(r.ideas).toHaveLength(3)
    expect(r.ideas.every(i => i.persona === null)).toBe(true)
  })
})

describe('texto del posteo, hashtags y prompt', () => {
  it('el texto va de gancho a llamado a la acción', () => {
    for (const idea of generatePieces(PRODUCT, { kind: 'post', count: MAX_PER_RUN, seed: 5 }).ideas) {
      const cap = idea.caption
      expect(cap.startsWith(idea.variants[1].layout.headline)).toBe(true)
      expect(cap.endsWith(`→ ${PRODUCT.cta}`)).toBe(true)
      expect(cap.length).toBeLessThanOrEqual(2200)
    }
  })
  it('hashtags: como mucho 5, sin repetidos, siempre el de la marca, y rotan entre ideas', () => {
    expect(hashtagPool('#a1 a2, #A1 ##b3 c-4 #ñandú')).toEqual(['#a1', '#a2', '#b3', '#ñandú'])
    const b = briefOf(PRODUCT)
    const sets = [0, 1, 2, 3].map(i => hashtagsFor(b, i).split(' '))
    for (const s of sets) {
      expect(s.length).toBeLessThanOrEqual(MAX_HASHTAGS)
      expect(new Set(s).size).toBe(s.length)
      expect(s).toContain('#keelwise')
    }
    expect(new Set(sets.map(s => s.join(' '))).size).toBeGreaterThan(1)
    expect(hashtagsFor(briefOf({ ...PRODUCT, hashtags: '#uno #dos' }), 3)).toBe('#uno #dos')
  })
  it('el prompt para Claude trae el material del concepto y prohíbe inventar', () => {
    const ideas = generatePieces(PRODUCT, { kind: 'post', count: MAX_PER_RUN, seed: 6 }).ideas
    const obj = ideas.find(i => i.angle === 'objecion')
    expect(obj).toBeTruthy()
    expect(obj.copyPrompt).toContain(MAP.personas[0].objection)
    expect(obj.copyPrompt).toContain(MAP.personas[0].answer)
    expect(obj.copyPrompt).toMatch(/No inventes/)
    expect(obj.copyPrompt).toMatch(/como mucho 5 hashtags/)
    expect(obj.copyPrompt).toContain('voseo')
    for (const i of ideas) expect(i.copyPrompt.length).toBeLessThan(4000)
    expect(generatePieces(PRODUCT, { kind: 'historia', count: 1, seed: 1 }).ideas[0].copyPrompt).toBe('')
  })
})

describe('aprendizaje por concepto', () => {
  it('cada pieza suma también a su concepto', () => {
    expect(traitsOf({ tpl: 'arco', theme: 'dark', angle: 'dolor', persona: 1 })).toContain('concept:dolor-c2')
    expect(traitsOf({ tpl: 'arco', theme: 'dark', angle: 'dolor' })).not.toContain('concept:dolor-c2')
    expect(labelOf('concept:objecion-c1')).toBe('romper objeciones para el cliente 1')
    const rows = [{ product_slug: 'keelwise', kind: 'post', created_at: '2026-10-22T00:00:00Z', tick: 'verde', layout: { tpl: 'arco', theme: 'dark', angle: 'dolor', persona: 0, headline: 'h' } }]
    expect(learn(rows, { slug: 'keelwise', kind: 'post' }).traits.get('concept:dolor-c1')).toEqual({ sum: 1, n: 1 })
  })
})
