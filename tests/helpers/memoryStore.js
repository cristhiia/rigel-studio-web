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

export function memoryStore({ products = [KEELWISE, PLANTILLA], users = {} } = {}) {
  const db = {
    products: new Map(products.map(p => [p.slug, { ...p }])),
    orders: new Map(),
    entitlements: new Map(),
    events: new Map(),
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
    async listOrders({ limit = 5000 } = {}) {
      return [...db.orders.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit).map(clone)
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
    async listEntitlements() { return [...db.entitlements.values()].map(clone) },

    async claimEvent({ id, type, data_id }) {
      if (!db.events.has(id)) db.events.set(id, { id, type, data_id, processed_at: null })
      return { processed: Boolean(db.events.get(id).processed_at) }
    },
    async markEventProcessed(id) {
      const e = db.events.get(id)
      if (e) e.processed_at = new Date().toISOString()
    },

    async signDownload(bucket, path, expiresIn) {
      db.signed.push({ bucket, path, expiresIn })
      return `https://signed.example/${bucket}/${path}?exp=${expiresIn}`
    },

    async verifyUser(token) { return users[token] || null },
  }
}
