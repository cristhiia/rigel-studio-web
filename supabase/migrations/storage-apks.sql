-- Bucket privado para los APK que se entregan a quien paga (BILLING_STORAGE_BUCKET,
-- por defecto "apks"). Privado = nadie lo baja con una URL pública: el sitio
-- genera un link firmado de 10 minutos cuando el permiso está activo
-- (api/billing/download). Idempotente.
-- El límite de tamaño por archivo depende del plan de Supabase: si el APK lo
-- supera, la subida falla; en el plan gratis el máximo es de 50 MB.
insert into storage.buckets (id, name, public)
values ('apks', 'apks', false)
on conflict (id) do update set public = false;
