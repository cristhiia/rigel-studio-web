-- Rigel Studio — billing multiproducto (Mercado Pago)
-- NO se ejecutó contra ninguna base. Correr manualmente, una sola vez, en el
-- proyecto de Supabase que usan las apps para Auth (ver docs/billing.md).
-- Después correr supabase/seed/products.sql.
--
-- Escribe solo el sitio (api/billing/*) con la service role key, que saltea
-- RLS. Las cuatro tablas tienen RLS activado y NINGUNA política: ningún
-- cliente anon/authenticated las lee ni escribe directo. Las apps consultan
-- sus permisos con get_my_entitlements() (security definer).

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
create index if not exists billing_orders_email_idx
  on public.billing_orders (email);

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

-- ── Eventos del webhook (idempotencia) ───────────────────────────────────
create table if not exists public.billing_webhook_events (
  id            text        primary key,   -- id de la notificación de MP
  type          text,
  data_id       text,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz                -- null = recibido pero no terminado (se reintenta)
);

-- ── RLS: activado, sin políticas ─────────────────────────────────────────
alter table public.billing_products       enable row level security;
alter table public.billing_orders         enable row level security;
alter table public.billing_entitlements   enable row level security;
alter table public.billing_webhook_events enable row level security;

revoke all on public.billing_products, public.billing_orders,
              public.billing_entitlements, public.billing_webhook_events
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
