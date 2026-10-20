import { handleReconcile } from '../_lib/billing.js'

// Conciliación diaria con Mercado Pago + limpieza (Vercel Cron, ver vercel.json).
export default function handler(req, res) {
  return handleReconcile(req, res)
}
