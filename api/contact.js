import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { nombre, email, empresa, presupuesto, mensaje } = req.body

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    await transporter.sendMail({
      from: `"Rigel Studio Web" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      replyTo: email,
      subject: `Nuevo contacto: ${nombre}${empresa ? ' — ' + empresa : ''}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #212842;">Nuevo contacto desde la web</h2>
          <p><strong>Nombre:</strong> ${nombre}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Empresa:</strong> ${empresa || 'No especificada'}</p>
          <p><strong>Presupuesto:</strong> ${presupuesto || 'No especificado'}</p>
          <p><strong>Mensaje:</strong></p>
          <p style="background: #f5f5f5; padding: 16px; border-left: 3px solid #D4AF37;">${mensaje}</p>
        </div>
      `,
    })

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error enviando email:', error)
    console.error('SMTP Error:', error.message)
    console.error('SMTP Error code:', error.code)
    return res.status(500).json({ error: 'Error al enviar el mensaje' })
  }
}
