import { handleCheckout } from '../_lib/billing.js'

// GET ?product=slug → datos públicos del producto · POST {product, email} → { url } de pago.
export default function handler(req, res) {
  return handleCheckout(req, res)
}
