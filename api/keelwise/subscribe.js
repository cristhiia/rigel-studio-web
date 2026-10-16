import {
  buildPreapprovalPayload,
  createMpClient,
  isValidEmail,
  parsePriceArs,
} from '../_lib/keelwise.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const email = req.body && req.body.email
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' })
  }

  const priceArs = parsePriceArs(process.env.KEELWISE_PRICE_ARS)
  const { MP_ACCESS_TOKEN, SITE_URL } = process.env
  if (!priceArs || !MP_ACCESS_TOKEN || !SITE_URL) {
    console.error('[keelwise/subscribe] configuración incompleta (precio, token o SITE_URL)')
    return res.status(503).json({ error: 'La suscripción todavía no está disponible' })
  }

  try {
    const mp = createMpClient({ accessToken: MP_ACCESS_TOKEN })
    const preapproval = await mp.createPreapproval(
      buildPreapprovalPayload({ email, priceArs, siteUrl: SITE_URL }),
    )
    if (!preapproval.init_point) throw new Error('MP no devolvió init_point')
    return res.status(200).json({ init_point: preapproval.init_point })
  } catch (error) {
    console.error('[keelwise/subscribe] error al crear preapproval:', error.message, error.mpMessage || '')
    return res.status(502).json({ error: 'No pudimos iniciar la suscripción. Probá de nuevo en unos minutos.' })
  }
}
