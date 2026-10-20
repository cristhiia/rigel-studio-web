# Billing multiproducto

Un solo backend cobra todas las apps de Rigel Studio con Mercado Pago.
Vender una app nueva = **una fila en `billing_products` + una landing**.

## Piezas

| pieza | dónde |
|-------|-------|
| Esquema (4 tablas + función) | `supabase/migrations/billing.sql` |
| Productos | `supabase/seed/products.sql` |
| Lógica | `api/_lib/billing.js` (+ `mercadopago.js`, `billingStore.js`, `http.js`) |
| Endpoints | `api/billing/{checkout,webhook,status,download}.js`, `api/admin/summary.js` |
| Compatibilidad | `api/keelwise/*`: envoltorios con `product='keelwise'` |
| Precio | `scripts/set-price.js` (`npm run billing:price`) |
| Panel | `/admin` (solo lectura), login en `/admin/ingresar` |
| Permisos en las apps | `docs/billing-entitlement.md` |

## Agregar un producto

1. Insertar la fila (en el SQL editor de Supabase o sumándola a `supabase/seed/products.sql`):

   ```sql
   insert into public.billing_products
     (slug, name, billing_type, price_usd, trial_days, delivery_type, delivery_ref)
   values
     ('gestor-pacientes', 'Gestor de pacientes', 'subscription', 15, 14, 'web_access', 'https://pacientes.rigelstudio.com.ar');
   ```

2. Fijar el precio en pesos:
   `npm run billing:price -- --product gestor-pacientes --usd-rate 1450 --apply`
3. Hacer la landing en `/<slug>` y la página de vuelta en `/<slug>/gracias`
   (Mercado Pago vuelve ahí). Pueden copiar `src/pages/keelwise/`:
   - el formulario llama a `startCheckout(slug, email)` (`src/lib/billing.js`);
   - el precio se lee con `useBillingProduct(slug, fallback)`;
   - la página de gracias arma la consulta con `accessQuery(slug, params)` y
     consulta `/api/billing/status` y `/api/billing/download`.
4. Agregar la tarjeta en `src/data/products.js` y la ruta en `src/main.jsx`
   (+ `src/data/seo.js` y `public/sitemap.xml`).
5. En la app, habilitar con `get_my_entitlements()` (ver `docs/billing-entitlement.md`).

Para pausar las ventas: `update billing_products set active = false where slug = '...'`
(los clientes existentes conservan su acceso).

**Pendiente:** no hay plantilla genérica de landing (`ProductLanding.jsx`). Cada
producto necesita copy y capturas propias; por ahora se copia la de Keelwise.

### Campos de `billing_products`

| campo | valores |
|-------|---------|
| `slug` | minúsculas y guiones; es la URL (`/<slug>`) y lo que consulta la app |
| `billing_type` | `subscription` (mensual) o `one_time` |
| `price_usd` | referencia que se muestra y base del recálculo |
| `price_ars` | **lo que se cobra**. Fuente de verdad |
| `trial_days` | días gratis (solo suscripciones; 0 = sin prueba) |
| `delivery_type` | `apk`, `web_access`, `license_key`, `manual` |
| `delivery_ref` | `apk`: ruta dentro del bucket privado (ej. `keelwise.apk`) · `web_access`: URL `https://` · `license_key`/`manual`: nota |
| `active` | si se puede comprar |

### Entrega (`/api/billing/download`, solo con permiso activo)

- `apk`: link firmado de Supabase Storage por 10 minutos, del bucket
  `BILLING_STORAGE_BUCKET` (por defecto `apks`, **privado**).
- `web_access`: devuelve la URL de `delivery_ref`. La app igual tiene que
  validar con `get_my_entitlements()`; la URL no es secreta.
- `license_key` y `manual`: devuelven la nota; la entrega es a mano por ahora
  (no hay generación de licencias).

## Los dos tipos de cobro

**Suscripción** (`subscription`): Mercado Pago Suscripciones (*preapproval*).
Cobro mensual en pesos, con `free_trial` si `trial_days > 0`. La prueba es
para la primera vez: si ese email ya tuvo acceso al producto, se crea sin prueba.

