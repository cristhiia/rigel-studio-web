import {
  createMpClient,
  createSupabaseStore,
  processNotification,
  verifySignature,
} from '../_lib/keelwise.js'

// Notificaciones de Mercado Pago Suscripciones.
// Responde rápido: verificación local + una o dos consultas a MP con timeout
// de 3.5 s y un upsert. Ante una falla transitoria devuelve 500 para que MP
// reintente; el procesamiento es idempotente.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const query = req.query || {}
  const body = req.body || {}
  const dataId = String(query['data.id'] || (body.data && body.data.id) || '')
  const type = String(query.type || body.type || query.topic || '')

  const valid = verifySignature({
    signatureHeader: req.headers['x-signature'],
    requestId: req.headers['x-request-id'],
    dataId,
    secret: process.env.MP_WEBHOOK_SECRET,
  })
  if (!valid) {
    console.warn('[keelwise/webhook] firma inválida', { type, dataId })
    return res.status(401).json({ error: 'Firma inválida' })
  }

  const { MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[keelwise/webhook] configuración incompleta')
    return res.status(500).json({ error: 'Configuración incompleta' })
  }

  try {
    const result = await processNotification(
      { type, dataId },
      {
        mp: createMpClient({ accessToken: MP_ACCESS_TOKEN }),
        store: await createSupabaseStore({ url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY }),
      },
    )
    if (!result.handled) console.log('[keelwise/webhook] sin cambios:', result.reason, { type, dataId })
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('[keelwise/webhook] error procesando', { type, dataId, message: error.message })
    return res.status(500).json({ error: 'Error procesando la notificación' })
  }
}
