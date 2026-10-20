import { handleDownload } from '../_lib/billing.js'

// Envoltorio de compatibilidad de /api/billing/download con product=keelwise.
export default function handler(req, res) {
  return handleDownload(req, res, { product: 'keelwise' })
}
