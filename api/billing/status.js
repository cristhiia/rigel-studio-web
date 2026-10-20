import { handleStatus } from '../_lib/billing.js'

// GET ?product=slug&order=<id> | &preapproval_id=<id> → { active, status }
export default function handler(req, res) {
  return handleStatus(req, res)
}
