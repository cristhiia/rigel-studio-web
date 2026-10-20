import { handleStatus } from '../_lib/billing.js'

// Envoltorio de compatibilidad de /api/billing/status con product=keelwise.
export default function handler(req, res) {
  return handleStatus(req, res, { product: 'keelwise' })
}
