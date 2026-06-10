import React, { useState } from 'react';
import { motion } from 'framer-motion';

const inputStyle = {
  background: 'rgba(240,231,213,0.05)',
  border: '1px solid rgba(212,175,55,0.25)',
  borderRadius: '4px',
  color: '#F0E7D5',
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '1.1rem',
  padding: '0.75rem 1rem',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.3s ease',
};

export default function Contact() {
  const [status, setStatus] = useState('idle');

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('enviando');

    const data = {
      nombre: e.target.nombre.value,
      email: e.target.email.value,
      empresa: e.target.empresa.value,
      mensaje: e.target.mensaje.value,
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setStatus('enviado');
        e.target.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleFocus = (e) => { e.target.style.borderColor = '#D4AF37'; };
  const handleBlur  = (e) => { e.target.style.borderColor = 'rgba(212,175,55,0.25)'; };

  return (
    <section className="h-full w-full flex items-center justify-center bg-transparent">
      <div className="w-full max-w-2xl px-8 py-16 flex flex-col items-center text-center">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl mb-4" style={{ color: '#F0E7D5' }}>
            Iniciemos la secuencia.
          </h2>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={onSubmit}
          className="w-full flex flex-col gap-6 p-10 rounded-sm"
          style={{
            background: 'rgba(240,231,213,0.03)',
            border: '1px solid rgba(212,175,55,0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {[
            { placeholder: 'Nombre', name: 'nombre', type: 'text',  required: true },
            { placeholder: 'Email',  name: 'email',  type: 'email', required: true },
            { placeholder: 'Empresa',name: 'empresa',type: 'text',  required: false },
          ].map(({ placeholder, name, type, required }) => (
            <input
              key={name}
              name={name}
              type={type}
              placeholder={placeholder}
              required={required}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
              className="placeholder:text-[rgba(240,231,213,0.35)]"
            />
          ))}

          <textarea
            name="mensaje"
            placeholder="Tu mensaje..."
            required
            rows={4}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ ...inputStyle, resize: 'none' }}
            className="placeholder:text-[rgba(240,231,213,0.35)]"
          />

          <div className="flex flex-col items-center gap-4 mt-4">
            <button
              type="submit"
              disabled={status === 'enviando'}
              style={{
                background: '#D4AF37',
                color: '#0A0E1A',
                border: 'none',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: '0.85rem',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                padding: '18px 56px',
                cursor: status === 'enviando' ? 'default' : 'pointer',
                opacity: status === 'enviando' ? 0.7 : 1,
                transition: 'background 0.3s ease, box-shadow 0.3s ease',
                boxShadow: '0 0 20px rgba(212,175,55,0.2)',
              }}
              onMouseEnter={e => { if (status !== 'enviando') { e.currentTarget.style.background = '#F4C842'; e.currentTarget.style.boxShadow = '0 0 40px rgba(212,175,55,0.5)'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; e.currentTarget.style.boxShadow = '0 0 20px rgba(212,175,55,0.2)'; }}
            >
              {status === 'enviando' ? 'Enviando...' : 'Enviar Mensaje'}
            </button>

            {status === 'enviado' && (
              <p className="font-montserrat text-sm" style={{ color: '#D4AF37' }}>
                Mensaje recibido. Te respondo en menos de 24 horas.
              </p>
            )}
            {status === 'error' && (
              <p className="font-montserrat text-sm" style={{ color: 'rgba(240,231,213,0.7)' }}>
                Hubo un problema. Escribime directo a contacto@rigelstudio.com
              </p>
            )}
          </div>
        </motion.form>
      </div>
    </section>
  );
}
