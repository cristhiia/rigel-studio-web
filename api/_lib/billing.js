// Billing multiproducto de Rigel Studio (Mercado Pago + Supabase).
//
// Cada producto es una fila en billing_products. Este módulo crea el cobro
// (suscripción o pago único), procesa las notificaciones de MP, guarda pedidos
// y permisos y resuelve la entrega. Los handlers de /api/billing/* son una
// línea que llama a handle*().
//
// Todo lo que toca red llega por `ctx` ({ store, mp, env, now, log }) para
// poder testearlo con mocks (ver tests/billing*.test.js).
import { createMpClient, isValidMpId, verifySignature } from './mercadopago.js'
import { createSupabaseStore } from './billingStore.js'
import { bearerToken, clientIp, createRateLimiter, hashKey, logSafe, safeEqual, send, withDeadline } from './http.js'

export { isValidMpId }

export const GRACE_DAYS = 3
export const DOWNLOAD_TTL_S = 600
export const DEFAULT_BUCKET = 'apks'
const WEBHOOK_MP_TIMEOUT_MS = 2000
const WEBHOOK_DEADLINE_MS = 4500
const ACTIVE_STATUSES = new Set(['trial', 'active'])

export class BillingError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// ── Validaciones ─────────────────────────────────────────────────────────
// Solo ASCII y caracteres de email comunes: sin espacios, comillas, ángulos ni
// caracteres de control. El email viaja a Mercado Pago y se muestra en /admin.
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function isValidEmail(email) {
  const e = normalizeEmail(email)
  return e.length > 0 && e.length <= 254 && !e.includes('..') && !e.startsWith('.') && !e.includes('.@') && EMAIL_RE.test(e)
}

export const isValidSlug = s => typeof s === 'string' && s.length <= 64 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)
export const isUuid = s => typeof s === 'string' && UUID_RE.test(s)

const trimSlash = url => String(url).replace(/\/+$/, '')
const addDays = (date, days) => new Date(date.getTime() + days * 86_400_000)

