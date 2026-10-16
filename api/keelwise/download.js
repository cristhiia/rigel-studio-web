import {
  clientIp,
  createMpClient,
  createRateLimiter,
  createSupabaseStore,
  isActivePreapproval,
  isValidMpId,
  resolveApkUrl,
} from '../_lib/keelwise.js'

// Entrega el link de la APK solo si el preapproval de Keelwise está activo.
const allow = createRateLimiter({ limit: 10, windowMs: 60_000 })

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

  const { MP_ACCESS_TOKEN, KEELWISE_APK_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  if (!MP_ACCESS_TOKEN || !KEELWISE_APK_URL) {
    return res.status(503).json({ error: 'Descarga no disponible todavía' })
  }

  try {
    const mp = createMpClient({ accessToken: MP_ACCESS_TOKEN })
    if (!(await isActivePreapproval(preapprovalId, mp))) {
      return res.status(403).json({ error: 'La suscripción no está activa' })
    }
    const url = await resolveApkUrl(KEELWISE_APK_URL, {
      getSupabaseClient: async () =>
        (await createSupabaseStore({ url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY })).client,
    })
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ url })
  } catch (error) {
    console.error('[keelwise/download] error:', error.message)
    return res.status(502).json({ error: 'No pudimos generar el link de descarga' })
  }
}
