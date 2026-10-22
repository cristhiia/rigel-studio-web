// CRM de Rigel Studio: fichas de producto, bitácora y piezas de publicidad.
//
// Mismas reglas de acceso que el resto del panel (sesión de Supabase con
// email verificado dentro de ADMIN_EMAILS; cualquier otro caso es 404).
// Nada se publica ni se conecta a redes: las métricas de las piezas las
// carga una persona a mano.
import { BillingError, allow, deps, normalizeEmail } from './billing.js'
import { bad, guard, isPlainObject, limiters } from './billingAdmin.js'
import { hashKey, logSafe, send } from './http.js'

export const PRODUCT_STATUS = new Set(['idea', 'desarrollo', 'beta', 'vendiendo', 'pausado', 'archivado'])
export const LOG_KINDS = new Set(['avance', 'decision', 'nota'])
export const CREATIVE_KINDS = new Set(['post', 'video', 'historia', 'otro'])
export const CREATIVE_STATUS = new Set(['idea', 'listo', 'publicado', 'descartado'])
export const PLATFORMS = new Set(['instagram', 'facebook', 'tiktok', 'otro'])
export const VERDICTS = new Set(['funciono', 'no_funciono'])
export const METRICS = ['reach', 'views', 'likes', 'comments', 'saves', 'shares', 'clicks', 'conversions']

export const THEMES = new Set(['dark', 'accent', 'light'])
// Rasgos de diseño de cada pieza (los usa el aprendizaje de estilos).
export const TEMPLATES = new Set(['clasica', 'tarjeta', 'columna', 'aireada', 'minimal', 'marco', 'tipografico', 'cartel', 'bloques', 'diagonal', 'circulo', 'franjas'])
export const VIBES = new Set(['relajada', 'estandar', 'alocada'])
export const TICKS = new Set(['verde', 'rojo'])
const HEX_RE = /^#[0-9a-fA-F]{6}$/
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,39}$/
const METRIC_MAX = 1_000_000_000
const MONEY_MAX = 2_000_000_000

const fail = message => { throw new BillingError(400, message) }

// Texto del usuario: sin caracteres de control. Una línea (se juntan los
// espacios) o varias (se conservan los saltos de línea).
export function cleanText(raw, max, label, { multiline = false, required = false } = {}) {
  if (raw === undefined || raw === null) raw = ''
  if (typeof raw !== 'string') fail(`${label}: tiene que ser texto`)
  /* eslint-disable no-control-regex */
  let text = raw.replace(/\r\n?/g, '\n')
  text = multiline
    ? text.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
    : text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ')
  /* eslint-enable no-control-regex */
  text = text.trim()
  if (text.length > max) fail(`${label}: admite hasta ${max} caracteres`)
  if (required && !text) fail(`${label} es obligatorio`)
  return text
}

// Solo http(s): el valor termina en un href y "javascript:" no puede pasar.
export function cleanUrl(raw, label) {
  const text = cleanText(raw, 500, label)
  if (!text) return ''
  let url
  try { url = new URL(text) } catch { fail(`${label}: no es un enlace válido`) }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') fail(`${label}: tiene que empezar con https://`)
  return url.toString()
}

// Una línea por enlace: "Etiqueta | https://…" (o solo la URL).
export function cleanLinks(raw) {
  const text = cleanText(raw, 2000, 'Enlaces', { multiline: true })
  if (!text) return ''
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const i = line.lastIndexOf('|')
    const label = i === -1 ? '' : line.slice(0, i).trim()
    const url = cleanUrl(i === -1 ? line : line.slice(i + 1).trim(), 'Enlace')
    if (!url) fail('Enlace vacío')
    return label ? `${label} | ${url}` : url
  }).join('\n')
}

function cleanHex(raw, label) {
  if (raw === undefined || raw === null || raw === '') return ''
  if (typeof raw !== 'string' || !HEX_RE.test(raw.trim())) fail(`${label}: usá el formato #RRGGBB`)
  return raw.trim().toLowerCase()
}

// Datos para volver a dibujar una pieza (post / historia) desde el panel.
export function cleanLayout(raw) {
  if (raw === undefined || raw === null) return null
  if (!isPlainObject(raw)) fail('Diseño inválido')
  const bullets = raw.bullets === undefined || raw.bullets === null ? [] : raw.bullets
  if (!Array.isArray(bullets) || bullets.length > 4) fail('Diseño: hasta 4 puntos')
  return {
    headline: cleanText(raw.headline, 120, 'Titular', { required: true }),
    sub: cleanText(raw.sub, 200, 'Bajada'),
    bullets: bullets.map(b => cleanText(b, 90, 'Punto', { required: true })),
    cta: cleanText(raw.cta, 80, 'Llamado a la acción'),
    theme: oneOf(raw.theme, THEMES, 'Tema', 'dark'),
    tpl: oneOf(raw.tpl, TEMPLATES, 'Plantilla', 'clasica'),
    vibe: oneOf(raw.vibe, VIBES, 'Estilo', 'estandar'),
    angle: raw.angle === undefined || raw.angle === null || raw.angle === '' ? '' : (typeof raw.angle === 'string' && /^[a-z-]{1,20}$/.test(raw.angle) ? raw.angle : fail('Ángulo inválido')),
  }
}

