import { handleDownload } from '../_lib/billing.js'

// Igual que status; si el permiso está activo devuelve la entrega del producto.
export default function handler(req, res) {
  return handleDownload(req, res)
}