// ── Precio ───────────────────────────────────────────────────────────────
export function parsePriceArs(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

// Respaldo documentado: <SLUG>_PRICE_ARS (ej. KEELWISE_PRICE_ARS) se usa solo
// si billing_products.price_ars está vacío.
export const fallbackPriceEnvName = slug => `${slug.toUpperCase().replace(/-/g, '_')}_PRICE_ARS`

export function resolvePriceArs(product, env = {}) {
  return parsePriceArs(product.price_ars) ?? parsePriceArs(env[fallbackPriceEnvName(product.slug)])
}

// Recalcula price_ars = price_usd × cotización, redondeado a `round` pesos.
export function planPriceChange(product, { usdRate, round = 1 }) {
  const rate = Number(usdRate)
  const step = Number(round)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('--usd-rate tiene que ser un número mayor a 0')
  if (!Number.isFinite(step) || step <= 0) throw new Error('--round tiene que ser un número mayor a 0')
  const usd = parsePriceArs(product.price_usd)
  if (!usd) throw new Error(`El producto ${product.slug} no tiene price_usd`)
  const next = Math.round((usd * rate) / step) * step
  const current = parsePriceArs(product.price_ars)
  return { slug: product.slug, price_usd: usd, usd_rate: rate, current, next, changed: current !== next }
}

// ── Payloads de Mercado Pago ─────────────────────────────────────────────
// La página de vuelta es /<slug>/gracias (convención de las landings).
export const thanksUrl = (siteUrl, slug) => `${trimSlash(siteUrl)}/${slug}/gracias`

export const subscriptionReason = product => `${product.name} — suscripción mensual`

export function buildPreapprovalPayload({ product, order, priceArs, siteUrl, trialDays = 0 }) {
  const autoRecurring = {
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: priceArs,
    currency_id: 'ARS',
  }
  if (trialDays > 0) autoRecurring.free_trial = { frequency: trialDays, frequency_type: 'days' }
  return {
    reason: subscriptionReason(product),
    payer_email: order.email,
    external_reference: order.id,
    back_url: thanksUrl(siteUrl, product.slug),
    status: 'pending',
    auto_recurring: autoRecurring,
  }
}

export function buildPreferencePayload({ product, order, priceArs, siteUrl }) {
  const back = thanksUrl(siteUrl, product.slug)
  return {
    items: [{ id: product.slug, title: product.name, quantity: 1, unit_price: priceArs, currency_id: 'ARS' }],
    payer: { email: order.email },
    external_reference: order.id,
    back_urls: { success: back, pending: back, failure: back },
    auto_return: 'approved',
    statement_descriptor: 'RIGEL STUDIO',
  }
}

// ── Estados ──────────────────────────────────────────────────────────────
// Devuelven { order, entitlement } (entitlement null = no tocar el permiso)
// o null si MP manda un estado que no conocemos.
export function mapSubscriptionStatus(mpStatus, { inTrial = false, paymentRejected = false } = {}) {
  switch (mpStatus) {
    case 'authorized':
      return { order: 'authorized', entitlement: paymentRejected ? 'past_due' : inTrial ? 'trial' : 'active' }
    case 'pending':
      return { order: 'pending', entitlement: null }
    case 'paused': // pausada a mano o por cobros fallidos: sin acceso hasta que vuelva a authorized
      return { order: 'paused', entitlement: 'past_due' }
    case 'cancelled':
      return { order: 'cancelled', entitlement: 'cancelled' }
    default:
      return null
  }
}

export function mapPaymentStatus(mpStatus) {
  switch (mpStatus) {
    case 'approved':
      return { order: 'approved', entitlement: 'active' }
    case 'pending':
    case 'in_process':
    case 'authorized':
      return { order: 'pending', entitlement: null }
    case 'rejected':
      return { order: 'rejected', entitlement: null }
    case 'cancelled':
      return { order: 'cancelled', entitlement: null }
    case 'refunded':
    case 'charged_back':
      return { order: 'refunded', entitlement: 'cancelled' }
    default:
      return null
  }
}

export function isEntitlementActive(ent, now = new Date()) {
  if (!ent || !ACTIVE_STATUSES.has(ent.status)) return false
  return !ent.valid_until || new Date(ent.valid_until) > now
}

// Un evento viejo de otro pedido (ej. la suscripción anterior que se cancela
// después de que el cliente se volvió a suscribir) no le saca el acceso que le
// da el pedido actual.
export function decideEntitlement(existing, next, now = new Date()) {
  // Un permiso dado a mano que sigue vigente no lo pisa un aviso de MP que no
  // da acceso (ej. un tester que además tenía una suscripción vieja cancelada).
  if (
    existing &&
    existing.source === 'manual' &&
    isEntitlementActive(existing, now) &&
    !ACTIVE_STATUSES.has(next.status)
  ) {
    return null
  }
  if (
    existing &&
    existing.source_order_id &&
    existing.source_order_id !== next.source_order_id &&
    ACTIVE_STATUSES.has(existing.status) &&
    !ACTIVE_STATUSES.has(next.status)
  ) {
    return null
  }
  return next
}

async function applyEntitlement(order, { status, valid_until }, ctx) {
  const { store, log = console } = ctx
  const now = ctx.now || new Date()
  const existing = await store.getEntitlement(order.email, order.product_slug)
  const row = decideEntitlement(existing, {
    email: order.email,
    product_slug: order.product_slug,
    status,
    valid_until,
    source_order_id: order.id,
    source: 'mp',
    note: null,
    updated_at: now.toISOString(),
  }, now)
  if (!row) {
    log.info('[billing] se conserva el permiso de otro pedido', { order_id: order.id, ignored_status: status })
    return existing
  }
  await store.upsertEntitlement(row)
  return row
}

// ── Sincronizar con el estado real de MP ─────────────────────────────────
async function findOrderForPreapproval(pre, store) {
  const ref = pre.external_reference
  const order = isUuid(ref) ? await store.getOrder(ref) : null
  if (order) return order
  return isValidMpId(String(pre.id)) ? store.findOrderByPreapproval(String(pre.id)) : null
}

export async function syncPreapproval(pre, ctx, { authorizedPayment } = {}) {
  const { store, log = console } = ctx
  const now = ctx.now || new Date()
  if (!pre || !pre.id) return { handled: false, reason: 'no-preapproval' }

  const order = await findOrderForPreapproval(pre, store)
  if (!order) return { handled: false, reason: 'unknown-order' }
  if (order.billing_type !== 'subscription') return { handled: false, reason: 'type-mismatch' }
  if (order.mp_preapproval_id && order.mp_preapproval_id !== String(pre.id)) {
    return { handled: false, reason: 'preapproval-mismatch' }
  }

  const trial = pre.auto_recurring && pre.auto_recurring.free_trial
  const created = new Date(pre.date_created || order.created_at)
  const trialEnd = trial ? addDays(created, Number(trial.frequency) || 0) : created
  const paymentStatus = authorizedPayment && authorizedPayment.payment && authorizedPayment.payment.status
  const paymentApproved = paymentStatus === 'approved'
  const inTrial = Boolean(trial) && now < trialEnd && !paymentApproved && !order.paid_at

  const mapped = mapSubscriptionStatus(pre.status, { inTrial, paymentRejected: paymentStatus === 'rejected' })
  if (!mapped) {
    log.warn('[billing] estado de suscripción desconocido, se ignora', { order_id: order.id, status: pre.status })
    return { handled: false, reason: 'unknown-status' }
  }

  const patch = { status: mapped.order, mp_preapproval_id: String(pre.id) }
  if (paymentApproved) {
    patch.mp_payment_id = String(authorizedPayment.payment.id || authorizedPayment.id)
    if (!order.paid_at) patch.paid_at = now.toISOString()
  }
  await store.updateOrder(order.id, patch)

  let entitlement = null
  if (mapped.entitlement) {
    const base = pre.next_payment_date ? new Date(pre.next_payment_date) : inTrial ? trialEnd : addDays(now, 30)
    entitlement = await applyEntitlement(
      order,
      { status: mapped.entitlement, valid_until: addDays(base, GRACE_DAYS).toISOString() },
      ctx,
    )
  }
  return { handled: true, order: { ...order, ...patch }, entitlement }
}

export async function syncPayment(payment, ctx) {
  const { store, log = console } = ctx
  const now = ctx.now || new Date()
  if (!payment || !payment.id) return { handled: false, reason: 'no-payment' }

  const order = isUuid(payment.external_reference) ? await store.getOrder(payment.external_reference) : null
  if (!order) return { handled: false, reason: 'unknown-order' }
  // Los cobros mensuales de una suscripción también llegan como "payment":
  // esos se procesan por subscription_authorized_payment.
  if (order.billing_type !== 'one_time') return { handled: false, reason: 'subscription-payment' }
  // Otro intento de pago del mismo pedido no pisa uno ya aprobado.
  if (order.status === 'approved' && order.mp_payment_id && order.mp_payment_id !== String(payment.id)) {
    return { handled: false, reason: 'already-approved' }
  }

  const mapped = mapPaymentStatus(payment.status)
  if (!mapped) {
    log.warn('[billing] estado de pago desconocido, se ignora', { order_id: order.id, status: payment.status })
    return { handled: false, reason: 'unknown-status' }
  }
  if (
    mapped.order === 'approved' &&
    (payment.currency_id !== 'ARS' || Number(payment.transaction_amount) < Number(order.amount_ars))
  ) {
    log.warn('[billing] pago aprobado con monto o moneda distintos al pedido, no se habilita', { order_id: order.id })
    return { handled: false, reason: 'amount-mismatch' }
  }

  const patch = { status: mapped.order, mp_payment_id: String(payment.id) }
  if (mapped.order === 'approved' && !order.paid_at) patch.paid_at = payment.date_approved || now.toISOString()
  await store.updateOrder(order.id, patch)

  let entitlement = null
  if (mapped.entitlement) entitlement = await applyEntitlement(order, { status: mapped.entitlement, valid_until: null }, ctx)
  return { handled: true, order: { ...order, ...patch }, entitlement }
}

// Notificación ya verificada. Siempre consulta el estado real en MP, así un
// evento repetido o desordenado deja el mismo resultado.
export async function processNotification({ type, dataId }, ctx) {
  const { mp } = ctx
  if (!isValidMpId(dataId)) return { handled: false, reason: 'invalid-id' }
  switch (type) {
    case 'subscription_preapproval':
      return syncPreapproval(await mp.getPreapproval(dataId), ctx)
    case 'subscription_authorized_payment': {
      const ap = await mp.getAuthorizedPayment(dataId)
      const preId = String((ap && ap.preapproval_id) || '')
      if (!isValidMpId(preId)) return { handled: false, reason: 'no-preapproval' }
      return syncPreapproval(await mp.getPreapproval(preId), ctx, { authorizedPayment: ap })
    }
    case 'payment':
      return syncPayment(await mp.getPayment(dataId), ctx)
    default:
      return { handled: false, reason: 'ignored-type' }
  }
}

// ── Checkout ─────────────────────────────────────────────────────────────
export function publicProduct(product, env) {
  return {
    slug: product.slug,
    name: product.name,
    billing_type: product.billing_type,
    price_usd: parsePriceArs(product.price_usd),
    price_ars: resolvePriceArs(product, env),
    trial_days: product.trial_days || 0,
  }
}

export async function checkout({ product: slug, email }, ctx) {
  const { store, mp, env, log = console } = ctx
  if (!isValidSlug(slug)) throw new BillingError(400, 'Producto inválido')
  if (!isValidEmail(email)) throw new BillingError(400, 'Email inválido')

  const product = await store.getProduct(slug)
  if (!product || !product.active) throw new BillingError(404, 'Ese producto no está disponible')
  const priceArs = resolvePriceArs(product, env)
  if (!priceArs || !env.SITE_URL || !['subscription', 'one_time'].includes(product.billing_type)) {
    log.error('[billing/checkout] configuración incompleta (precio, SITE_URL o billing_type)', { product: slug })
    throw new BillingError(503, 'El pago todavía no está disponible')
  }

  const payer = normalizeEmail(email)
  const perEmail = LIMITS.checkoutEmail
  if (!(await allow(store, `co:email:${hashKey(`${slug}|${payer}`)}`, perEmail.limit, perEmail.windowSeconds, log))) {
    throw new BillingError(429, 'Ya probaste varias veces con este email. Esperá un rato o escribinos por WhatsApp.')
  }
  const isSubscription = product.billing_type === 'subscription'
  // La prueba gratis es para la primera vez: quien ya tuvo acceso no la repite.
  let trialDays = 0
  if (isSubscription && product.trial_days > 0) {
    trialDays = (await store.getEntitlement(payer, slug)) ? 0 : product.trial_days
  }

  const order = await store.createOrder({
    product_slug: slug,
    email: payer,
    billing_type: product.billing_type,
    status: 'created',
    amount_ars: priceArs,
  })

  try {
    const args = { product, order, priceArs, siteUrl: env.SITE_URL, trialDays }
    if (isSubscription) {
      const pre = await mp.createPreapproval(buildPreapprovalPayload(args))
      if (!pre || !pre.init_point || !pre.id) throw new Error('MP no devolvió init_point')
      await store.updateOrder(order.id, { mp_preapproval_id: String(pre.id), status: 'pending' })
      return { url: pre.init_point, order_id: order.id }
    }
    const pref = await mp.createPreference(buildPreferencePayload(args))
    if (!pref || !pref.init_point) throw new Error('MP no devolvió init_point')
    await store.updateOrder(order.id, { status: 'pending' })
    return { url: pref.init_point, order_id: order.id }
  } catch (error) {
    log.error('[billing/checkout] error creando el cobro en MP', { order_id: order.id, message: error.message, mp: error.mpMessage || '' })
    await store.updateOrder(order.id, { status: 'failed' }).catch(() => {})
    throw new BillingError(502, 'No pudimos iniciar el pago. Probá de nuevo en unos minutos.')
  }
}

// ── Estado y entrega ─────────────────────────────────────────────────────
const getSafe = async fn => {
  try {
    return await fn()
  } catch (err) {
    if (err.status === 404) return null
    throw err
  }
}

// Busca el pedido por su id (external_reference) o por el preapproval_id que
// MP agrega a la página de vuelta. Si el permiso todavía no está activo,
// consulta MP y sincroniza (por si el webhook todavía no llegó).
export async function getAccess({ product: slug, orderId, preapprovalId, paymentId }, ctx) {
  const { store, mp } = ctx
  const now = ctx.now || new Date()

  let order = null
  let pre = null
  if (isUuid(orderId)) {
    order = await store.getOrder(orderId)
  } else if (isValidMpId(preapprovalId)) {
    order = await store.findOrderByPreapproval(preapprovalId)
    if (!order) {
      pre = await getSafe(() => mp.getPreapproval(preapprovalId))
      if (pre && isUuid(pre.external_reference)) order = await store.getOrder(pre.external_reference)
    }
  }
  if (!order || (slug && order.product_slug !== slug)) return { found: false, active: false, order: null, entitlement: null }

  let entitlement = await store.getEntitlement(order.email, order.product_slug)
  if (!isEntitlementActive(entitlement, now)) {
    if (order.billing_type === 'subscription') {
      const id = order.mp_preapproval_id || (pre && String(pre.id))
      if (!pre && isValidMpId(id)) pre = await getSafe(() => mp.getPreapproval(id))
      if (pre) await syncPreapproval(pre, ctx)
    } else if (isValidMpId(paymentId)) {
      const payment = await getSafe(() => mp.getPayment(paymentId))
      if (payment && payment.external_reference === order.id) await syncPayment(payment, ctx)
    }
    entitlement = await store.getEntitlement(order.email, order.product_slug)
  }
  return { found: true, order, entitlement, active: isEntitlementActive(entitlement, now) }
}

export async function resolveDelivery(product, ctx) {
  const { store, env = {} } = ctx
  const ref = product.delivery_ref || ''
  switch (product.delivery_type) {
    case 'apk': {
      if (!ref) throw new BillingError(503, 'Descarga no disponible todavía')
      const url = await store.signDownload(env.BILLING_STORAGE_BUCKET || DEFAULT_BUCKET, ref, DOWNLOAD_TTL_S)
      return { type: 'apk', url, expires_in: DOWNLOAD_TTL_S }
    }
    case 'web_access':
      if (!/^https:\/\//.test(ref)) throw new BillingError(503, 'Acceso no disponible todavía')
      return { type: 'web_access', url: ref }
    case 'license_key':
    case 'manual':
      // Entrega a mano por ahora (ver docs/billing.md).
      return { type: product.delivery_type, note: ref || null }
    default:
      throw new BillingError(503, 'Entrega no configurada')
  }
}

// ── Panel /admin ─────────────────────────────────────────────────────────
export function parseAdminEmails(raw) {
  return new Set(
    String(raw || '')
      .split(',')
      .map(normalizeEmail)
      .filter(Boolean),
  )
}

export function isAdminUser(user, adminEmails) {
  return Boolean(user && user.email && user.email_confirmed_at && adminEmails.has(normalizeEmail(user.email)))
}

// Argentina es UTC-3 todo el año (sin horario de verano).
export function monthStartArgentina(now) {
  const local = new Date(now.getTime() - 3 * 3_600_000)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1, 3, 0, 0))
}