**Pago único** (`one_time`): Checkout Pro (*preferencia*). Acceso sin
vencimiento. Un reembolso o contracargo lo cancela.

## Flujo

1. **Checkout** — `POST /api/billing/checkout {product, email}`. Valida email y
   producto activo, crea un pedido en `billing_orders` (`status = created`) y el
   cobro en MP con `external_reference = id del pedido`. Devuelve `{ url }`.
   `GET /api/billing/checkout?product=<slug>` devuelve los datos públicos
   (nombre, precios, días de prueba) que muestra la landing.
2. **Pago** — el cliente paga en MP y vuelve a `/<slug>/gracias`
   (suscripción: `?preapproval_id=…`; pago único: `?external_reference=…&payment_id=…`).
3. **Webhook** — `POST /api/billing/webhook` (uno para todos los productos):
   - verifica `x-signature` con `MP_WEBHOOK_SECRET` → 401 si no valida;
   - deduplica por id de notificación en `billing_webhook_events`; si un
     procesamiento falla, el evento no queda marcado y el reintento de MP lo
     vuelve a procesar;
   - consulta el **estado real** en la API de MP (nunca confía en el body) y
     actualiza `billing_orders` y `billing_entitlements`;
   - timeout de 2 s por llamada a MP y tope total de 4,5 s; ante una falla
     responde 500 para que MP reintente.
4. **Gracias** — la página consulta `/api/billing/status` cada 5 s. Si el
   permiso todavía no está activo, el endpoint consulta MP y sincroniza (por si
   el webhook no llegó aún). Cuando está activo, pide `/api/billing/download`.

### Mapeo de estados

Suscripción (preapproval):

| MP | pedido | permiso |
|----|--------|---------|
| `authorized` en prueba | `authorized` | `trial` |
| `authorized` | `authorized` | `active` |
| `authorized` + cobro rechazado | `authorized` | `past_due` |
| `pending` | `pending` | sin cambios |
| `paused` | `paused` | `past_due` |
| `cancelled` | `cancelled` | `cancelled` |

Pago único:

| MP | pedido | permiso |
|----|--------|---------|
| `approved` | `approved` | `active` (sin vencimiento) |
| `pending`, `in_process`, `authorized` | `pending` | sin cambios |
| `rejected` | `rejected` | sin cambios |
| `cancelled` | `cancelled` | sin cambios |
| `refunded`, `charged_back` | `refunded` | `cancelled` |

Un estado desconocido se loguea (`[billing] estado … desconocido`), responde
200 y no escribe nada. Un pago aprobado por menos del monto del pedido no
habilita. Un evento viejo de otro pedido (ej. la suscripción anterior que se
cancela después de que el cliente se volvió a suscribir) no le saca el acceso
que le da el pedido vigente.

**Decisión pendiente:** al cancelar una suscripción, el acceso se corta en el
momento aunque el mes ya esté pago. Si se prefiere mantenerlo hasta el fin del
período, hay que cambiar `is_active` en `get_my_entitlements()` y
`isEntitlementActive()`.

## Precio

La fuente de verdad es `billing_products.price_ars`.

```bash
npm run billing:price -- --product keelwise --usd-rate 1450              # muestra el cambio (dry-run)
npm run billing:price -- --product keelwise --usd-rate 1450 --apply      # lo guarda
npm run billing:price -- --product keelwise --usd-rate 1487 --round 100  # redondea a $100
```

