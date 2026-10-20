// Corre supabase/migrations/billing.sql en un Postgres real (PGlite, en
// memoria) y prueba permisos, RLS y las funciones. Las partes de Supabase que
// no existen en Postgres común (roles anon/authenticated/service_role, el
// schema auth y auth.uid()) se crean acá igual que en Supabase, incluidos los
// permisos por defecto que Supabase da a esos roles en el schema public.
import fs from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const read = f => fs.readFileSync(path.resolve(import.meta.dirname, '..', f), 'utf8')
const MIGRATION = read('supabase/migrations/billing.sql')
const SEED = read('supabase/seed/products.sql')

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`

const U_ANA = '11111111-1111-4111-8111-111111111111'
const U_BEA = '22222222-2222-4222-8222-222222222222'
const U_NOVERIF = '33333333-3333-4333-8333-333333333333'

let db
const q = async (sql, params) => (await db.query(sql, params)).rows
const as = async (role, sub, fn) => {
  await db.exec(`set role ${role}`)
  if (sub) await db.exec(`select set_config('request.jwt.claim.sub', '${sub}', false)`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
    await db.exec(`select set_config('request.jwt.claim.sub', '', false)`)
  }
}
const denied = p => expect(p).rejects.toThrow(/permission denied/i)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(SUPABASE_STUB)
  await db.exec(MIGRATION)
  await db.exec(SEED)
}, 60_000)
afterAll(() => db.close())

beforeEach(async () => {
  await db.exec(`
    truncate public.billing_rate_limits, public.billing_webhook_events,
             public.billing_entitlements, public.billing_orders, auth.users cascade;
    insert into auth.users (id, email, email_confirmed_at) values
      ('${U_ANA}', 'Ana@Mail.com', now()),
      ('${U_BEA}', 'bea@mail.com', now()),
      ('${U_NOVERIF}', 'noverif@mail.com', null);
  `)
})

const order = (id, email, over = {}) => {
  const o = { slug: 'keelwise', type: 'subscription', status: 'authorized', amount: 14500, paid: null, created: 'now()', pre: null, ...over }
  return db.query(
    `insert into public.billing_orders (id, product_slug, email, billing_type, status, amount_ars, mp_preapproval_id, paid_at, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, ${o.created})`,
    [id, o.slug, email, o.type, o.status, o.amount, o.pre, o.paid],
  )
}
const ent = (email, slug, status, validUntil, sourceOrder = null, extra = '') =>
  db.query(
    `insert into public.billing_entitlements (email, product_slug, status, valid_until, source_order_id ${extra ? ', ' + extra.cols : ''})
     values ($1, $2, $3, ${validUntil}, $4 ${extra ? ', ' + extra.vals : ''})`,
    [email, slug, status, sourceOrder],
  )
const oid = n => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`

describe('migración', () => {
  it('se puede correr dos veces sin romper nada', async () => {
    await db.exec(MIGRATION)
    await db.exec(SEED)
    expect(await q('select count(*)::int as n from public.billing_products')).toEqual([{ n: 1 }])
  })

  it('el seed carga Keelwise como suscripción', async () => {
    const [p] = await q(`select * from public.billing_products where slug = 'keelwise'`)
    expect(p).toMatchObject({ billing_type: 'subscription', trial_days: 7, delivery_type: 'apk', active: true })
  })
})

describe('permisos: anon y authenticated no tocan nada directo', () => {
  const TABLES = ['billing_products', 'billing_orders', 'billing_entitlements', 'billing_webhook_events', 'billing_rate_limits']

  for (const role of ['anon', 'authenticated']) {
    for (const t of TABLES) {
      it(`${role} no puede leer ni escribir ${t}`, async () => {
        await as(role, U_ANA, async () => {
          await denied(db.query(`select * from public.${t}`))
          await denied(db.query(`delete from public.${t}`))
          await denied(db.query(`insert into public.${t} default values`))
        })
      })
    }

    it(`${role} no puede ejecutar las funciones internas`, async () => {
      await as(role, U_ANA, async () => {
        await denied(db.query(`select public.billing_rate_hit('k', 1, 60)`))
        await denied(db.query(`select public.billing_admin_summary(now())`))
        await denied(db.query(`select * from public.billing_due_orders(10)`))
        await denied(db.query(`select public.billing_maintenance()`))
      })
    })
  }

  it('anon no puede ejecutar get_my_entitlements', async () => {
    await as('anon', null, () => denied(db.query('select * from public.get_my_entitlements()')))
  })

  it('RLS está activado en las cinco tablas', async () => {
    const rows = await q(`select relname from pg_class where relrowsecurity and relname like 'billing\\_%' order by 1`)
    expect(rows.map(r => r.relname)).toEqual([...TABLES].sort())
  })

  it('ninguna tabla tiene políticas (nadie entra por RLS)', async () => {
    expect(await q(`select * from pg_policies where schemaname = 'public'`)).toEqual([])
  })

  it('las funciones billing_* son security definer con search_path fijo', async () => {
    const rows = await q(`select proname, prosecdef, proconfig from pg_proc
      where pronamespace = 'public'::regnamespace and proname like 'billing\\_%' or proname = 'get_my_entitlements'`)
    expect(rows.length).toBe(5)
    for (const r of rows) {
      expect(r.prosecdef, r.proname).toBe(true)
      expect(String(r.proconfig), r.proname).toMatch(/search_path=public, pg_temp/)
    }
  })
})

