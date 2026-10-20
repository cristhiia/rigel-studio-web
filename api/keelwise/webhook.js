import { handleWebhook } from '../_lib/billing.js'

// Envoltorio de compatibilidad: si el webhook de MP todavía apunta acá,
// se procesa igual que /api/billing/webhook.
export default function handler(req, res) {
  return handleWebhook(req, res)
}