Lee `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del entorno o de `.env.local`.

**Las suscripciones ya activas no cambian.** Mercado Pago guarda el monto en
cada suscripción al crearla; el nuevo precio aplica solo a las compras nuevas.
Subirle el monto a quien ya está suscripto es una decisión aparte: hay que
avisarle al cliente con anticipación y actualizar cada preapproval en MP
(`PUT /preapproval/{id}` con el nuevo `transaction_amount`). Este script no lo hace.

Respaldo: si `price_ars` está vacío, el checkout usa la variable
`<SLUG>_PRICE_ARS` (ej. `KEELWISE_PRICE_ARS`). Si tampoco está, responde 503.
La landing muestra primero el valor del build y lo reemplaza por el de la base.

## Panel /admin

- Login en `/admin/ingresar` con email y contraseña de Supabase Auth (del
  proyecto de billing). `/admin` sin sesión, o con un usuario que no está en
  `ADMIN_EMAILS` o sin email verificado, vuelve a la home sin explicar nada;
  `/api/admin/summary` responde 404 en todos esos casos.
- `noindex` (meta y header `X-Robots-Tag`), fuera del sitemap, en un chunk aparte.
- Para crear el usuario admin: Supabase → Authentication → Users → *Add user*
  (con el email de `ADMIN_EMAILS`, confirmado).

Definiciones del resumen (mes calendario de Argentina):

| dato | cálculo |
|------|---------|
| Activos / En prueba / Morosos / Cancelados | permisos por estado (`cancelled` + `expired`) |
| Ingreso mensual recurrente | suma de `amount_ars` del pedido de cada suscripción `active` (no cuenta pruebas) |
| Pagos únicos del mes | pedidos `approved` con `paid_at` en el mes |
| Altas del mes | permisos creados en el mes (primera vez que ese email tuvo acceso) |
| Bajas del mes | permisos `cancelled`/`expired` actualizados en el mes |
| Últimos pedidos | los 20 más nuevos, de todos los productos |

## Variables de entorno

Nombres en `.env.example` (sin valores). En Vercel → Settings → Environment Variables.

| variable | uso | secreta |
|----------|-----|---------|
| `MP_ACCESS_TOKEN` | API de Mercado Pago | sí |
| `MP_WEBHOOK_SECRET` | firma del webhook | sí |
| `SUPABASE_URL` | proyecto de billing (el de las apps) | no |
| `SUPABASE_SERVICE_ROLE_KEY` | escribir tablas, firmar descargas, validar JWT | **sí** |
| `SITE_URL` | URLs de vuelta (`https://rigelstudio.com.ar`) | no |
| `ADMIN_EMAILS` | quién ve `/admin` (separados por comas) | no |
| `VITE_BILLING_SUPABASE_URL` / `VITE_BILLING_SUPABASE_ANON_KEY` | login de `/admin` (mismo proyecto) | no (públicas) |
| `BILLING_STORAGE_BUCKET` | opcional, bucket de las APK (default `apks`) | no |
| `KEELWISE_PRICE_ARS` | respaldo del precio | no |

`KEELWISE_APK_URL` ya no se usa (la APK sale de `delivery_ref`): se puede borrar de Vercel.

## Probar en sandbox de Mercado Pago

1. En [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app)
   crear (o usar) la aplicación y dos **usuarios de prueba**: vendedor y comprador.
2. Con el vendedor de prueba, copiar sus **credenciales de producción**
   (en cuentas de prueba son credenciales de test) y cargarlas como
   `MP_ACCESS_TOKEN` en el entorno **Preview** de Vercel.
3. Webhooks → URL `https://<preview>/api/billing/webhook`, eventos
   **Pagos** y **Planes y suscripciones**. Copiar la clave secreta en
   `MP_WEBHOOK_SECRET`. (Los previews tienen protección de Vercel: para que MP
   llegue, usar un *Protection Bypass* o probar el webhook en producción con
   las credenciales de prueba.)
4. Usar un proyecto de Supabase de prueba: correr `billing.sql` + `seed`,
   `npm run billing:price -- --product keelwise --usd-rate 1450 --apply`,
   crear el bucket privado `apks` y subir `keelwise.apk`.
5. Abrir `/keelwise`, suscribirse con el email del **comprador de prueba**
   (MP exige que `payer_email` sea el de la cuenta que paga) y pagar con una
   [tarjeta de prueba](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test/cards)
   (titular `APRO` para aprobado, `OTHE` para rechazado).
6. Verificar: `/keelwise/gracias` muestra la descarga; en Supabase hay un
   pedido `authorized` y un permiso `trial`; `/admin` lo cuenta como "en prueba".
7. Simular el ciclo desde el panel del comprador de prueba (pausar, cancelar) y
   ver que el webhook actualiza el permiso. En Webhooks → *Simular* se puede
   reenviar una notificación; con un id inexistente el endpoint responde 200
   sin cambios (`unknown-order`).

Tests locales (sin red, MP y Supabase mockeados): `npm test`.