describe('get_my_entitlements()', () => {
  it('cada usuario ve solo lo suyo, sin importar mayúsculas del email', async () => {
    await ent('ana@mail.com', 'keelwise', 'active', `now() + interval '10 days'`)
    await ent('bea@mail.com', 'keelwise', 'trial', `now() + interval '3 days'`)
    const ana = await as('authenticated', U_ANA, () => q('select * from public.get_my_entitlements()'))
    expect(ana).toHaveLength(1)
    expect(ana[0]).toMatchObject({ product_slug: 'keelwise', status: 'active', is_active: true })
    const bea = await as('authenticated', U_BEA, () => q('select * from public.get_my_entitlements()'))
    expect(bea).toHaveLength(1)
    expect(bea[0]).toMatchObject({ status: 'trial', is_active: true })
  })

  it('no devuelve nada si el email no está verificado', async () => {
    await ent('noverif@mail.com', 'keelwise', 'active', `now() + interval '10 days'`)
    expect(await as('authenticated', U_NOVERIF, () => q('select * from public.get_my_entitlements()'))).toEqual([])
  })

  it('sin sesión (uid nulo) no devuelve nada', async () => {
    await ent('ana@mail.com', 'keelwise', 'active', `now() + interval '10 days'`)
    expect(await as('authenticated', null, () => q('select * from public.get_my_entitlements()'))).toEqual([])
  })

  it('is_active es falso si venció, aunque el estado diga active', async () => {
    await ent('ana@mail.com', 'keelwise', 'active', `now() - interval '1 hour'`)
    const [r] = await as('authenticated', U_ANA, () => q('select * from public.get_my_entitlements()'))
    expect(r).toMatchObject({ status: 'active', is_active: false })
  })

  it('past_due y cancelled nunca están activos; valid_until nulo = sin vencimiento', async () => {
    await ent('ana@mail.com', 'keelwise', 'past_due', `now() + interval '2 days'`)
    expect((await as('authenticated', U_ANA, () => q('select * from public.get_my_entitlements()')))[0].is_active).toBe(false)
    await db.exec(`update public.billing_entitlements set status = 'active', valid_until = null`)
    expect((await as('authenticated', U_ANA, () => q('select * from public.get_my_entitlements()')))[0].is_active).toBe(true)
  })
})

describe('restricciones de datos', () => {
  it('rechaza datos inválidos', async () => {
    const bad = sql => expect(db.query(sql)).rejects.toThrow()
    await bad(`insert into public.billing_products (slug, name, billing_type, delivery_type) values ('Mal Slug', 'x', 'subscription', 'apk')`)
    await bad(`insert into public.billing_products (slug, name, billing_type, delivery_type) values ('ok', 'x', 'otro', 'apk')`)
    await bad(`insert into public.billing_products (slug, name, billing_type, delivery_type, price_ars) values ('ok2', 'x', 'one_time', 'apk', -5)`)
    await bad(`insert into public.billing_orders (product_slug, email, billing_type, amount_ars) values ('keelwise', 'MAYUS@x.com', 'subscription', 10)`)
    await bad(`insert into public.billing_orders (product_slug, email, billing_type, amount_ars) values ('keelwise', 'a@x.com', 'subscription', 0)`)
    await bad(`insert into public.billing_orders (product_slug, email, billing_type, amount_ars, status) values ('keelwise', 'a@x.com', 'subscription', 10, 'inventado')`)
    await bad(`insert into public.billing_orders (product_slug, email, billing_type, amount_ars) values ('no-existe', 'a@x.com', 'subscription', 10)`)
  })

  it('un mismo preapproval no puede estar en dos pedidos', async () => {
    await order(oid(1), 'a@x.com', { pre: 'pre-1' })
    await expect(order(oid(2), 'b@x.com', { pre: 'pre-1' })).rejects.toThrow(/duplicate key/)
  })

  it('un permiso por (email, producto)', async () => {
    await ent('ana@mail.com', 'keelwise', 'active', 'null')
    await expect(ent('ana@mail.com', 'keelwise', 'trial', 'null')).rejects.toThrow(/duplicate key/)
  })
})

