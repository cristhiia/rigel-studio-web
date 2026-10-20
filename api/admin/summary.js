import { handleAdminSummary } from '../_lib/billing.js'

// Resumen del panel /admin. Requiere JWT de Supabase de un email en ADMIN_EMAILS.
export default function handler(req, res) {
  return handleAdminSummary(req, res)
}
