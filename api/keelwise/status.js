import {
  clientIp,
  createMpClient,
  createRateLimiter,
  isActivePreapproval,
  isValidMpId,
} from '../_lib/keelwise.js'

const allow = createRateLimiter({ limit: 30, windowMs: 60_000 })

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }
  if (!allow(clientIp(req))) {
    return res.status(429).json({ error: 'Demasiadas consultas, esperá un minuto' })
  }

  const preapprovalId = String((req.query && req.query.preapproval_id) || '')
  if (!isValidMpId(preapprovalId)) {
    return res.status(400).json({ error: 'preapproval_id inválido' })
  }
  if (!process.env.MP_ACCESS_TOKEN) {
    return res.status(503).json({ error: 'No disponible' })
  }

  try {
    const mp = createMpClient({ accessToken: process.env.MP_ACCESS_TOKEN })
    const active = await isActivePreapproval(preapprovalId, mp)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ active })
  } catch (error) {
    console.error('[keelwise/status] error consultando MP:', error.message)
    return res.status(502).json({ error: 'No pudimos consultar el estado' })
  }
}
