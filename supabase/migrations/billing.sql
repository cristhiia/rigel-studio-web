-- Rigel Studio — billing multiproducto (Mercado Pago)
-- NO se ejecutó contra ninguna base. Correr manualmente, una sola vez, en el
-- proyecto de Supabase que usan las apps para Auth (ver docs/billing.md).
-- Es idempotente: se puede volver a correr sin romper nada.
-- Después correr supabase/seed/products.sql.
--
-- Escribe solo el sitio (api/billing/*) con la service role key, que saltea
-- RLS. Las cinco tablas tienen RLS activado y NINGUNA política: ningún
-- cliente anon/authenticated las lee ni escribe directo. Las apps consultan
-- sus permisos con get_my_entitlements() (security definer). Las demás
-- funciones (billing_*) solo las puede ejecutar el service role.

-- ── Productos ─────────────────────────────────────────────────────────────
-- Vender una app nueva = insertar una fila acá (más su landing).
create table if not exists public.billing_products (
  slug           text        primary key
                 check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name           text        not null,
  billing_type   text        not null check (billing_type in ('subscription', 'one_time')),
  price_usd      numeric(12, 2) check (price_usd is null or price_usd > 0),
  -- Fuente de verdad del monto que se cobra. Se recalcula con
  -- `npm run billing:price` y no afecta suscripciones ya creadas.
  price_ars      numeric(12, 2) check (price_ars is null or price_ars > 0),
  trial_days     integer     not null default 0 check (trial_days between 0 and 365),
  delivery_type  text        not null check (delivery_type in ('apk', 'web_access', 'license_key', 'manual')),
  -- apk: ruta dentro del bucket privado · web_access: URL · otros: nota.
  delivery_ref   text,
  active         boolean     not null default true,
  created_at     timestamptz not null default now()
);

-- ── Pedidos ───────────────────────────────────────────────────────────────
-- Uno por intento de compra. external_reference en MP = id del pedido.
create table if not exists public.billing_orders (
  id                 uuid        primary key default gen_random_uuid(),
  product_slug       text        not null references public.billing_products (slug) on update cascade,
  email              text        not null check (email = lower(email)),
  billing_type       text        not null check (billing_type in ('subscription', 'one_time')),
  mp_payment_id      text,
  mp_preapproval_id  text,
  -- created: pedido creado, todavía sin respuesta de MP · failed: MP rechazó
  -- la creación · el resto copia el estado de MP (preapproval o pago).
  status             text        not null default 'created'
                     check (status in (
                       'created', 'failed',
                       'pending', 'authorized', 'paused', 'cancelled',
                       'approved', 'rejected', 'refunded'
                     )),
  amount_ars         numeric(12, 2) not null check (amount_ars > 0),
  created_at         timestamptz not null default now(),
  paid_at            timestamptz
);

create unique index if not exists billing_orders_preapproval_uidx
  on public.billing_orders (mp_preapproval_id) where mp_preapproval_id is not null;
create index if not exists billing_orders_product_created_idx
  on public.billing_orders (product_slug, created_at desc);
-- Por email (límite de intentos de compra y búsquedas) y por fecha de pago
-- (ingresos del mes en /admin).
create index if not exists billing_orders_email_created_idx
  on public.billing_orders (email, created_at desc);
create index if not exists billing_orders_paid_idx
  on public.billing_orders (product_slug, paid_at) where status = 'approved';

-- ── Permisos ──────────────────────────────────────────────────────────────
-- Lo que consulta cada app: una fila por (email, producto).
create table if not exists public.billing_entitlements (
  email            text        not null check (email = lower(email)),
  product_slug     text        not null references public.billing_products (slug) on update cascade,
  status           text        not null check (status in ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  -- null = sin vencimiento (pago único). En suscripciones: próximo cobro + 3 días de gracia.
  valid_until      timestamptz,
  source_order_id  uuid        references public.billing_orders (id) on delete set null,
  -- Primera vez que el email tuvo acceso al producto (altas del mes en /admin).
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (email, product_slug)
);

create index if not exists billing_entitlements_product_status_idx
  on public.billing_entitlements (product_slug, status);
-- Permisos por vencer: los recorre el job diario (/api/billing/reconcile).
create index if not exists billing_entitlements_due_idx
  on public.billing_entitlements (valid_until)
  where status in ('trial', 'active', 'past_due');

-- ── Eventos del webhook (idempotencia) ───────────────────────────────────
create table if not exists public.billing_webhook_events (
  id            text        primary key,   -- id de la notificación de MP
  type          text,
  data_id       text,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz                -- null = recibido pero no terminado (se reintenta)
);
create index if not exists billing_webhook_events_received_idx
  on public.billing_webhook_events (received_at);

-- ── Límite de intentos (compartido entre todas las instancias del sitio) ──
-- Una fila por clave (ej. hash de IP o de email) con su ventana de tiempo.
create table if not exists public.billing_rate_limits (
  key         text        primary key check (char_length(key) <= 200),
  hits        integer     not null default 0,
  expires_at  timestamptz not null
);
create index if not exists billing_rate_limits_expires_idx
  on public.billing_rate_limits (expires_at);

-- ── RLS: activado, sin políticas ─────────────────────────────────────────
alter table public.billing_products       enable row level security;
alter table public.billing_orders         enable row level security;
alter table public.billing_entitlements   enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.billing_rate_limits    enable row level security;

revoke all on public.billing_products, public.billing_orders,
              public.billing_entitlements, public.billing_webhook_events,
              public.billing_rate_limits
  from anon, authenticated;

-- ── Consulta de permisos para las apps ───────────────────────────────────
-- Devuelve los permisos del usuario autenticado. El email sale de auth.users
-- (no del cliente) y solo si está verificado: sin verificación, cualquiera
-- podría registrarse con el email de un cliente y heredar su acceso.
create or replace function public.get_my_entitlements()
returns table (
  product_slug  text,
  status        text,
  valid_until   timestamptz,
  is_active     boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.product_slug,
         e.status,
         e.valid_until,
         (e.status in ('trial', 'active')
           and (e.valid_until is null or e.valid_until > now())) as is_active
  from auth.users u
  join public.billing_entitlements e on e.email = lower(u.email)
  where u.id = auth.uid()
    and u.email_confirmed_at is not null;
$$;

revoke all on function public.get_my_entitlements() from public, anon;
grant execute on function public.get_my_entitlements() to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- Funciones para que el sitio escale (solo service role)
-- ══════════════════════════════════════════════════════════════════════════

-- Cuenta un intento y dice si todavía está dentro del límite. Atómica: dos
-- pedidos simultáneos no se pisan.
create or replace function public.billing_rate_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hits integer;
begin
  if p_key is null or char_length(p_key) > 200 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'parametros invalidos';
  end if;
  insert into public.billing_rate_limits as r (key, hits, expires_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set hits       = case when r.expires_at <= now() then 1 else r.hits + 1 end,
        expires_at = case when r.expires_at <= now()
                          then now() + make_interval(secs => p_window_seconds)
                          else r.expires_at end
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

-- Permiso "efectivo": un permiso activo/en prueba cuyo vencimiento ya pasó
-- cuenta como vencido aunque nadie haya actualizado la fila todavía.
-- Resumen del panel /admin calculado en la base (no baja miles de filas).
create or replace function public.billing_admin_summary(p_month_start timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with eff as (
    select e.product_slug,
           e.created_at,
           e.updated_at,
           e.source_order_id,
           case
             when e.status = 'active' and (e.valid_until is null or e.valid_until > now()) then 'active'
             when e.status = 'trial'  and e.valid_until > now() then 'trial'
             when e.status = 'past_due' and e.valid_until > now() then 'past_due'
             else 'cancelled'
           end as eff_status,
           e.status as raw_status
    from public.billing_entitlements e
  ),
  per_product as (
    select p.slug, p.name, p.billing_type, p.active as on_sale, p.created_at,
      count(*) filter (where e.eff_status = 'active')   as active,
      count(*) filter (where e.eff_status = 'trial')    as trial,
      count(*) filter (where e.eff_status = 'past_due') as past_due,
      count(*) filter (where e.eff_status = 'cancelled') as cancelled,
      coalesce(sum(o.amount_ars) filter (
        where p.billing_type = 'subscription' and e.eff_status = 'active'
      ), 0) as mrr_ars,
      count(*) filter (where e.created_at >= p_month_start) as new_this_month,
      count(*) filter (where e.raw_status in ('cancelled', 'expired') and e.updated_at >= p_month_start) as churned_this_month
    from public.billing_products p
    left join eff e on e.product_slug = p.slug
    left join public.billing_orders o on o.id = e.source_order_id
    group by p.slug, p.name, p.billing_type, p.active, p.created_at
  ),
  one_time as (
    select product_slug, coalesce(sum(amount_ars), 0) as total
    from public.billing_orders
    where billing_type = 'one_time' and status = 'approved' and paid_at >= p_month_start
    group by product_slug
  )
  select jsonb_build_object(
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', pp.slug,
        'name', pp.name,
        'billing_type', pp.billing_type,
        'on_sale', pp.on_sale,
        'active', pp.active,
        'trial', pp.trial,
        'past_due', pp.past_due,
        'cancelled', pp.cancelled,
        'mrr_ars', pp.mrr_ars,
        'one_time_month_ars', coalesce(ot.total, 0),
        'new_this_month', pp.new_this_month,
        'churned_this_month', pp.churned_this_month
      ) order by pp.created_at)
      from per_product pp
      left join one_time ot on ot.product_slug = pp.slug
    ), '[]'::jsonb),
    'recent_orders', coalesce((
      select jsonb_agg(to_jsonb(r))
      from (
        select id, product_slug, email, billing_type, status, amount_ars, created_at, paid_at
        from public.billing_orders
        order by created_at desc
        limit 20
      ) r
    ), '[]'::jsonb)
  );
$$;

-- Suscripciones cuyo permiso está por vencer (o venció hace poco): el job
-- diario las vuelve a consultar en Mercado Pago por si se perdió un aviso.
create or replace function public.billing_due_orders(p_limit integer default 40)
returns setof public.billing_orders
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select o.*
  from public.billing_entitlements e
  join public.billing_orders o on o.id = e.source_order_id
  where e.status in ('trial', 'active', 'past_due')
    and e.valid_until is not null
    and e.valid_until <  now() + interval '1 day'
    and e.valid_until >  now() - interval '7 days'
    and o.billing_type = 'subscription'
    and o.mp_preapproval_id is not null
  order by e.valid_until
  limit least(greatest(p_limit, 1), 200);
$$;

-- Limpieza: eventos viejos, límites vencidos, permisos vencidos hace más de
-- una semana y pedidos que quedaron "created" (el sitio se cayó a mitad).
create or replace function public.billing_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_events  integer;
  v_limits  integer;
  v_expired integer;
  v_orders  integer;
begin
  delete from public.billing_webhook_events where received_at < now() - interval '45 days';
  get diagnostics v_events = row_count;
  delete from public.billing_rate_limits where expires_at < now();
  get diagnostics v_limits = row_count;
  update public.billing_entitlements
     set status = 'expired', updated_at = now()
   where status in ('trial', 'active', 'past_due')
     and valid_until is not null
     and valid_until < now() - interval '7 days';
  get diagnostics v_expired = row_count;
  update public.billing_orders
     set status = 'failed'
   where status = 'created' and created_at < now() - interval '1 day';
  get diagnostics v_orders = row_count;
  return jsonb_build_object(
    'events_deleted', v_events, 'rate_limits_deleted', v_limits,
    'entitlements_expired', v_expired, 'orders_failed', v_orders);
end;
$$;

-- Solo el service role puede ejecutar estas funciones.
revoke all on function public.billing_rate_hit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.billing_admin_summary(timestamptz)       from public, anon, authenticated;
revoke all on function public.billing_due_orders(integer)              from public, anon, authenticated;
revoke all on function public.billing_maintenance()                    from public, anon, authenticated;
grant execute on function public.billing_rate_hit(text, integer, integer) to service_role;
grant execute on function public.billing_admin_summary(timestamptz)       to service_role;
grant execute on function public.billing_due_orders(integer)              to service_role;
grant execute on function public.billing_maintenance()                    to service_role;
