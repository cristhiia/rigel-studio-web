// Gestión de suscripciones desde /admin: listado de suscriptores, accesos
// manuales (testers, regalos, soporte), baja, y precio según el dólar.
//
// Todo requiere sesión de Supabase con email verificado y presente en
// ADMIN_EMAILS. Cualquier otro caso (sin sesión, sin permiso, sin
// configuración) responde 404 igual, sin confirmar que el panel existe.
import {
  BillingError,
  allow,
  deps,
  isAdminUser,
  isEntitlementActive,
  isValidEmail,
  isValidSlug,
  normalizeEmail,
  parseAdminEmails,
  planPriceChange,
} from './billing.js'
import { bearerToken, clientIp, createRateLimiter, hashKey, logSafe, send } from './http.js'

export const MAX_GRANT_DAYS = 3650
export const NOTE_MAX = 200
export const PAGE_MAX = 100
export const STATUS_FILTERS = new Set(['active', 'trial', 'past_due', 'cancelled', 'expiring'])
export const ROUND_STEPS = new Set([1, 10, 50, 100])
const RATE_MIN = 1
const RATE_MAX = 1_000_000

export const limiters = {
  read: createRateLimiter({ limit: 60, windowMs: 60_000 }),
  write: createRateLimiter({ limit: 20, windowMs: 60_000 }),
}

const hasDb = env => Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
export const notFound = res => send(res, 404, { error: 'No encontrado' })
export const bad = (res, error) => send(res, 400, { error })

// Devuelve { store, user, env, now } o null (la respuesta ya se envió).
export async function guard(req, res, { method, limiter }) {
  if (req.method !== method) { notFound(res); return null }
  if (!limiter(clientIp(req))) { send(res, 429, { error: 'Demasiadas consultas, esperá un minuto' }); return null }
  const env = process.env
  const token = bearerToken(req)
  const admins = parseAdminEmails(env.ADMIN_EMAILS)
  if (!token || admins.size === 0 || !hasDb(env)) {
    if (token && (admins.size === 0 || !hasDb(env))) deps.log.error('[admin] falta ADMIN_EMAILS o Supabase')
    notFound(res)
    return null
  }
  const store = await deps.createStore(env)
  const user = await store.verifyUser(token)
  if (!isAdminUser(user, admins)) { notFound(res); return null }
  return { store, user, env, now: deps.now() }
}

// ── Validaciones ─────────────────────────────────────────────────────────
export const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v)

// Quita caracteres de control y espacios sobrantes; el resultado se guarda y
// se muestra en el panel (React lo escapa igual).
export function cleanNote(raw) {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw !== 'string') return undefined
  // eslint-disable-next-line no-control-regex
  const text = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  if (text.length > NOTE_MAX) return undefined
  return text || null
}

function intInRange(v, min, max) {
  const n = typeof v === 'string' && /^\d{1,6}$/.test(v) ? Number(v) : v
  return Number.isInteger(n) && n >= min && n <= max ? n : null
}

// ── Listado de suscriptores ──────────────────────────────────────────────
export function parseSubscribersQuery(query = {}) {
  const one = v => (typeof v === 'string' ? v : '')
  const product = one(query.product)
  if (product && !isValidSlug(product)) return { error: 'Producto inválido' }
  const status = one(query.status)
  if (status && !STATUS_FILTERS.has(status)) return { error: 'Estado inválido' }
  const q = one(query.q).trim().toLowerCase()
  if (q.length > 100) return { error: 'Búsqueda demasiado larga' }
  const limit = query.limit === undefined ? 25 : intInRange(query.limit, 1, PAGE_MAX)
  const offset = query.offset === undefined ? 0 : intInRange(query.offset, 0, 1_000_000)
  if (limit === null || offset === null) return { error: 'Paginación inválida' }
  return { product, status, q, limit, offset }
}

