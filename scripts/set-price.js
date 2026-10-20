#!/usr/bin/env node
// Recalcula billing_products.price_ars = price_usd × cotización.
//
//   npm run billing:price -- --product keelwise --usd-rate 1450            (solo muestra)
//   npm run billing:price -- --product keelwise --usd-rate 1450 --apply    (guarda)
//   opcional: --round 100  (redondea a múltiplos de 100 pesos)
//
// Lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del entorno o de .env.local.
// Solo cambia el precio de las compras NUEVAS: las suscripciones ya creadas en
// Mercado Pago siguen con su monto (ver docs/billing.md).
import fs from 'node:fs'
import { parseArgs } from 'node:util'
import { isValidSlug, planPriceChange } from '../api/_lib/billing.js'
import { createSupabaseStore } from '../api/_lib/billingStore.js'

const fmt = n => (n === null ? '(vacío)' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n))

function usage(msg) {
  if (msg) console.error(`Error: ${msg}\n`)
  console.error('Uso: npm run billing:price -- --product <slug> --usd-rate <cotización> [--round <pesos>] [--apply]')
  process.exit(1)
}

async function main() {
  let values
  try {
    ;({ values } = parseArgs({
      options: {
        product: { type: 'string' },
        'usd-rate': { type: 'string' },
        round: { type: 'string', default: '1' },
        apply: { type: 'boolean', default: false },
      },
    }))
  } catch (err) {
    usage(err.message)
  }
  if (!isValidSlug(values.product)) usage('falta --product o no es un slug válido')
  if (!values['usd-rate']) usage('falta --usd-rate')

  if (fs.existsSync('.env.local') && typeof process.loadEnvFile === 'function') process.loadEnvFile('.env.local')
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) usage('faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (entorno o .env.local)')

  const store = await createSupabaseStore({ url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY })
  const product = await store.getProduct(values.product)
  if (!product) usage(`no existe el producto "${values.product}" en billing_products`)

  let plan
  try {
    plan = planPriceChange(product, { usdRate: values['usd-rate'], round: values.round })
  } catch (err) {
    usage(err.message)
  }

  console.log(`Producto:   ${product.name} (${plan.slug})`)
  console.log(`Precio USD: ${plan.price_usd} × ${plan.usd_rate}`)
  console.log(`price_ars:  ${fmt(plan.current)} → ${fmt(plan.next)}`)

  if (!plan.changed) return console.log('\nSin cambios.')
  if (!values.apply) return console.log('\nDry-run: no se guardó nada. Repetí con --apply para guardar.')

  await store.updateProductPrice(plan.slug, plan.next)
  console.log('\nGuardado. Aplica a las compras nuevas; las suscripciones ya creadas no cambian.')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