function cleanInt(raw, max, label, { nullable = false } = {}) {
  if (raw === undefined || raw === null || raw === '') {
    if (nullable) return null
    return 0
  }
  const n = typeof raw === 'string' && /^\d{1,12}$/.test(raw.trim()) ? Number(raw.trim()) : raw
  if (!Number.isInteger(n) || n < 0 || n > max) fail(`${label}: tiene que ser un número entero entre 0 y ${max.toLocaleString('es-AR')}`)
  return n
}

function oneOf(raw, set, label, fallback) {
  if (raw === undefined || raw === null || raw === '') return fallback
  if (typeof raw !== 'string' || !set.has(raw)) fail(`${label} inválido`)
  return raw
}

function cleanDate(raw, label) {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) fail(`${label}: formato AAAA-MM-DD`)
  const d = new Date(`${raw}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) fail(`${label}: fecha inválida`)
  return raw
}

export function parseProduct(body) {
  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  if (!SLUG_RE.test(slug)) fail('El identificador usa letras minúsculas, números y guiones (2 a 40)')
  let billingSlug = null
  if (body.billing_slug !== undefined && body.billing_slug !== null && body.billing_slug !== '') {
    if (typeof body.billing_slug !== 'string' || !SLUG_RE.test(body.billing_slug)) fail('Producto de cobro inválido')
    billingSlug = body.billing_slug
  }
  const sort = body.sort_order === undefined ? 100 : cleanInt(body.sort_order, 1000, 'Orden')
  return {
    slug,
    name: cleanText(body.name, 60, 'Nombre', { required: true }),
    tagline: cleanText(body.tagline, 140, 'Descripción corta'),
    status: oneOf(body.status, PRODUCT_STATUS, 'Estado', 'idea'),
    phase: cleanText(body.phase, 80, 'Fase'),
    pricing: cleanText(body.pricing, 200, 'Modelo de cobro'),
    how_it_works: cleanText(body.how_it_works, 4000, 'Cómo funciona', { multiline: true }),
    features: cleanText(body.features, 4000, 'Funciones', { multiline: true }),
    next_steps: cleanText(body.next_steps, 4000, 'Próximos pasos', { multiline: true }),
    competition: cleanText(body.competition, 4000, 'Competencia', { multiline: true }),
    brand_brief: cleanText(body.brand_brief, 4000, 'Brief para publicidad', { multiline: true }),
    links: cleanLinks(body.links),
    audience: cleanText(body.audience, 300, 'Público'),
    pains: cleanText(body.pains, 1500, 'Dolores', { multiline: true }),
    benefits: cleanText(body.benefits, 1500, 'Beneficios', { multiline: true }),
    cta: cleanText(body.cta, 100, 'Llamado a la acción'),
    tone: cleanText(body.tone, 200, 'Tono'),
    hashtags: cleanText(body.hashtags, 300, 'Hashtags base'),
    accent: cleanHex(body.accent, 'Color de acento'),
    bg: cleanHex(body.bg, 'Color de fondo'),
    billing_slug: billingSlug,
    manual_users: cleanInt(body.manual_users, 10_000_000, 'Usuarios'),
    manual_mrr_ars: cleanInt(body.manual_mrr_ars, MONEY_MAX, 'Ingreso mensual'),
    sort_order: sort,
  }
}

export function parseLog(body) {
  const slug = typeof body.product === 'string' ? body.product : ''
  if (!SLUG_RE.test(slug)) fail('Producto inválido')
  return {
    product_slug: slug,
    kind: oneOf(body.kind, LOG_KINDS, 'Tipo', 'avance'),
    text: cleanText(body.text, 600, 'El texto', { required: true }),
  }
}

export function parseCreative(body) {
  const slug = typeof body.product === 'string' ? body.product : ''
  if (!SLUG_RE.test(slug)) fail('Producto inválido')
  const row = {
    product_slug: slug,
    kind: oneOf(body.kind, CREATIVE_KINDS, 'Tipo', 'post'),
    title: cleanText(body.title, 120, 'El título', { required: true }),
    concept: cleanText(body.concept, 1500, 'La idea', { multiline: true }),
    caption: cleanText(body.caption, 2200, 'El texto', { multiline: true }),
    hashtags: cleanText(body.hashtags, 500, 'Los hashtags'),
    media_url: cleanUrl(body.media_url, 'Enlace al archivo'),
    status: oneOf(body.status, CREATIVE_STATUS, 'Estado', 'idea'),
    platform: oneOf(body.platform, PLATFORMS, 'Red', 'instagram'),
    published_on: cleanDate(body.published_on, 'Fecha de publicación'),
    verdict: oneOf(body.verdict, VERDICTS, 'Veredicto', null),
    tick: oneOf(body.tick, TICKS, 'Tick', null),
    learnings: cleanText(body.learnings, 1000, 'Aprendizajes', { multiline: true }),
    layout: cleanLayout(body.layout),
    prompt: cleanText(body.prompt, 4000, 'El prompt', { multiline: true }),
    spend_ars: cleanInt(body.spend_ars, MONEY_MAX, 'Gasto', { nullable: true }),
  }
  for (const m of METRICS) row[m] = cleanInt(body[m], METRIC_MAX, m, { nullable: true })
  return row
}

function idOf(raw) {
  const n = typeof raw === 'string' && /^\d{1,12}$/.test(raw) ? Number(raw) : raw
  if (!Number.isSafeInteger(n) || n < 1) fail('Identificador inválido')
  return n
}

async function requireProduct(store, slug) {
  if (!(await store.crmGetProduct(slug))) fail('Ese producto no existe en el CRM')
}

const ACTIONS = {
  async product_save(ctx, body) {
    const row = parseProduct(body)
    await ctx.store.crmUpsertProduct({ ...row, updated_at: ctx.now.toISOString() })
    return { ok: true }
  },
  async log_add(ctx, body) {
    const row = parseLog(body)
    await requireProduct(ctx.store, row.product_slug)
    await ctx.store.crmInsertLog(row)
    return { ok: true }
  },
  async log_delete(ctx, body) {
    await ctx.store.crmDeleteLog(idOf(body.id))
    return { ok: true }
  },
  async creative_save(ctx, body) {
    const row = parseCreative(body)
    await requireProduct(ctx.store, row.product_slug)
    const stamped = { ...row, updated_at: ctx.now.toISOString() }
    if (body.id === undefined || body.id === null) return { ok: true, id: await ctx.store.crmInsertCreative(stamped) }
    await ctx.store.crmUpdateCreative(idOf(body.id), stamped)
    return { ok: true, id: idOf(body.id) }
  },
  // Cambia solo el tick (verde / rojo / sin tick) sin tocar el resto de la pieza.
  async creative_tick(ctx, body) {
    await ctx.store.crmUpdateCreative(idOf(body.id), { tick: oneOf(body.tick, TICKS, 'Tick', null), updated_at: ctx.now.toISOString() })
    return { ok: true }
  },
  // Reinicia lo aprendido: el generador ignora las piezas anteriores a este momento.
  async learning_reset(ctx, body) {
    const slug = typeof body.product === 'string' ? body.product : ''
    if (!SLUG_RE.test(slug)) fail('Producto inválido')
    await requireProduct(ctx.store, slug)
    await ctx.store.crmUpdateProduct(slug, { learning_since: ctx.now.toISOString() })
    return { ok: true }
  },
  async creative_delete(ctx, body) {
    await ctx.store.crmDeleteCreative(idOf(body.id))
    return { ok: true }
  },
}

export async function handleAdminCrm(req, res) {
  if (req.method === 'GET') {
    try {
      const g = await guard(req, res, { method: 'GET', limiter: limiters.read })
      if (!g) return
      const data = await g.store.crmList()
      return send(res, 200, {
        products: data.products,
        log: data.log,
        creatives: data.creatives,
      })
    } catch (error) {
      deps.log.error('[crm] error leyendo:', logSafe(error.message, 200))
      return send(res, 502, { error: 'No pudimos cargar el CRM' })
    }
  }

  try {
    const g = await guard(req, res, { method: 'POST', limiter: limiters.write })
    if (!g) return
    if (!(await allow(g.store, `admin-write:${hashKey(normalizeEmail(g.user.email))}`, 120, 60, deps.log))) {
      return send(res, 429, { error: 'Demasiadas acciones, esperá un minuto' })
    }
    const body = req.body
    if (!isPlainObject(body) || typeof body.action !== 'string' || !Object.hasOwn(ACTIONS, body.action)) {
      return bad(res, 'Acción inválida')
    }
    return send(res, 200, await ACTIONS[body.action](g, body))
  } catch (error) {
    if (error instanceof BillingError) return send(res, error.status, { error: error.message })
    deps.log.error('[crm] error en la acción:', logSafe(error.message, 200))
    return send(res, 502, { error: 'No pudimos completar la acción. Probá de nuevo.' })
  }
}
