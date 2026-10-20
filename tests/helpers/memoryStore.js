// Store en memoria con la misma interfaz que api/_lib/billingStore.js.
import crypto from 'node:crypto'

export const KEELWISE = {
  slug: 'keelwise',
  name: 'Keelwise',
  billing_type: 'subscription',
  price_usd: 10,
  price_ars: 14500,
  trial_days: 7,
  delivery_type: 'apk',
  delivery_ref: 'keelwise.apk',
  active: true,
  created_at: '2026-10-01T00:00:00.000Z',
}

export const PLANTILLA = {
  slug: 'plantilla-kiosco',
  name: 'Plantilla KioscoPro',
  billing_type: 'one_time',
  price_usd: 30,
  price_ars: 43500,
  trial_days: 0,
  delivery_type: 'web_access',
  delivery_ref: 'https://kiosco.example/acceso',
  active: true,
  created_at: '2026-10-02T00:00:00.000Z',
}

// `clock` permite fijar la hora en los tests (las funciones de la base usan now()).
export function memoryStore({ products = [KEELWISE, PLANTILLA], users = {}, clock = () => new Date() } = {}) {
  const db = {
    products: new Map(products.map(p => [p.slug, { ...p }])),
    orders: new Map(),
    entitlements: new Map(),
    events: new Map(),
    rates: new Map(),
    signed: [],
  }
  const key = (email, slug) => `${email}|${slug}`
  const clone = v => (v ? { ...v } : null)

  return {
    db,
    async getProduct(slug) { return clone(db.products.get(slug)) },
    async listProducts() { return [...db.products.values()].map(clone) },
    async updateProductPrice(slug, priceArs) { db.products.get(slug).price_ars = priceArs },

    async createOrder(row) {
      const order = { id: crypto.randomUUID(), mp_payment_id: null, mp_preapproval_id: null, paid_at: null, created_at: new Date().toISOString(), ...row }
      db.orders.set(order.id, order)
      return clone(order)
    },
    async updateOrder(id, patch) {
      const o = db.orders.get(id)
      if (o) Object.assign(o, patch)
    },
    async getOrder(id) { return clone(db.orders.get(id)) },
    async findOrderByPreapproval(id) {
      return clone([...db.orders.values()].find(o => o.mp_preapproval_id === id))
    },

    async getEntitlement(email, slug) { return clone(db.entitlements.get(key(email, slug))) },
    // Como el upsert de Supabase: created_at se conserva si la fila ya existía.
    async upsertEntitlement(row) {
      const prev = db.entitlements.get(key(row.email, row.product_slug))
      db.entitlements.set(key(row.email, row.product_slug), {
        created_at: prev ? prev.created_at : row.updated_at,
        ...prev,
        ...row,
      })
    },

    async claimEvent({ id, type, data_id }) {
      if (!db.events.has(id)) db.events.set(id, { id, type, data_id, processed_at: null })
      return { processed: Boolean(db.events.get(id).processed_at) }
    },
    async markEventProcessed(id) {
      const e = db.events.get(id)
      if (e) e.processed_at = new Date().toISOString()
    },

    // ── Réplica en JS de las funciones de billing.sql (el SQL real se prueba en
    // tests/billing-sql.test.js con un Postgres de verdad). ──
    async rateHit(key, limit, windowSeconds) {
      const now = clock().getTime()
      const r = db.rates.get(key)
      if (!r || r.expires <= now) {
        db.rates.set(key, { hits: 1, expires: now + windowSeconds * 1000 })
        return 1 <= limit
      }
      r.hits += 1
      return r.hits <= limit
    },

    async adminSummary(monthStart) {
      const now = clock()
      const inMonth = d => Boolean(d) && new Date(d) >= monthStart
      const effective = e => {
        const alive = !e.valid_until || new Date(e.valid_until) > now
        if (e.status === 'active' && alive) return 'active'
        if (e.status === 'trial' && e.valid_until && alive) return 'trial'
        if (e.status === 'past_due' && e.valid_until && alive) return 'past_due'
        return 'cancelled'
      }
      const ents = [...db.entitlements.values()]
      const orders = [...db.orders.values()]
      const products = [...db.products.values()].map(p => {
        const mine = ents.filter(e => e.product_slug === p.slug)
        const count = st => mine.filter(e => effective(e) === st).length
        const mrr = p.billing_type === 'subscription'
          ? mine.filter(e => effective(e) === 'active').reduce((sum, e) => sum + Number((db.orders.get(e.source_order_id) || {}).amount_ars || 0), 0)
          : 0
        const oneTime = orders
          .filter(o => o.product_slug === p.slug && o.billing_type === 'one_time' && o.status === 'approved' && inMonth(o.paid_at))
          .reduce((sum, o) => sum + Number(o.amount_ars), 0)
        return {
          slug: p.slug, name: p.name, billing_type: p.billing_type, on_sale: p.active,
          active: count('active'), trial: count('trial'), past_due: count('past_due'), cancelled: count('cancelled'),
          mrr_ars: mrr, one_time_month_ars: oneTime,
          new_this_month: mine.filter(e => inMonth(e.created_at)).length,
          churned_this_month: mine.filter(e => ['cancelled', 'expired'].includes(e.status) && inMonth(e.updated_at)).length,
        }
      })
      const recent_orders = orders
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 20)
        .map(o => ({ id: o.id, product_slug: o.product_slug, email: o.email, billing_type: o.billing_type, status: o.status, amount_ars: o.amount_ars, created_at: o.created_at, paid_at: o.paid_at }))
      return { products, recent_orders }
    },

    async dueOrders(limit) {
      const now = clock().getTime()
      const DAY = 86_400_000
      return [...db.entitlements.values()]
        .filter(e => ['trial', 'active', 'past_due'].includes(e.status) && e.valid_until)
        .filter(e => {
          const t = new Date(e.valid_until).getTime()
          return t < now + DAY && t > now - 7 * DAY
        })
        .sort((a, b) => new Date(a.valid_until) - new Date(b.valid_until))
        .map(e => db.orders.get(e.source_order_id))
        .filter(o => o && o.billing_type === 'subscription' && o.mp_preapproval_id)
        .slice(0, Math.min(Math.max(limit, 1), 200))
        .map(clone)
    },

    async maintenance() {
      const now = clock().getTime()
      let expired = 0
      for (const e of db.entitlements.values()) {
        if (['trial', 'active', 'past_due'].includes(e.status) && e.valid_until && new Date(e.valid_until).getTime() < now - 7 * 86_400_000) {
          e.status = 'expired'
          expired += 1
        }
      }
      return { events_deleted: 0, rate_limits_deleted: 0, entitlements_expired: expired, orders_failed: 0 }
    },

    async signDownload(bucket, path, expiresIn) {
      db.signed.push({ bucket, path, expiresIn })
      return `https://signed.example/${bucket}/${path}?exp=${expiresIn}`
    },

    async verifyUser(token) { return users[token] || null },
  }
}
