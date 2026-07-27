import nodemailer from 'nodemailer'

const HEADER_COLORS = {
  idea:       '#1a2340',
  cotizacion: '#7a5c00',
  consulta:   '#2a2a2a',
}

const HEADER_LABELS = {
  idea:       '💡 NUEVA IDEA',
  cotizacion: '📋 COTIZACIÓN',
  consulta:   '❓ CONSULTA',
}

function row(label, value) {
  if (!value) return ''
  return `
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#555;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:8px 12px;color:#222;">${value}</td>
    </tr>`
}

function buildHtml(data) {
  const tipo = data.tipo || 'consulta'
  const headerColor = HEADER_COLORS[tipo] || '#1a2340'
  const headerLabel = HEADER_LABELS[tipo] || '📩 CONTACTO'

  let rows = ''
  rows += row('Nombre',         data.nombre)
  rows += row('Email',          data.email)
  rows += row('WhatsApp',       data.whatsapp)
  rows += row('Empresa',        data.empresa)
  rows += row('Rubro',          data.rubro)
  rows += row('Tipo proyecto',  data.tipo_proyecto)
  rows += row('Presupuesto',    data.presupuesto)
  rows += row('Cuándo',         data.cuando)
  rows += row('Idea',           data.idea)
  rows += row('Descripción',    data.descripcion)
  rows += row('Referencias',    data.referentes)
  rows += row('Consulta',       data.consulta)

  return `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
      <div style="background:${headerColor};padding:24px 28px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:1.3rem;letter-spacing:0.05em;">${headerLabel}</h2>
      </div>
      <div style="border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      <p style="color:#999;font-size:0.75rem;margin-top:16px;text-align:center;">
        Rigel Studio — contacto@rigelstudio.com.ar
      </p>
    </div>
  `
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const data = req.body
  const { nombre, email, tipo } = data

  if (!nombre || !email) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  const subject = data.subject || `Nuevo contacto: ${nombre}`

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: `"Rigel Studio Web" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      replyTo: email,
      subject,
      html: buildHtml(data),
    })

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error completo:', JSON.stringify(error))
    return res.status(500).json({ error: 'Error al enviar', detail: error.message })
  }
}
