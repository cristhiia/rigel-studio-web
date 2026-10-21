// Acceso a Supabase (service role, solo server) para el billing.
// Los tests usan un store en memoria con la misma interfaz
// (tests/helpers/memoryStore.js).

const DB_TIMEOUT_MS = 4000

const fail = (what, error) => { throw new Error(`Supabase ${what}: ${error.message}`) }

export async function createSupabaseStore({ url, serviceRoleKey }) {
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init = {}) => fetch(input, { ...init, signal: init.signal || AbortSignal.timeout(DB_TIMEOUT_MS) }),
    },
  })

  async function one(query, what) {
    const { data, error } = await query.maybeSingle()
    if (error) fail(what, error)
    return data || null
  }

  async function many(query, what) {
    const { data, error } = await query
    if (error) fail(what, error)
    return data || []
  }

  return {
    // ── Productos ──
    getProduct: slug => one(client.from('billing_products').select('*').eq('slug', slug), 'getProduct'),
    listProducts: () => many(client.from('billing_products').select('*').order('created_at'), 'listProducts'),
    async updateProductPrice(slug, priceArs) {
      const { error } = await client.from('billing_products').update({ price_ars: priceArs }).eq('slug', slug)
      if (error) fail('updateProductPrice', error)
    },

    // ── Pedidos ──
    async createOrder(row) {
      const { data, error } = await client.from('billing_orders').insert(row).select().single()
      if (error) fail('createOrder', error)
      return data
    },
    async updateOrder(id, patch) {
      const { error } = await client.from('billing_orders').update(patch).eq('id', id)
      if (error) fail('updateOrder', error)
    },
    getOrder: id => one(client.from('billing_orders').select('*').eq('id', id), 'getOrder'),
    findOrderByPreapproval: id =>
      one(client.from('billing_orders').select('*').eq('mp_preapproval_id', id), 'findOrderByPreapproval'),

    // ── Permisos ──
    getEntitlement: (email, productSlug) =>
      one(
        client.from('billing_entitlements').select('*').eq('email', email).eq('product_slug', productSlug),
        'getEntitlement',
      ),
    async upsertEntitlement(row) {
      const { error } = await client.from('billing_entitlements').upsert(row, { onConflict: 'email,product_slug' })
      if (error) fail('upsertEntitlement', error)
    },

    // ── Eventos del webhook ──
    // Inserta el evento si no existe y devuelve si ya se había procesado.
    async claimEvent({ id, type, data_id }) {
      const { error } = await client
        .from('billing_webhook_events')
        .upsert({ id, type, data_id }, { onConflict: 'id', ignoreDuplicates: true })
      if (error) fail('claimEvent', error)
      const row = await one(client.from('billing_webhook_events').select('processed_at').eq('id', id), 'claimEvent')
      return { processed: Boolean(row && row.processed_at) }
    },
    async markEventProcessed(id) {
      const { error } = await client
        .from('billing_webhook_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) fail('markEventProcessed', error)
    },

    // ── Escala: todo se calcula en la base (ver billing.sql) ──
    // Cuenta un intento y dice si sigue dentro del límite.
    async rateHit(key, limit, windowSeconds) {
      const { data, error } = await client.rpc('billing_rate_hit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds })
      if (error) fail('rateHit', error)
      return data === true
    },
    // { products: [...], recent_orders: [...] } del mes que empieza en `monthStart`.
    async adminSummary(monthStart) {
      const { data, error } = await client.rpc('billing_admin_summary', { p_month_start: monthStart.toISOString() })
      if (error) fail('adminSummary', error)
      return data || { products: [], recent_orders: [] }
    },
    // Suscripciones con permiso por vencer, para volver a consultarlas en MP.
    async dueOrders(limit) {
      const { data, error } = await client.rpc('billing_due_orders', { p_limit: limit })
      if (error) fail('dueOrders', error)
      return data || []
    },
    // Listado para /admin: { total, rows } (ver billing_admin_subscribers).
    async adminSubscribers({ product, q, status, limit, offset }) {
      const { data, error } = await client.rpc('billing_admin_subscribers', {
        p_product: product || null, p_q: q || null, p_status: status || null, p_limit: limit, p_offset: offset,
      })
      if (error) fail('adminSubscribers', error)
      return data || { total: 0, rows: [] }
    },
    async logAdminAction(row) {
      const { error } = await client.from('billing_admin_log').insert(row)
      if (error) fail('logAdminAction', error)
    },
    listAdminLog: limit =>
      many(client.from('billing_admin_log').select('at,admin_email,action,product_slug,target_email,detail').order('at', { ascending: false }).limit(limit), 'listAdminLog'),

    // Limpieza diaria. Devuelve cuánto limpió.
    async maintenance() {
      const { data, error } = await client.rpc('billing_maintenance')
      if (error) fail('maintenance', error)
      return data || {}
    },

    // ── Storage ──
    async signDownload(bucket, path, expiresIn) {
      const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresIn)
      if (error) fail('signed URL', error)
      return data.signedUrl
    },

    // ── Auth (panel /admin) ──
    // Valida el JWT contra Supabase Auth; null si no es válido.
    async verifyUser(accessToken) {
      const { data, error } = await client.auth.getUser(accessToken)
      if (error || !data || !data.user) return null
      return data.user
    },
  }
}
