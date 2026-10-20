# Cómo una app consulta sus permisos

Cualquier app de Rigel (Keelwise, gestor de pacientes, KioscoPro…) sabe si el
usuario pagó llamando a una sola función de Supabase: `get_my_entitlements()`.
No hace falta backend propio por app.

## Requisitos

- La app usa Supabase Auth en el **mismo proyecto** donde se corrió
  `supabase/migrations/billing.sql` (el de `SUPABASE_URL` del sitio).
- El usuario se registra en la app con **el mismo email** con el que pagó.
  Conviene decirlo en la pantalla de registro.
- El email tiene que estar **verificado** (confirmación de email activada en
  Supabase Auth). Si no lo está, la función no devuelve nada: así nadie puede
  registrarse con el email de un cliente y heredar su acceso.

## Uso (supabase-js)

```ts
const { data, error } = await supabase.rpc('get_my_entitlements');
// data: [{ product_slug: 'keelwise', status: 'trial', valid_until: '2026-10-28T15:00:00Z', is_active: true }]

const keelwise = data?.find(e => e.product_slug === 'keelwise');
const hasAccess = keelwise?.is_active === true;
```

Cada fila es un producto del usuario:

| campo          | qué es |
|----------------|--------|
| `product_slug` | el slug de `billing_products` (ej. `keelwise`) |
| `status`       | `trial`, `active`, `past_due` (cobro fallido o suscripción pausada), `cancelled`, `expired` |
| `valid_until`  | hasta cuándo vale. `null` = sin vencimiento (pago único). En suscripciones: próximo cobro + 3 días de gracia |
| `is_active`    | `true` si `status` es `trial`/`active` y no venció. **Usar este campo** para habilitar |

Sin filas para el producto = nunca pagó (o el email no está verificado).

## Por qué así

- Las tablas de billing tienen RLS activado y ninguna política: nadie las lee
  directo con la anon key.
- La función es `security definer` y toma el email de `auth.users` del usuario
  autenticado (no de un parámetro), así que cada uno solo ve lo suyo.
- Solo devuelve slug, estado y vencimiento: nada de ids de Mercado Pago ni
  montos.

## Sugerencias para la app

- Consultar al abrir la app y al volver a primer plano; guardar el último
  resultado con fecha (SecureStore / localStorage).
- Si la consulta falla por red, respetar el último `is_active = true` durante
  unos días antes de bloquear. `valid_until` ya trae 3 días de gracia.
- Con `status = 'past_due'`, mostrar un aviso para actualizar el medio de pago
  en Mercado Pago en lugar de un bloqueo seco.

## Migración desde la versión anterior (Keelwise)

`keelwise_has_active_subscription()` ya no existe. Reemplazar por:

```ts
const { data } = await supabase.rpc('get_my_entitlements');
const active = data?.some(e => e.product_slug === 'keelwise' && e.is_active) ?? false;
```