const round2 = n => Math.round(n * 100) / 100

// El resumen se calcula en la base (billing_admin_summary): no baja todos los
// permisos y pedidos, así que sigue andando con miles de clientes. Acá solo se
// suman los totales.
export function composeSummary({ products = [], recent_orders = [] }, now = new Date()) {
  const rows = products.map(p => ({
    slug: p.slug,
    name: p.name,
    billing_type: p.billing_type,
    on_sale: Boolean(p.on_sale),
    active: Number(p.active) || 0,
    trial: Number(p.trial) || 0,
    past_due: Number(p.past_due) || 0,
    cancelled: Number(p.cancelled) || 0,
    mrr_ars: round2(Number(p.mrr_ars) || 0),
    one_time_month_ars: round2(Number(p.one_time_month_ars) || 0),
    new_this_month: Number(p.new_this_month) || 0,
    churned_this_month: Number(p.churned_this_month) || 0,
  }))
  const sum = key => round2(rows.reduce((s, r) => s + r[key], 0))
  const totals = {
    active: sum('active'),
    trial: sum('trial'),
    past_due: sum('past_due'),
    cancelled: sum('cancelled'),
    mrr_ars: sum('mrr_ars'),
    one_time_month_ars: sum('one_time_month_ars'),
    new_this_month: sum('new_this_month'),
    churned_this_month: sum('churned_this_month'),
  }
  return {
    generated_at: now.toISOString(),
    month_start: monthStartArgentina(now).toISOString(),
    totals,
    products: rows,
    recent_orders: recent_orders.slice(0, 20).map(o => ({
      id: o.id,
      product_slug: o.product_slug,
      email: o.email,
      billing_type: o.billing_type,
      status: o.status,
      amount_ars: Number(o.amount_ars),
      created_at: o.created_at,
      paid_at: o.paid_at || null,
    })),
  }
}

