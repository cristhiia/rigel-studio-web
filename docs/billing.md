# Billing multiproducto

Un solo backend cobra todas las apps de Rigel Studio con Mercado Pago.
Vender una app nueva = **una fila en `billing_products` + una landing**.

## Piezas

| pieza | dónde |
|-------|-------|
| Esquema (5 tablas + funciones) | `supabase/migrations/billing.sql` (idempotente) |
| Productos | `supabase/seed/products.sql` |
| Lógica | `api/_lib/billing.js` (+ `mercadopago.js`, `billingStore.js`, `http.js`) |
| Endpoints | `api/billing/{checkout,webhook,status,download,reconcile}.js`, `api/admin/summary.js` (7 funciones de Vercel contando `api/contact.js`; el plan Hobby permite 12) |
| Precio | `scripts/set-price.js` (`npm run billing:price`) |
| Panel | `/admin` (solo lectura), login en `/admin/ingresar` |
| Permisos en las apps | `docs/billing-entitlement.md` |
| Pruebas | `tests/billing*.test.js` (`npm test`): SQL en Postgres real, escala, seguridad |

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
| Activos / En prueba / Morosos / Cancelados | permisos por estado **efectivo**: un permiso `active`/`trial` cuyo vencimiento ya pasó cuenta como cancelado aunque nadie haya actualizado la fila |
| Ingreso mensual recurrente | suma de `amount_ars` del pedido de cada suscripción `active` (no cuenta pruebas) |
| Pagos únicos del mes | pedidos `approved` con `paid_at` en el mes |
| Altas del mes | permisos creados en el mes (primera vez que ese email tuvo acceso) |
| Bajas del mes | permisos `cancelled`/`expired` actualizados en el mes |
| Últimos pedidos | los 20 más nuevos, de todos los productos |

## Escala: qué pasa con muchos suscriptores

Cómo está pensado para crecer sin rehacerlo (cifras de referencia, plan Hobby de
Vercel + Supabase):

| tema | cómo está resuelto |
|------|--------------------|
| Cobros mensuales | los hace Mercado Pago, no el sitio. El sitio solo **recibe avisos**: 1 aviso por cobro (~1–3 llamadas a la base y 1 a MP). 1.000 suscriptores = ~1.000 avisos al mes. Es poco para una función serverless |
| Avisos duplicados o desordenados | cada aviso se deduplica por id y siempre se consulta el **estado real** en MP. Procesar de más no cambia el resultado |
| Avisos perdidos | **conciliación diaria** (`/api/billing/reconcile`, Vercel Cron, entre las 03:00 y las 04:00 de Argentina: en Hobby Vercel corre el cron en algún momento de esa hora): vuelve a consultar en MP las suscripciones cuyo permiso vence en menos de un día (o venció hace menos de 7) y corrige el estado. Un aviso perdido deja a un cliente con el estado viejo, como mucho, un día |
| Resumen de `/admin` | se calcula **dentro de la base** (`billing_admin_summary`). El código anterior bajaba hasta 5.000 pedidos y todos los permisos, y PostgREST corta en 1.000 filas sin avisar: con más de 1.000 clientes los números habrían salido mal |
| Permisos vencidos | el acceso se calcula siempre contra `valid_until` (no depende de un job). La limpieza diaria además marca `expired` los vencidos hace más de 7 días |
| Límite de intentos | contador **compartido** en la base (`billing_rate_hit`), además del de memoria de cada instancia (que no se ve entre instancias). Checkout: 5 por hora por email+producto y 30 cada 10 min por IP; status: 60/min por IP; descarga: 10/min por IP. Si la tabla de límites falla se deja pasar (no se corta una venta) |
| Crecimiento de tablas | `billing_webhook_events` y `billing_rate_limits` se limpian solas (45 días / al vencer). `billing_orders` y `billing_entitlements` crecen 1 fila por intento / por cliente: con millones de filas siguen rápidas con los índices creados |
| Plan de funciones de Vercel | 7 de 12. Se sacaron los 4 envoltorios `api/keelwise/*` (nunca estuvieron en producción) |

Límites a tener presentes (no son del código):

- **Vercel Hobby es para uso personal y no comercial** (lo dice su documentación
  oficial, "fair use"). Con ventas reales corresponde Vercel Pro. Pro también
  permite cron más frecuente (Hobby: una vez por día) y logs de 1 día (Hobby: 1 hora).
- **Supabase plan gratis**: 500 MB de base, 1 GB de archivos y 5 GB de
  transferencia al mes (documentación oficial). Además, según lo que sé, el
  proyecto gratis se pausa tras una semana sin actividad, no incluye backups y
  limita cada archivo a 50 MB: **verificarlo en el panel antes de lanzar**. Para
  cobrar conviene el plan Pro (sin pausa, con backups).
- **La APK y la transferencia**: con una APK de 40 MB, 120 descargas agotan los
  5 GB del mes. Para APK grandes o muchos clientes: APK solo `arm64-v8a`, o un
  bucket de Cloudflare R2 (sin costo de transferencia) con el mismo link firmado.
