import { handleCheckout } from '../_lib/billing.js'

// Envoltorio de compatibilidad: POST {email} → { init_point }.
export default function handler(req, res) {
  return handleCheckout(req, res, { product: 'keelwise', responseKey: 'init_point' })
}