// ── HTTP ─────────────────────────────────────────────────────────────────
// Dependencias reemplazables en tests.
export const deps = {
  createStore: env => createSupabaseStore({ url: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY }),
  createMp: (env, opts = {}) => createMpClient({ accessToken: env.MP_ACCESS_TOKEN, ...opts }),
  now: () => new Date(),
  log: console,
}

// Valor de texto/número que llegó de afuera; cualquier otra cosa (objeto,
// arreglo, null) cuenta como vacío. Evita que String({toString: 1}) tire un 500.
const scalar = v => (typeof v === 'string' || typeof v === 'number' ? String(v) : '')

const hasDb = env => Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)

async function buildCtx(env, mpOpts) {
  return {
    env,
    store: await deps.createStore(env),
    mp: deps.createMp(env, mpOpts),
    now: deps.now(),
    log: deps.log,
  }
}

// Primera capa: contador en memoria de cada instancia (barato, frena ráfagas).
const limiters = {
  checkout: createRateLimiter({ limit: 10, windowMs: 60_000 }),
  status: createRateLimiter({ limit: 30, windowMs: 60_000 }),
  download: createRateLimiter({ limit: 10, windowMs: 60_000 }),
  admin: createRateLimiter({ limit: 30, windowMs: 60_000 }),
}