export async function handleAdminSubscribers(req, res) {
  try {
    const g = await guard(req, res, { method: 'GET', limiter: limiters.read })
    if (!g) return
    const parsed = parseSubscribersQuery(req.query)
    if (parsed.error) return bad(res, parsed.error)
    const result = await g.store.adminSubscribers(parsed)
    return send(res, 200, {
      total: Number(result.total) || 0,
      limit: parsed.limit,
      offset: parsed.offset,
      rows: (result.rows || []).map(r => ({
        email: r.email,
        product_slug: r.product_slug,
        status: r.status,
        valid_until: r.valid_until || null,
        source: r.source === 'manual' ? 'manual' : 'mp',
        note: r.note || null,
        created_at: r.created_at,
        amount_ars: r.amount_ars === null || r.amount_ars === undefined ? null : Number(r.amount_ars),
        has_mp: Boolean(r.has_mp),
      })),
    })
  } catch (error) {
    deps.log.error('[admin] error en el listado:', logSafe(error.message, 200))
    return send(res, 502, { error: 'No pudimos cargar los suscriptores' })
  }
}

// ── Acciones ─────────────────────────────────────────────────────────────
async function loadProduct(store, slug) {
  if (!isValidSlug(slug)) throw new BillingError(400, 'Producto inválido')
  const product = await store.getProduct(slug)
  if (!product) throw new BillingError(400, 'Producto inexistente')
  return product
}

async function record(ctx, row) {
  try {
    await ctx.store.logAdminAction({ admin_email: normalizeEmail(ctx.user.email), ...row })
  } catch (error) {
    // La acción ya se hizo; que falle el historial no la deshace.
    deps.log.error('[admin] no se pudo guardar en el historial:', logSafe(error.message, 160))
  }
}

// Da acceso por N días (o sin vencimiento) a un email, sin pasar por Mercado Pago.
export async function grantAccess(ctx, body) {
  const product = await loadProduct(ctx.store, body.product)
  const email = normalizeEmail(body.email)
  if (!isValidEmail(email)) throw new BillingError(400, 'Email inválido')
  const note = cleanNote(body.note)
  if (note === undefined) throw new BillingError(400, `La nota admite hasta ${NOTE_MAX} caracteres`)

  let validUntil = null
  if (body.forever !== true) {
    const days = intInRange(body.days, 1, MAX_GRANT_DAYS)
    if (days === null) throw new BillingError(400, `Los días tienen que ser un entero entre 1 y ${MAX_GRANT_DAYS}`)
    validUntil = new Date(ctx.now.getTime() + days * 86_400_000).toISOString()
  } else if (product.billing_type === 'subscription' && body.confirmForever !== true) {
    throw new BillingError(400, 'Para acceso sin vencimiento en una suscripción hay que confirmarlo')
  }

  const row = {
    email,
    product_slug: product.slug,
    status: 'active',
    valid_until: validUntil,
    source_order_id: null,
    source: 'manual',
    note,
    updated_at: ctx.now.toISOString(),
  }
  await ctx.store.upsertEntitlement(row)
  await record(ctx, {
    action: 'grant', product_slug: product.slug, target_email: email,
    detail: { valid_until: validUntil, note },
  })
  return { ok: true, entitlement: { email, product_slug: product.slug, status: 'active', valid_until: validUntil, source: 'manual', note } }
}

// Quita el acceso ahora. Si el cliente paga con Mercado Pago, `cancelMp: true`
// también cancela la suscripción en MP (si no, el próximo aviso de cobro le
// volvería a dar acceso).
export async function revokeAccess(ctx, body) {
  const product = await loadProduct(ctx.store, body.product)
  const email = normalizeEmail(body.email)
  if (!isValidEmail(email)) throw new BillingError(400, 'Email inválido')
  const note = cleanNote(body.note)
  if (note === undefined) throw new BillingError(400, `La nota admite hasta ${NOTE_MAX} caracteres`)

  const existing = await ctx.store.getEntitlement(email, product.slug)
  if (!existing) throw new BillingError(404, 'Ese email no tiene acceso a este producto')

  const order = existing.source_order_id ? await ctx.store.getOrder(existing.source_order_id) : null
  const preapprovalId = order && order.mp_preapproval_id
  const stillCharging = Boolean(preapprovalId) && existing.source !== 'manual' && isEntitlementActive(existing, ctx.now)

  let mpCancelled = false
  if (body.cancelMp === true && preapprovalId) {
    try {
      await deps.createMp(ctx.env).cancelPreapproval(preapprovalId)
      mpCancelled = true
    } catch (error) {
      deps.log.error('[admin] no se pudo cancelar en MP:', logSafe(error.message, 160))
      throw new BillingError(502, 'No pudimos cancelar la suscripción en Mercado Pago; no se cambió nada')
    }
    if (order) await ctx.store.updateOrder(order.id, { status: 'cancelled' })
  }

  const row = {
    email,
    product_slug: product.slug,
    status: 'cancelled',
    valid_until: ctx.now.toISOString(),
    source_order_id: existing.source_order_id || null,
    source: 'manual',
    note,
    updated_at: ctx.now.toISOString(),
  }
  await ctx.store.upsertEntitlement(row)
  await record(ctx, {
    action: 'revoke', product_slug: product.slug, target_email: email,
    detail: { mp_cancelled: mpCancelled, note },
  })
  return {
    ok: true,
    mp_cancelled: mpCancelled,
    // El cliente sigue con una suscripción de MP activa: le avisamos al admin.
    warning: stillCharging && !mpCancelled
      ? 'El cliente tiene una suscripción activa en Mercado Pago: si no la cancelás, el próximo cobro le vuelve a dar acceso.'
      : null,
  }
}

