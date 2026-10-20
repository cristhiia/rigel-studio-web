-- Productos a la venta. Correr después de supabase/migrations/billing.sql.
-- Se puede volver a correr: actualiza los datos del producto pero NO pisa
-- price_ars (eso se maneja con `npm run billing:price`).

insert into public.billing_products
  (slug, name, billing_type, price_usd, trial_days, delivery_type, delivery_ref, active)
values
  ('keelwise', 'Keelwise', 'subscription', 10, 7, 'apk', 'keelwise.apk', true)
on conflict (slug) do update set
  name          = excluded.name,
  billing_type  = excluded.billing_type,
  price_usd     = excluded.price_usd,
  trial_days    = excluded.trial_days,
  delivery_type = excluded.delivery_type,
  delivery_ref  = excluded.delivery_ref,
  active        = excluded.active;

-- price_ars queda vacío hasta correr:
--   npm run billing:price -- --product keelwise --usd-rate <cotización> --apply
-- Mientras esté vacío, el checkout usa KEELWISE_PRICE_ARS como respaldo.
