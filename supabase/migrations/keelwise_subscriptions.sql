-- Keelwise — suscripciones (Mercado Pago Suscripciones)
-- NO se ejecutó contra ninguna base. Correr manualmente en el proyecto de
-- Supabase que usa la app Keelwise (ver docs/keelwise-entitlement.md).
--
-- Escribe solo el webhook del sitio (api/keelwise/webhook.js) con la
-- service role key, que saltea RLS. RLS queda activado y SIN políticas:
-- ningún cliente anon/authenticated puede leer ni escribir la tabla directo.

create table if not exists public.keelwise_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  email              text        not null,
  mp_preapproval_id  text        not null,
  status             text        not null
                     check (status in ('authorized', 'pending', 'paused', 'cancelled')),
  next_payment_date  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint keelwise_subscriptions_email_lowercase check (email = lower(email))
);

-- Idempotencia del webhook: upsert por mp_preapproval_id.
create unique index if not exists keelwise_subscriptions_preapproval_uidx
  on public.keelwise_subscriptions (mp_preapproval_id);

create index if not exists keelwise_subscriptions_email_idx
  on public.keelwise_subscriptions (email);

alter table public.keelwise_subscriptions enable row level security;

-- Sin políticas a propósito. La app consulta el estado vía la función
-- keelwise_has_active_subscription() (SECURITY DEFINER), que solo devuelve un
-- booleano para el email del usuario autenticado.
create or replace function public.keelwise_has_active_subscription()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.keelwise_subscriptions s
    where s.email = lower(auth.jwt() ->> 'email')
      and s.status = 'authorized'
  );
$$;

revoke all on function public.keelwise_has_active_subscription() from public, anon;
grant execute on function public.keelwise_has_active_subscription() to authenticated;