describe('billing_rate_hit', () => {
  const hit = (key, limit = 3, secs = 60) => as('service_role', null, async () => (await q('select public.billing_rate_hit($1, $2, $3) as ok', [key, limit, secs]))[0].ok)

  it('permite hasta el límite y después corta', async () => {
    expect([await hit('a'), await hit('a'), await hit('a'), await hit('a'), await hit('a')]).toEqual([true, true, true, false, false])
  })

  it('cada clave tiene su propio contador', async () => {
    for (let i = 0; i < 4; i++) await hit('a')
    expect(await hit('b')).toBe(true)
  })

  it('cuando vence la ventana vuelve a permitir', async () => {
    for (let i = 0; i < 4; i++) await hit('a')
    expect(await hit('a')).toBe(false)
    await db.exec(`update public.billing_rate_limits set expires_at = now() - interval '1 second' where key = 'a'`)
    expect(await hit('a')).toBe(true)
  })

  it('es atómica con pedidos simultáneos', async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => hit('conc', 5)))
    expect(results.filter(Boolean)).toHaveLength(5)
  })

  it('rechaza parámetros inválidos', async () => {
    await expect(hit(null)).rejects.toThrow(/parametros invalidos/)
    await expect(hit('x'.repeat(201))).rejects.toThrow(/parametros invalidos/)
    await expect(hit('k', 0)).rejects.toThrow(/parametros invalidos/)
    await expect(hit('k', 1, 0)).rejects.toThrow(/parametros invalidos/)
  })

  it('una clave con comillas o SQL se guarda como texto, sin ejecutarse', async () => {
    await hit(`'; drop table public.billing_orders; --`)
    expect(await q(`select count(*)::int as n from public.billing_orders`)).toEqual([{ n: 0 }])
    expect((await q('select key from public.billing_rate_limits'))[0].key).toContain('drop table')
  })
})

describe('billing_admin_summary', () => {
  const summary = () => as('service_role', null, async () => (await q(`select public.billing_admin_summary('2026-10-01T03:00:00Z') as s`))[0].s)

  it('sin datos: un producto con todo en cero y sin pedidos', async () => {
    const s = await summary()
    expect(s.products).toHaveLength(1)
    expect(s.products[0]).toMatchObject({ slug: 'keelwise', active: 0, trial: 0, past_due: 0, cancelled: 0, mrr_ars: 0, new_this_month: 0 })
    expect(s.recent_orders).toEqual([])
  })

  it('cuenta por estado efectivo y calcula MRR con los permisos vigentes', async () => {
    await db.exec(`update public.billing_products set price_ars = 14500 where slug = 'keelwise'`)
    for (let i = 1; i <= 6; i++) await order(oid(i), `u${i}@x.com`, { amount: 14500 })
    await ent('u1@x.com', 'keelwise', 'active', `now() + interval '20 days'`, oid(1))
    await ent('u2@x.com', 'keelwise', 'active', `now() + interval '5 days'`, oid(2))
    await ent('u3@x.com', 'keelwise', 'active', `now() - interval '2 days'`, oid(3)) // venció sin que nadie lo marque
    await ent('u4@x.com', 'keelwise', 'trial', `now() + interval '3 days'`, oid(4))
    await ent('u5@x.com', 'keelwise', 'past_due', `now() + interval '2 days'`, oid(5))
    await ent('u6@x.com', 'keelwise', 'cancelled', `now() + interval '2 days'`, oid(6))
    const [p] = (await summary()).products
    expect(p).toMatchObject({ active: 2, trial: 1, past_due: 1, cancelled: 2, mrr_ars: 29000 })
  })

  it('altas y bajas del mes usan la fecha de inicio de mes recibida', async () => {
    await ent('old@x.com', 'keelwise', 'cancelled', 'null', null, { cols: 'created_at, updated_at', vals: `'2026-09-10T00:00:00Z', '2026-09-20T00:00:00Z'` })
    await ent('new@x.com', 'keelwise', 'cancelled', 'null', null, { cols: 'created_at, updated_at', vals: `'2026-10-05T00:00:00Z', '2026-10-06T00:00:00Z'` })
    const [p] = (await summary()).products
    expect(p).toMatchObject({ new_this_month: 1, churned_this_month: 1, cancelled: 2 })
  })

  it('suma el pago único del mes y no cuenta otros meses ni otros estados', async () => {
    await db.exec(`insert into public.billing_products (slug, name, billing_type, delivery_type, price_ars)
                   values ('plantilla', 'Plantilla', 'one_time', 'manual', 43500)`)
    await order(oid(1), 'a@x.com', { slug: 'plantilla', type: 'one_time', status: 'approved', amount: 43500, paid: '2026-10-10T12:00:00Z' })
    await order(oid(2), 'b@x.com', { slug: 'plantilla', type: 'one_time', status: 'approved', amount: 43500, paid: '2026-09-10T12:00:00Z' })
    await order(oid(3), 'c@x.com', { slug: 'plantilla', type: 'one_time', status: 'pending', amount: 43500 })
    const prod = (await summary()).products.find(p => p.slug === 'plantilla')
    expect(prod.one_time_month_ars).toBe(43500)
    expect(prod.mrr_ars).toBe(0)
  })

  it('recent_orders trae los 20 más nuevos', async () => {
    for (let i = 1; i <= 25; i++) {
      await order(oid(i), `u${i}@x.com`, { created: `now() - interval '${i} minutes'` })
    }
    const s = await summary()
    expect(s.recent_orders).toHaveLength(20)
    expect(s.recent_orders[0].email).toBe('u1@x.com')
  })
})