// Segunda capa: contador en la base, compartido entre todas las instancias del
// sitio (las de memoria no se ven entre sí). Si la base no responde se deja
// pasar: es preferible no cortar una venta a bloquear a todos por una falla.
export async function allow(store, key, limit, windowSeconds, log = console) {
  try {
    return await store.rateHit(key, limit, windowSeconds)
  } catch (error) {
    log.warn('[billing] límite de intentos no disponible, se permite', { message: logSafe(error.message, 120) })
    return true
  }
}
export const LIMITS = {
  checkoutIp: { limit: 30, windowSeconds: 600 }, // varios usuarios pueden compartir IP (datos móviles)
  checkoutEmail: { limit: 5, windowSeconds: 3600 },
  statusIp: { limit: 60, windowSeconds: 60 },
  downloadIp: { limit: 10, windowSeconds: 60 },
}

const tooMany = res => send(res, 429, { error: 'Demasiadas consultas, esperá un minuto' })

function fromError(res, error, scope) {
  if (error instanceof BillingError) return send(res, error.status, { error: error.message })
  deps.log.error(`[billing/${scope}] error:`, error.message)
  return send(res, 502, { error: 'No pudimos completar la operación. Probá de nuevo en unos minutos.' })
}

// GET  ?product=slug → datos públicos del producto (nombre, precio, prueba).
// POST {product, email} → { url } de pago.
export async function handleCheckout(req, res) {
  const env = process.env
  if (req.method === 'GET') {
    const slug = (req.query && req.query.product) || ''
    if (!isValidSlug(slug)) return send(res, 400, { error: 'Producto inválido' })
    if (!hasDb(env)) return send(res, 503, { error: 'No disponible' })
    try {
      const store = await deps.createStore(env)
      const product = await store.getProduct(slug)
      if (!product || !product.active) return send(res, 404, { error: 'Ese producto no está disponible' })
      return send(res, 200, publicProduct(product, env), 'public, max-age=60, s-maxage=300')
    } catch (error) {
      return fromError(res, error, 'checkout')
    }
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido' })
  if (!limiters.checkout(clientIp(req))) return tooMany(res)

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const slug = body.product
  if (!isValidSlug(slug)) return send(res, 400, { error: 'Producto inválido' })
  if (!isValidEmail(body.email)) return send(res, 400, { error: 'Email inválido' })
  if (!hasDb(env) || !env.MP_ACCESS_TOKEN) {
    deps.log.error('[billing/checkout] faltan variables de entorno (Supabase o MP)')
    return send(res, 503, { error: 'El pago todavía no está disponible' })
  }

  try {
    const ctx = await buildCtx(env)
    const perIp = LIMITS.checkoutIp
    if (!(await allow(ctx.store, `co:ip:${hashKey(clientIp(req))}`, perIp.limit, perIp.windowSeconds, ctx.log))) return tooMany(res)
    const { url } = await checkout({ product: slug, email: body.email }, ctx)
    return send(res, 200, { url })
  } catch (error) {
    return fromError(res, error, 'checkout')
  }
}

// Un único endpoint para todos los productos. Verifica la firma, deduplica
// por id de notificación y responde antes de 5 s. Ante una falla transitoria
// devuelve 500 para que MP reintente (el procesamiento es idempotente).
export async function handleWebhook(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido' })
  const env = process.env
  const log = deps.log
  const query = req.query || {}
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const headers = req.headers || {}
  // Se cortan a un largo razonable: el HMAC no tiene que procesar textos enormes.
  const dataId = (scalar(query['data.id']) || scalar(body.data && body.data.id)).slice(0, 256)
  const type = (scalar(query.type) || scalar(body.type) || scalar(query.topic)).slice(0, 64)

  const valid = verifySignature({
    signatureHeader: headers['x-signature'],
    requestId: headers['x-request-id'],
    dataId,
    secret: env.MP_WEBHOOK_SECRET,
  })
  if (!valid) {
    log.warn('[billing/webhook] firma inválida', { type: logSafe(type), dataId: logSafe(dataId) })
    return send(res, 401, { error: 'Firma inválida' })
  }
  if (!hasDb(env) || !env.MP_ACCESS_TOKEN) {
    log.error('[billing/webhook] configuración incompleta')
    return send(res, 500, { error: 'Configuración incompleta' })
  }

  const rawEventId = scalar(body.id) || scalar(headers['x-request-id'])
  const eventId = /^[A-Za-z0-9_-]{1,128}$/.test(rawEventId) ? rawEventId : ''

  try {
    const result = await withDeadline(
      (async () => {
        const ctx = await buildCtx(env, { timeoutMs: WEBHOOK_MP_TIMEOUT_MS })
        if (eventId) {
          const { processed } = await ctx.store.claimEvent({ id: eventId, type, data_id: dataId })
          if (processed) return { handled: false, reason: 'duplicate' }
        }
        const r = await processNotification({ type, dataId }, ctx)
        if (eventId) await ctx.store.markEventProcessed(eventId)
        return r
      })(),
      WEBHOOK_DEADLINE_MS,
    )
    if (!result.handled) log.info('[billing/webhook] sin cambios:', result.reason, { type: logSafe(type), dataId: logSafe(dataId) })
    return send(res, 200, { ok: true })
  } catch (error) {
    log.error('[billing/webhook] error procesando', { type: logSafe(type), dataId: logSafe(dataId), message: logSafe(error.message, 200) })
    return send(res, 500, { error: 'Error procesando la notificación' })
  }
}

// Un parámetro repetido (?a=1&a=2) llega como arreglo: se descarta.
const param = v => (typeof v === 'string' ? v : '')

function accessParams(req) {
  const q = req.query || {}
  return {
    product: param(q.product),
    orderId: param(q.order) || param(q.external_reference),
    preapprovalId: param(q.preapproval_id),
    paymentId: param(q.payment_id) || param(q.collection_id),
  }
}

function validateAccessParams(p) {
  if (!isValidSlug(p.product)) return 'Producto inválido'
  if (!isUuid(p.orderId) && !isValidMpId(p.preapprovalId)) return 'Código de pedido inválido'
  return null
}

// GET ?product=slug&order=<uuid> | &preapproval_id=<id> [&payment_id=<id>]
export async function handleStatus(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Método no permitido' })
  if (!limiters.status(clientIp(req))) return tooMany(res)
  const params = accessParams(req)
  const invalid = validateAccessParams(params)
  if (invalid) return send(res, 400, { error: invalid })
  const env = process.env
  if (!hasDb(env) || !env.MP_ACCESS_TOKEN) return send(res, 503, { error: 'No disponible' })

  try {
    const ctx = await buildCtx(env)
    const perIp = LIMITS.statusIp
    if (!(await allow(ctx.store, `st:ip:${hashKey(clientIp(req))}`, perIp.limit, perIp.windowSeconds, ctx.log))) return tooMany(res)
    const access = await getAccess(params, ctx)
    return send(res, 200, { active: access.active, status: (access.entitlement && access.entitlement.status) || null })
  } catch (error) {
    return fromError(res, error, 'status')
  }
}

// Igual que status, pero si el permiso está activo devuelve la entrega del
// producto (para 'apk', link firmado de 10 minutos).
export async function handleDownload(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Método no permitido' })
  if (!limiters.download(clientIp(req))) return tooMany(res)
  const params = accessParams(req)
  const invalid = validateAccessParams(params)
  if (invalid) return send(res, 400, { error: invalid })
  const env = process.env
  if (!hasDb(env) || !env.MP_ACCESS_TOKEN) return send(res, 503, { error: 'Descarga no disponible todavía' })

  try {
    const ctx = await buildCtx(env)
    const perIp = LIMITS.downloadIp
    if (!(await allow(ctx.store, `dl:ip:${hashKey(clientIp(req))}`, perIp.limit, perIp.windowSeconds, ctx.log))) return tooMany(res)
    const access = await getAccess(params, ctx)
    if (!access.active) return send(res, 403, { error: 'El acceso no está activo' })
    const product = await ctx.store.getProduct(access.order.product_slug)
    if (!product) return send(res, 503, { error: 'Descarga no disponible todavía' })
    return send(res, 200, await resolveDelivery(product, ctx))
  } catch (error) {
    return fromError(res, error, 'download')
  }
}

// Sin sesión válida, sin email verificado o fuera de ADMIN_EMAILS: 404 sin
// detalle (no confirma que el panel exista).
export async function handleAdminSummary(req, res) {
  const notFound = () => send(res, 404, { error: 'No encontrado' })
  if (req.method !== 'GET') return notFound()
  if (!limiters.admin(clientIp(req))) return tooMany(res)
  const env = process.env
  const token = bearerToken(req)
  const admins = parseAdminEmails(env.ADMIN_EMAILS)
  if (!token || admins.size === 0 || !hasDb(env)) {
    if (token && (admins.size === 0 || !hasDb(env))) deps.log.error('[admin] falta ADMIN_EMAILS o Supabase')
    return notFound()
  }

  try {
    const store = await deps.createStore(env)
    const user = await store.verifyUser(token)
    if (!isAdminUser(user, admins)) return notFound()
    const now = deps.now()
    return send(res, 200, composeSummary(await store.adminSummary(monthStartArgentina(now)), now))
  } catch (error) {
    deps.log.error('[admin] error armando el resumen:', logSafe(error.message, 200))
    return send(res, 502, { error: 'No pudimos cargar el resumen' })
  }
}

// ── Conciliación diaria (Vercel Cron) ────────────────────────────────────
// Los avisos de Mercado Pago pueden perderse (caída del sitio, 3 reintentos
// agotados). Cada día se vuelven a consultar en MP las suscripciones cuyo
// permiso está por vencer, y se hace la limpieza de la base. Así un aviso
// perdido nunca deja a un cliente sin acceso (ni con acceso de más) por mucho.
export const RECONCILE_BATCH = 40
const RECONCILE_DEADLINE_MS = 25_000

export async function reconcile(ctx, { batch = RECONCILE_BATCH, deadlineMs = RECONCILE_DEADLINE_MS } = {}) {
  const { store, mp, log = console } = ctx
  const startedAt = Date.now()
  const orders = await store.dueOrders(batch)
  const result = { due: orders.length, checked: 0, changed: 0, failed: 0, skipped: 0 }
  for (const order of orders) {
    if (Date.now() - startedAt > deadlineMs) {
      result.skipped = orders.length - result.checked - result.failed
      break
    }
    try {
      const pre = await mp.getPreapproval(order.mp_preapproval_id)
      const before = await store.getEntitlement(order.email, order.product_slug)
      const r = await syncPreapproval(pre, ctx)
      result.checked += 1
      const after = await store.getEntitlement(order.email, order.product_slug)
      if (r.handled && (!before || !after || before.status !== after.status || before.valid_until !== after.valid_until)) result.changed += 1
    } catch (error) {
      result.failed += 1
      log.error('[billing/reconcile] no se pudo conciliar', { order_id: order.id, message: logSafe(error.message, 200) })
    }
  }
  result.maintenance = await store.maintenance()
  return result
}

// GET con `Authorization: Bearer <CRON_SECRET>` (Vercel lo manda solo cuando
// existe la variable CRON_SECRET). Sin secreto configurado, no responde.
export async function handleReconcile(req, res) {
  const notFound = () => send(res, 404, { error: 'No encontrado' })
  if (req.method !== 'GET') return notFound()
  const env = process.env
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 16) {
    deps.log.error('[billing/reconcile] falta CRON_SECRET (mínimo 16 caracteres)')
    return notFound()
  }
  if (!safeEqual(bearerToken(req), env.CRON_SECRET)) return notFound()
  if (!hasDb(env) || !env.MP_ACCESS_TOKEN) return send(res, 500, { error: 'Configuración incompleta' })
  try {
    const result = await reconcile(await buildCtx(env, { timeoutMs: 5000 }))
    deps.log.info('[billing/reconcile]', result)
    return send(res, 200, { ok: true, ...result })
  } catch (error) {
    deps.log.error('[billing/reconcile] error:', logSafe(error.message, 200))
    return send(res, 500, { error: 'Error en la conciliación' })
  }
}
