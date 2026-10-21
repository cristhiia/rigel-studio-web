import { handleAdminManage } from '../_lib/billingAdmin.js'

// Acciones del panel /admin: POST { action: 'grant' | 'revoke' | 'price', ... }
// y GET (historial). Requiere JWT de un email en ADMIN_EMAILS.
export default function handler(req, res) {
  return handleAdminManage(req, res)
}
