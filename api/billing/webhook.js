import { handleWebhook } from '../_lib/billing.js'

// Notificaciones de Mercado Pago de todos los productos (suscripciones y pagos únicos).
export default function handler(req, res) {
  return handleWebhook(req, res)
}