// Calcula (y opcionalmente aplica) price_ars = price_usd × dólar.
export async function priceFromRate(ctx, body) {
  const product = await loadProduct(ctx.store, body.product)
  const usdRate = typeof body.usd_rate === 'number' || typeof body.usd_rate === 'string' ? Number(body.usd_rate) : NaN
  if (!Number.isFinite(usdRate) || usdRate < RATE_MIN || usdRate > RATE_MAX) {
    throw new BillingError(400, 'La cotización tiene que ser un número entre 1 y 1.000.000')
  }
  const round = body.round === undefined ? 1 : Number(body.round)
  if (!ROUND_STEPS.has(round)) throw new BillingError(400, 'Redondeo inválido')

  let plan
  try {
    plan = planPriceChange(product, { usdRate, round })
  } catch (error) {
    throw new BillingError(400, error.message)
  }
  if (body.apply !== true) return { ok: true, applied: false, plan }
  if (!plan.next || plan.next <= 0) throw new BillingError(400, 'El precio resultante no es válido')

  await ctx.store.updateProductPrice(product.slug, plan.next)
  await record(ctx, {
    action: 'price', product_slug: product.slug, target_email: null,
    detail: { usd_rate: plan.usd_rate, from: plan.current, to: plan.next, round },
  })
  return { ok: true, applied: true, plan }
}

const ACTIONS = { grant: grantAccess, revoke: revokeAccess, price: priceFromRate }

export async function handleAdminManage(req, res) {
  // GET = precios y historial; POST = acción.
  if (req.method === 'GET') {
    try {
      const g = await guard(req, res, { method: 'GET', limiter: limiters.read })
      if (!g) return
      const [log, products] = await Promise.all([g.store.listAdminLog(30), g.store.listProducts()])
      return send(res, 200, {
        products: products.map(p => ({
          slug: p.slug, name: p.name, billing_type: p.billing_type, active: Boolean(p.active),
          price_usd: p.price_usd === null || p.price_usd === undefined ? null : Number(p.price_usd),
          price_ars: p.price_ars === null || p.price_ars === undefined ? null : Number(p.price_ars),
        })),
        log: log.map(l => ({
        at: l.at, admin_email: l.admin_email, action: l.action,
        product_slug: l.product_slug || null, target_email: l.target_email || null, detail: l.detail || {},
        })),
      })
    } catch (error) {
      deps.log.error('[admin] error leyendo el historial:', logSafe(error.message, 200))
      return send(res, 502, { error: 'No pudimos cargar el historial' })
    }
  }

  try {
    const g = await guard(req, res, { method: 'POST', limiter: limiters.write })
    if (!g) return
    // Segunda capa compartida entre instancias; por administrador.
    if (!(await allow(g.store, `admin-write:${hashKey(normalizeEmail(g.user.email))}`, 60, 60, deps.log))) {
      return send(res, 429, { error: 'Demasiadas acciones, esperá un minuto' })
    }
    const body = req.body
    if (!isPlainObject(body) || typeof body.action !== 'string' || !Object.hasOwn(ACTIONS, body.action)) {
      return bad(res, 'Acción inválida')
    }
    return send(res, 200, await ACTIONS[body.action](g, body))
  } catch (error) {
    if (error instanceof BillingError) return send(res, error.status, { error: error.message })
    deps.log.error('[admin] error en la acción:', logSafe(error.message, 200))
    return send(res, 502, { error: 'No pudimos completar la acción. Probá de nuevo.' })
  }
}
