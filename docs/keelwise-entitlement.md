# Keelwise — cómo la app sabe si el usuario tiene suscripción activa

Estado: propuesta. No se tocó el repo de la app.

## Flujo

1. El usuario se suscribe desde `rigelstudio.com.ar/keelwise` con su email.
   El sitio crea un *preapproval* en Mercado Pago con
   `external_reference = email normalizado` (minúsculas, sin espacios).
2. Mercado Pago notifica a `POST /api/keelwise/webhook`. El webhook verifica la
   firma, consulta el preapproval en MP y hace upsert en
   `public.keelwise_subscriptions` (una fila por `mp_preapproval_id`).
3. La app, con el usuario logueado en Supabase Auth, pregunta si **su email**
   tiene una suscripción en estado `authorized`.

Estados de Mercado Pago que se guardan: `authorized` (activa, incluye los
7 días de prueba), `pending`, `paused`, `cancelled`. Solo `authorized` habilita.

## Requisito: mismo proyecto de Supabase

La tabla y la función tienen que vivir en el **mismo proyecto de Supabase que
usa la app para Auth**, porque la función lee el email del JWT del usuario.
Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del sitio deben
apuntar a ese proyecto.

El email con el que el usuario se suscribe tiene que ser el mismo con el que
se registra en la app. Conviene decirlo en la pantalla de login de la app.

## Opción recomendada: RPC

El SQL está en `supabase/migrations/keelwise_subscriptions.sql`:

```sql
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
```

Uso desde la app (supabase-js):

```ts
const { data: active, error } = await supabase.rpc('keelwise_has_active_subscription');
if (error) {
  // Sin red o error del servidor: usar el último valor conocido (cache local)
  // con un período de gracia, en lugar de bloquear al usuario de golpe.
}
```

Por qué así:
- La tabla tiene RLS activado y ninguna política: nadie la lee directo.
- La función solo responde `true/false` para el email del propio usuario;
  no expone ids de Mercado Pago ni fechas de cobro de otras personas.
- `auth.jwt() ->> 'email'` sale del token firmado por Supabase, el cliente no
  puede inventarlo.

Sugerencias para la app:
- Consultar al abrir la app y al volver a primer plano; guardar el resultado
  con fecha en SecureStore.
- Si la consulta falla, respetar el último `true` durante unos días antes de
  bloquear (evita cortar a alguien que paga por un problema de red).
- Exigir email verificado en Supabase Auth; si no, alguien podría registrarse
  con el email de otro suscriptor.

## Alternativa: Edge Function

Si se necesita lógica extra (por ejemplo devolver `next_payment_date` del
propio usuario), una Edge Function `keelwise-entitlement` que lea el usuario
del header `Authorization`, consulte la tabla con la service role y devuelva
`{ active, next_payment_date }` solo para ese email. La RPC alcanza para el
caso actual.