describe('billing_due_orders', () => {
  const due = (limit = 40) => as('service_role', null, () => q('select id from public.billing_due_orders($1)', [limit]))

  it('trae solo suscripciones por vencer (o vencidas hace poco) con preapproval', async () => {
    await order(oid(1), 'a@x.com', { pre: 'p1' })
    await order(oid(2), 'b@x.com', { pre: 'p2' })
    await order(oid(3), 'c@x.com', { pre: 'p3' })
    await order(oid(4), 'd@x.com', { pre: 'p4' })
    await order(oid(5), 'e@x.com', { pre: null })
    await order(oid(6), 'f@x.com', { pre: 'p6', type: 'one_time' })
    await ent('a@x.com', 'keelwise', 'active', `now() + interval '10 hours'`, oid(1)) // sí
    await ent('b@x.com', 'keelwise', 'active', `now() - interval '2 days'`, oid(2)) // sí (venció hace poco)
    await ent('c@x.com', 'keelwise', 'active', `now() + interval '10 days'`, oid(3)) // no: falta mucho
    await ent('d@x.com', 'keelwise', 'active', `now() - interval '30 days'`, oid(4)) // no: hace demasiado
    await ent('e@x.com', 'keelwise', 'active', `now() + interval '1 hour'`, oid(5)) // no: sin preapproval
    await ent('f@x.com', 'keelwise', 'active', `now() + interval '1 hour'`, oid(6)) // no: pago único
    expect((await due()).map(r => r.id).sort()).toEqual([oid(1), oid(2)])
  })

  it('respeta el límite y atiende primero lo más viejo', async () => {
    for (let i = 1; i <= 5; i++) {
      await order(oid(i), `u${i}@x.com`, { pre: `p${i}` })
      await ent(`u${i}@x.com`, 'keelwise', 'active', `now() + interval '${i} hours'`, oid(i))
    }
    expect((await due(2)).map(r => r.id)).toEqual([oid(1), oid(2)])
    expect(await due(0)).toHaveLength(1) // mínimo 1
  })
})

describe('billing_maintenance', () => {
  it('limpia eventos y límites viejos, vence permisos y cierra pedidos colgados', async () => {
    await db.exec(`
      insert into public.billing_webhook_events (id, received_at) values ('viejo', now() - interval '60 days'), ('nuevo', now());
      insert into public.billing_rate_limits (key, hits, expires_at) values ('vencido', 1, now() - interval '1 hour'), ('vigente', 1, now() + interval '1 hour');
    `)
    await order(oid(1), 'a@x.com', { status: 'created', created: `now() - interval '2 days'` })
    await order(oid(2), 'b@x.com', { status: 'created' })
    await ent('a@x.com', 'keelwise', 'active', `now() - interval '10 days'`)
    await ent('b@x.com', 'keelwise', 'active', `now() - interval '2 days'`)
    await ent('c@x.com', 'keelwise', 'active', 'null')
    const r = await as('service_role', null, async () => (await q('select public.billing_maintenance() as r'))[0].r)
    expect(r).toEqual({ events_deleted: 1, rate_limits_deleted: 1, entitlements_expired: 1, orders_failed: 1 })
    expect((await q('select id from public.billing_webhook_events')).map(x => x.id)).toEqual(['nuevo'])
    expect((await q(`select email, status from public.billing_entitlements order by email`))).toEqual([
      { email: 'a@x.com', status: 'expired' },
      { email: 'b@x.com', status: 'active' },
      { email: 'c@x.com', status: 'active' },
    ])
  })
})
