import React, { useState } from 'react';
import LegalPage from './LegalPage';
import { CREAM, GOLD, body, input, primaryButton } from '../../components/ui/pageStyles';

const field = { ...input, borderRadius: 12, width: '100%', boxSizing: 'border-box' };
const fieldLabel = { ...body, color: CREAM, display: 'block', marginBottom: 8 };

const INITIAL = { nombre: '', email: '', email_suscripcion: '', producto: 'Keelwise', fecha_contratacion: '', motivo: '' };

export default function Arrepentimiento() {
  const [form, setForm] = useState(INITIAL);
  const [state, setState] = useState({ sending: false, sent: false, error: '' });
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setState({ sending: true, sent: false, error: '' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tipo: 'arrepentimiento',
          subject: `Botón de arrepentimiento: ${form.producto} — ${form.nombre}`,
        }),
      });
      if (!res.ok) throw new Error();
      setState({ sending: false, sent: true, error: '' });
    } catch {
      setState({ sending: false, sent: false, error: 'No pudimos enviar el pedido. Escribinos a contacto@rigelstudio.com.ar.' });
    }
  }

  return (
    <LegalPage
      path="/arrepentimiento"
      kicker="Legales"
      title="Botón de arrepentimiento"
      intro="Si contrataste un producto de Rigel Studio y querés revocar la contratación, completá este formulario. Te respondemos por email."
      sections={[
        {
          title: 'Antes de enviar',
          paragraphs: [
            'Si tu suscripción a Keelwise es por Mercado Pago, también podés cancelarla vos mismo desde la sección de suscripciones de tu cuenta de Mercado Pago, para que no haya nuevos cobros.',
            'Plazos y alcance de la revocación: [verificar con abogado según la normativa de defensa del consumidor vigente].',
          ],
        },
      ]}
    >
      <section style={{ marginTop: 40 }}>
        {state.sent ? (
          <div role="status" className="glass-card" style={{ padding: 28, borderRadius: 20 }}>
            <p style={{ ...body, color: CREAM, fontSize: '1.1rem' }}>Recibimos tu pedido.</p>
            <p style={{ ...body, marginTop: 8 }}>Te vamos a responder a {form.email} con los próximos pasos.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 20 }}>
            <div>
              <label htmlFor="arr-nombre" style={fieldLabel}>Nombre y apellido *</label>
              <input id="arr-nombre" required autoComplete="name" value={form.nombre} onChange={set('nombre')} style={field} />
            </div>
            <div>
              <label htmlFor="arr-email" style={fieldLabel}>Email de contacto *</label>
              <input id="arr-email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} style={field} />
            </div>
            <div>
              <label htmlFor="arr-producto" style={fieldLabel}>Producto *</label>
              <select id="arr-producto" required value={form.producto} onChange={set('producto')} style={{ ...field, background: '#1A1A2E' }}>
                <option>Keelwise</option>
                <option>Otro servicio de Rigel Studio</option>
              </select>
            </div>
            <div>
              <label htmlFor="arr-email-sus" style={fieldLabel}>Email con el que te suscribiste (si es distinto)</label>
              <input id="arr-email-sus" type="email" value={form.email_suscripcion} onChange={set('email_suscripcion')} style={field} />
            </div>
            <div>
              <label htmlFor="arr-fecha" style={fieldLabel}>Fecha de contratación (aproximada)</label>
              <input id="arr-fecha" type="date" value={form.fecha_contratacion} onChange={set('fecha_contratacion')} style={{ ...field, colorScheme: 'dark' }} />
            </div>
            <div>
              <label htmlFor="arr-motivo" style={fieldLabel}>Motivo (opcional)</label>
              <textarea id="arr-motivo" rows={4} value={form.motivo} onChange={set('motivo')} style={{ ...field, resize: 'vertical' }} />
            </div>
            <div>
              <button type="submit" disabled={state.sending} style={primaryButton}>
                {state.sending ? 'Enviando…' : 'Enviar pedido de arrepentimiento'}
              </button>
            </div>
            {state.error && (
              <p role="alert" style={{ ...body, color: CREAM, borderLeft: `2px solid ${GOLD}`, paddingLeft: 12 }}>{state.error}</p>
            )}
          </form>
        )}
      </section>
    </LegalPage>
  );
}
