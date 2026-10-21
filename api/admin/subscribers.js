import { handleAdminSubscribers } from '../_lib/billingAdmin.js'

// Listado de suscriptores del panel /admin (GET). Requiere JWT de un email en ADMIN_EMAILS.
export default function handler(req, res) {
  return handleAdminSubscribers(req, res)
}