- **Mercado Pago** limita las llamadas a su API por cuenta; el sitio hace pocas
  (1 por aviso, 1 por intento de compra, 1 por consulta de `/gracias` mientras
  espera el aviso).

Si las ventas crecen, lo primero que conviene mirar es el uso de IA por cliente
en Keelwise (costo variable), no este backend.

## Seguridad

Qué se revisó y dónde se prueba (`tests/billing-security.test.js` y
`tests/billing-sql.test.js`):

- **Base**: RLS activado en las 5 tablas, sin políticas y sin permisos para
  `anon`/`authenticated`; solo el service role (servidor) las toca. Las
  funciones `billing_*` solo las ejecuta el service role; `get_my_entitlements()`
  solo usuarios con sesión y devuelve únicamente lo del email verificado de ese
  usuario. Todas las funciones `security definer` fijan `search_path`.
- **Entradas**: cada parámetro (query, body, headers y método) de cada endpoint
  se prueba con ~90 valores hostiles (inyección SQL, `../`, saltos de línea,
  tipos raros, arreglos, objetos, textos gigantes, `__proto__`). Para entradas
  inválidas: respuesta 400/401/403/404/405/429, **cero llamadas a MP, cero
  escrituras**, sin secretos ni eco de lo enviado, `nosniff` y `no-store`.
- **Precio**: el cliente no puede cambiar monto, moneda, prueba, estado ni URL
  de vuelta; todo sale de `billing_products`.
- **Webhook**: firma HMAC obligatoria (sin secreto configurado, ninguna pasa);
  comparación en tiempo constante; ids validados antes de tocar MP; el estado
  se lee siempre de la API de MP. Un reenvío (replay) de un aviso firmado no
  cambia nada. Un pago por menos del monto o en otra moneda no habilita.
- **Acceso**: `/admin` y el cron responden **404 uniforme** a cualquier
  credencial inválida; el admin exige JWT válido de Supabase, email verificado
  y estar en `ADMIN_EMAILS`. La descarga exige permiso activo y devuelve un link
  firmado de 10 minutos de un bucket privado. `status` solo devuelve
  `{ active, status }`.
- **Logs**: los valores que vienen de afuera se sanean antes de loguearse (sin
  saltos de línea). Los emails y las IP no se guardan en claro en los límites.
- **Cabeceras**: `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy` y `Permissions-Policy` en todo el sitio; `no-store` en la API.
  No hay CSP todavía: el sitio usa estilos en línea y animaciones, y una CSP
  mal puesta lo rompe. Queda como mejora aparte, probándola en un preview.
- **Navegador**: el test revisa que ningún secreto del servidor aparezca en
  `src/` y que las únicas variables `VITE_` de billing sean las dos públicas.

Recomendado además (manual): activar MFA para el usuario admin en Supabase,
usar una contraseña larga de gestor, y rotar `MP_ACCESS_TOKEN` y
`SUPABASE_SERVICE_ROLE_KEY` si alguna vez se pegan en un chat o un log.

Riesgos conocidos y aceptados:

- Un aviso firmado se puede reenviar (MP no documenta una tolerancia de
  tiempo), pero es inofensivo: se vuelve a leer el estado real en MP.
- Quien conoce el `preapproval_id` de una compra (aparece en la URL de
  `/gracias`) puede pedir el link de descarga mientras el permiso esté activo.
  La APK sin cuenta de la app no sirve de nada; si se quiere cerrar, hay que
  pedir login antes de descargar.
- Un mismo email puede iniciar compras ajenas (el pago lo hace otra persona con
  su cuenta de MP): no da acceso a nadie más que a ese email.

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
| `CRON_SECRET` | autentica el cron diario (`/api/billing/reconcile`). Mínimo 16 caracteres al azar; Vercel lo manda solo | **sí** |
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

## Preparar Supabase (una sola vez)

1. Proyecto de Supabase **de las apps** (el mismo donde se registran los usuarios).
2. SQL Editor → pegar `supabase/migrations/billing.sql` completo → Run. Después
   `supabase/seed/products.sql` → Run. Se pueden volver a correr sin romper nada.
3. Table Editor: tienen que verse `billing_products` (con Keelwise),
   `billing_orders`, `billing_entitlements`, `billing_webhook_events` y
   `billing_rate_limits`, cada una con el candado de RLS activo.
4. Storage → *New bucket* → nombre `apks` → **sin** marcar "Public bucket".
   Subir `keelwise.apk` (máximo 50 MB en el plan gratis).
5. Project Settings → API: copiar la URL y las claves. `anon` es pública;
   `service_role` va **solo** en `SUPABASE_SERVICE_ROLE_KEY` de Vercel.
6. Authentication → Users → *Add user* con tu email (confirmado) para `/admin`.

Tests locales (sin red, MP y Supabase mockeados; el SQL corre en un Postgres
real en memoria con PGlite): `npm test`.
