import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/* ── Shared styles ───────────────────────────────────────────────── */
const inputStyle = {
  background: 'rgba(240,231,213,0.05)',
  border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: 12,
  color: '#F0E7D5',
  padding: '14px 16px',
  width: '100%',
  fontSize: '0.95rem',
  fontFamily: 'Montserrat, sans-serif',
  transition: 'border-color 0.3s ease',
  outline: 'none',
};

const labelStyle = {
  color: 'rgba(240,231,213,0.6)',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  marginBottom: 6,
  display: 'block',
  fontFamily: 'Montserrat, sans-serif',
};

const submitStyle = {
  background: '#D4AF37',
  color: '#0A0E1A',
  fontWeight: 700,
  padding: '16px 40px',
  borderRadius: 100,
  border: 'none',
  fontSize: '0.85rem',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  cursor: 'pointer',
  width: '100%',
  marginTop: 8,
  fontFamily: 'Montserrat, sans-serif',
  transition: 'all 0.3s ease',
};

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function useInputHandlers() {
  return {
    onFocus: (e) => {
      e.target.style.borderColor = '#D4AF37';
      e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.1)';
    },
    onBlur: (e) => {
      e.target.style.borderColor = 'rgba(212,175,55,0.2)';
      e.target.style.boxShadow = 'none';
    },
  };
}

/* ── Success screen ──────────────────────────────────────────────── */
function SuccessScreen({ message, onReset }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div
        style={{
          fontSize: '3rem',
          color: '#D4AF37',
          marginBottom: 24,
          animation: 'pulse 2s infinite',
        }}
      >
        ✦
      </div>
      <h3
        className="font-serif"
        style={{ color: '#F0E7D5', fontSize: '2rem', marginBottom: 16 }}
      >
        ¡Recibido!
      </h3>
      <p
        className="font-montserrat"
        style={{ color: 'rgba(240,231,213,0.7)', lineHeight: 1.7, marginBottom: 32 }}
      >
        {message}
      </p>
      <button
        onClick={onReset}
        style={{ ...submitStyle, width: 'auto', padding: '14px 32px' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F4C842'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#D4AF37'; }}
      >
        Enviar otra consulta
      </button>
    </div>
  );
}

