import { handleAdminCrm } from '../_lib/crmAdmin.js'

// CRM del panel /admin: GET (fichas, bitácora, publicidad) y POST { action, ... }.
// Requiere JWT de Supabase de un email en ADMIN_EMAILS.
export default function handler(req, res) {
  return handleAdminCrm(req, res)
}