/* ── FLUJO 1 — Contanos tu idea ─────────────────────────────────── */
function FlowIdea({ onSuccess }) {
  const [status, setStatus] = useState('idle');
  const handlers = useInputHandlers();

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    const fd = new FormData(e.target);
    const nombre = fd.get('nombre');
    const data = {
      tipo: 'idea',
      nombre,
      email: fd.get('email'),
      whatsapp: fd.get('whatsapp'),
      idea: fd.get('idea'),
      cuando: fd.get('cuando'),
      subject: `💡 Nueva idea: ${nombre}`,
    };
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        onSuccess('idea');
        e.target.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p className="font-montserrat" style={{ color: 'rgba(240,231,213,0.6)', marginBottom: 8, fontSize: '0.9rem' }}>
        Sin tecnicismos, sin formularios eternos. Solo tu idea.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Nombre *">
          <input name="nombre" type="text" required style={inputStyle} className="contact-input" {...handlers} />
        </Field>
        <Field label="Email *">
          <input name="email" type="email" required style={inputStyle} className="contact-input" {...handlers} />
        </Field>
      </div>

      <Field label="WhatsApp *">
        <input name="whatsapp" type="tel" required style={inputStyle} className="contact-input" {...handlers} />
      </Field>

      <Field label="Tu idea *">
        <textarea
          name="idea"
          required
          rows={5}
          placeholder="Ej: Necesito un sistema para gestionar turnos y pagos de mi consultorio médico..."
          style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
          className="contact-input"
          {...handlers}
        />
      </Field>

      <Field label="¿Cuándo lo necesitás?">
        <select name="cuando" style={{ ...inputStyle, color: 'rgba(240,231,213,0.8)' }} className="contact-input" {...handlers}>
          <option value="Lo antes posible" style={{ background: '#0A0E1A' }}>Lo antes posible</option>
          <option value="En el próximo mes" style={{ background: '#0A0E1A' }}>En el próximo mes</option>
          <option value="En 2-3 meses" style={{ background: '#0A0E1A' }}>En 2-3 meses</option>
          <option value="Todavía explorando" style={{ background: '#0A0E1A' }}>Todavía explorando</option>
        </select>
      </Field>

      <button
        type="submit"
        disabled={status === 'sending'}
        style={{ ...submitStyle, opacity: status === 'sending' ? 0.6 : 1, cursor: status === 'sending' ? 'not-allowed' : 'pointer' }}
        onMouseEnter={(e) => { if (status !== 'sending') e.currentTarget.style.background = '#F4C842'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#D4AF37'; }}
      >
        {status === 'sending' ? 'Enviando...' : 'Enviar mi idea ✦'}
      </button>

      {status === 'error' && (
        <p className="font-montserrat text-sm" style={{ color: 'rgba(240,231,213,0.7)', textAlign: 'center' }}>
          Hubo un problema. Escribinos a contacto@rigelstudio.com.ar
        </p>
      )}
    </form>
  );
}

/* ── FLUJO 2 — Solicitar cotización ─────────────────────────────── */
function FlowCotizacion({ onSuccess }) {
  const [status, setStatus] = useState('idle');
  const handlers = useInputHandlers();

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    const fd = new FormData(e.target);
    const nombre = fd.get('nombre');
    const rubro = fd.get('rubro');
    const presupuesto = fd.get('presupuesto');
    const data = {
      tipo: 'cotizacion',
      nombre,
      empresa: fd.get('empresa'),
      email: fd.get('email'),
      whatsapp: fd.get('whatsapp'),
      rubro,
      tipo_proyecto: fd.get('tipo_proyecto'),
      presupuesto,
      descripcion: fd.get('descripcion'),
      referentes: fd.get('referentes'),
      subject: `📋 Cotización: ${nombre} — ${rubro} — ${presupuesto}`,
    };
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        onSuccess('cotizacion');
        e.target.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p className="font-montserrat" style={{ color: 'rgba(240,231,213,0.6)', marginBottom: 8, fontSize: '0.9rem' }}>
        Ya tenés más claro lo que necesitás. Te mandamos una propuesta en 48 horas.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Nombre *">
          <input name="nombre" type="text" required style={inputStyle} className="contact-input" {...handlers} />
        </Field>
        <Field label="Empresa (opcional)">
          <input name="empresa" type="text" style={inputStyle} className="contact-input" {...handlers} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Email *">
          <input name="email" type="email" required style={inputStyle} className="contact-input" {...handlers} />
        </Field>
        <Field label="WhatsApp *">
          <input name="whatsapp" type="tel" required style={inputStyle} className="contact-input" {...handlers} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Rubro *">
          <select name="rubro" required style={{ ...inputStyle, color: 'rgba(240,231,213,0.8)' }} className="contact-input" {...handlers}>
            <option value="" disabled style={{ background: '#0A0E1A' }}>Seleccioná...</option>
            <option value="Salud" style={{ background: '#0A0E1A' }}>Salud</option>
            <option value="Comercio / Retail" style={{ background: '#0A0E1A' }}>Comercio / Retail</option>
            <option value="Gastronomía" style={{ background: '#0A0E1A' }}>Gastronomía</option>
            <option value="Servicios profesionales" style={{ background: '#0A0E1A' }}>Servicios profesionales</option>
            <option value="Emprendimiento / Startup" style={{ background: '#0A0E1A' }}>Emprendimiento / Startup</option>
            <option value="Industria / Manufactura" style={{ background: '#0A0E1A' }}>Industria / Manufactura</option>
            <option value="Otro" style={{ background: '#0A0E1A' }}>Otro</option>
          </select>
        </Field>
        <Field label="Tipo de proyecto *">
          <select name="tipo_proyecto" required style={{ ...inputStyle, color: 'rgba(240,231,213,0.8)' }} className="contact-input" {...handlers}>
            <option value="" disabled style={{ background: '#0A0E1A' }}>Seleccioná...</option>
            <option value="App móvil iOS/Android" style={{ background: '#0A0E1A' }}>App móvil iOS/Android</option>
            <option value="Sistema de gestión" style={{ background: '#0A0E1A' }}>Sistema de gestión</option>
            <option value="Página web o landing" style={{ background: '#0A0E1A' }}>Página web o landing</option>
            <option value="E-commerce" style={{ background: '#0A0E1A' }}>E-commerce</option>
            <option value="Automatización con IA" style={{ background: '#0A0E1A' }}>Automatización con IA</option>
            <option value="Otro" style={{ background: '#0A0E1A' }}>Otro</option>
          </select>
        </Field>
      </div>

      <Field label="Presupuesto estimado *">
        <select name="presupuesto" required style={{ ...inputStyle, color: 'rgba(240,231,213,0.8)' }} className="contact-input" {...handlers}>
          <option value="" disabled style={{ background: '#0A0E1A' }}>Seleccioná...</option>
          <option value="Hasta $350.000 ARS" style={{ background: '#0A0E1A' }}>Hasta $350.000 ARS</option>
          <option value="$350.000 a $1.200.000 ARS" style={{ background: '#0A0E1A' }}>$350.000 a $1.200.000 ARS</option>
          <option value="$1.200.000 a $2.500.000 ARS" style={{ background: '#0A0E1A' }}>$1.200.000 a $2.500.000 ARS</option>
          <option value="Más de $2.500.000 ARS" style={{ background: '#0A0E1A' }}>Más de $2.500.000 ARS</option>
          <option value="Prefiero hablarlo" style={{ background: '#0A0E1A' }}>Prefiero hablarlo</option>
        </select>
      </Field>

      <Field label="Descripción del proyecto *">
        <textarea
          name="descripcion"
          required
          rows={5}
          placeholder="Contanos con detalle: qué hace tu negocio, qué problema querés resolver, qué funcionalidades necesitás..."
          style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
          className="contact-input"
          {...handlers}
        />
      </Field>

      <Field label="Referencias (opcional)">
        <input
          name="referentes"
          type="text"
          placeholder="Links o apps que se parezcan a lo que buscás"
          style={inputStyle}
          className="contact-input"
          {...handlers}
        />
      </Field>

      <button
        type="submit"
        disabled={status === 'sending'}
        style={{ ...submitStyle, opacity: status === 'sending' ? 0.6 : 1, cursor: status === 'sending' ? 'not-allowed' : 'pointer' }}
        onMouseEnter={(e) => { if (status !== 'sending') e.currentTarget.style.background = '#F4C842'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#D4AF37'; }}
      >
        {status === 'sending' ? 'Enviando...' : 'Solicitar cotización ✦'}
      </button>

      {status === 'error' && (
        <p className="font-montserrat text-sm" style={{ color: 'rgba(240,231,213,0.7)', textAlign: 'center' }}>
          Hubo un problema. Escribinos a contacto@rigelstudio.com.ar
        </p>
      )}
    </form>
  );
}

/* ── FLUJO 3 — Consulta rápida ───────────────────────────────────── */
function FlowConsulta({ onSuccess }) {
  const [status, setStatus] = useState('idle');
  const handlers = useInputHandlers();

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    const fd = new FormData(e.target);
    const nombre = fd.get('nombre');
    const data = {
      tipo: 'consulta',
      nombre,
      email: fd.get('email'),
      consulta: fd.get('consulta'),
      subject: `❓ Consulta: ${nombre}`,
    };
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        onSuccess('consulta');
        e.target.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p className="font-montserrat" style={{ color: 'rgba(240,231,213,0.6)', marginBottom: 8, fontSize: '0.9rem' }}>
        ¿Tenés una duda puntual? Te respondemos en menos de 24 horas.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Nombre *">
          <input name="nombre" type="text" required style={inputStyle} className="contact-input" {...handlers} />
        </Field>
        <Field label="Email *">
          <input name="email" type="email" required style={inputStyle} className="contact-input" {...handlers} />
        </Field>
      </div>

      <Field label="Tu consulta *">
        <textarea
          name="consulta"
          required
          rows={4}
          placeholder="Ej: ¿Puedo tener una app que funcione sin internet? ¿Cuánto tarda publicar en Google Play?..."
          style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
          className="contact-input"
          {...handlers}
        />
      </Field>

      {/* Links directos */}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href="https://wa.me/5492645048401"
          target="_blank"
          rel="noopener noreferrer"
          className="font-montserrat"
          style={{ color: '#D4AF37', fontSize: '0.85rem', textDecoration: 'none', transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          💬 WhatsApp directo →
        </a>
        <a
          href="mailto:contacto@rigelstudio.com.ar"
          className="font-montserrat"
          style={{ color: 'rgba(240,231,213,0.6)', fontSize: '0.85rem', textDecoration: 'none', transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          📧 contacto@rigelstudio.com.ar
        </a>
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        style={{ ...submitStyle, opacity: status === 'sending' ? 0.6 : 1, cursor: status === 'sending' ? 'not-allowed' : 'pointer' }}
        onMouseEnter={(e) => { if (status !== 'sending') e.currentTarget.style.background = '#F4C842'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#D4AF37'; }}
      >
        {status === 'sending' ? 'Enviando...' : 'Enviar consulta ✦'}
      </button>

      {status === 'error' && (
        <p className="font-montserrat text-sm" style={{ color: 'rgba(240,231,213,0.7)', textAlign: 'center' }}>
          Hubo un problema. Escribinos a contacto@rigelstudio.com.ar
        </p>
      )}
    </form>
  );
}

/* ── SUCCESS MESSAGES ────────────────────────────────────────────── */
const SUCCESS_MSGS = {
  idea: 'Te respondemos en menos de 24 horas.',
  cotizacion: 'Estamos preparando tu propuesta. En 48 horas tenés respuesta.',
  consulta: 'Tu consulta llegó. Respondemos antes de las 24 horas.',
};

/* ── TABS ────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'idea',       label: '💬 Contanos tu idea' },
  { id: 'cotizacion', label: '📋 Solicitar cotización' },
  { id: 'consulta',   label: '❓ Consulta rápida' },
];

/* ── MAIN CONTACT ────────────────────────────────────────────────── */
export default function Contact() {
  const [activeTab, setActiveTab] = useState('idea');
  const [successType, setSuccessType] = useState(null);

  useEffect(() => {
    const handler = (e) => setActiveTab(e.detail.tab);
    window.addEventListener('openContactTab', handler);
    return () => window.removeEventListener('openContactTab', handler);
  }, []);

  const handleSuccess = (tipo) => setSuccessType(tipo);
  const handleReset = () => setSuccessType(null);

  return (
    <section
      id="contacto"
      className="fade-section w-full relative"
      style={{ zIndex: 10, padding: '120px 24px 120px' }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-montserrat uppercase text-center"
          style={{ color: '#D4AF37', fontSize: '0.7rem', letterSpacing: '0.35em', marginBottom: 20 }}
        >
          Contacto
        </motion.p>

        {/* Título */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.1 }}
          className="font-serif text-center"
          style={{ color: '#F0E7D5', fontSize: 'clamp(2rem, 5vw, 3.2rem)', marginBottom: 48, lineHeight: 1.2 }}
        >
          ¿Por dónde empezamos?
        </motion.h2>

        {/* Card contenedor */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            background: 'rgba(240,231,213,0.03)',
            border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: 24,
            backdropFilter: 'blur(12px)',
            padding: '40px 40px 48px',
          }}
        >
          {successType ? (
            <SuccessScreen message={SUCCESS_MSGS[successType]} onReset={handleReset} />
          ) : (
            <>
              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 40,
                  flexWrap: 'wrap',
                }}
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="font-montserrat"
                    style={{
                      background: activeTab === tab.id ? '#D4AF37' : 'transparent',
                      color: activeTab === tab.id ? '#0A0E1A' : 'rgba(240,231,213,0.6)',
                      fontWeight: activeTab === tab.id ? 600 : 400,
                      border: activeTab === tab.id ? 'none' : '1px solid rgba(212,175,55,0.3)',
                      borderRadius: 100,
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.3s ease',
                      letterSpacing: '0.5px',
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== tab.id) {
                        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.6)';
                        e.currentTarget.style.color = 'rgba(240,231,213,0.9)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== tab.id) {
                        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)';
                        e.currentTarget.style.color = 'rgba(240,231,213,0.6)';
                      }
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Contenido del tab */}
              {activeTab === 'idea'       && <FlowIdea       onSuccess={handleSuccess} />}
              {activeTab === 'cotizacion' && <FlowCotizacion onSuccess={handleSuccess} />}
              {activeTab === 'consulta'   && <FlowConsulta   onSuccess={handleSuccess} />}
            </>
          )}
        </motion.div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.1); }
        }
        @media (max-width: 640px) {
          .contact-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
