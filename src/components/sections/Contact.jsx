import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

const inputStyle = {
  background: 'rgba(240,231,213,0.05)',
  border: 'none',
  borderBottom: '1px solid rgba(212,175,55,0.25)',
  color: '#F0E7D5',
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '1.1rem',
  padding: '0.75rem 0',
  width: '100%',
  outline: 'none',
  textAlign: 'center',
  transition: 'border-color 0.3s ease',
};

export default function Contact() {
  const [formData, setFormData] = useState({ nombre: '', empresa: '', desafio: '', presupuesto: '' });
  const [status,   setStatus]   = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    const finalDesafio = `Presupuesto: ${formData.presupuesto}\n\nProblema: ${formData.desafio}`;
    const { error } = await supabase
      .from('portfolio_leads')
      .insert([{ nombre: formData.nombre, empresa: formData.empresa, desafio: finalDesafio }]);
    setStatus(error ? 'error' : 'success');
  };

  const handleFocus = (e) => { e.target.style.borderBottomColor = '#D4AF37'; };
  const handleBlur  = (e) => { e.target.style.borderBottomColor = 'rgba(212,175,55,0.25)'; };

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

        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16 text-center"
          >
            <p className="font-montserrat tracking-[0.4em] uppercase text-sm mb-4" style={{ color: '#D4AF37' }}>
              Transmisión Recibida.
            </p>
            <p className="font-playfair italic text-xl" style={{ color: 'rgba(240,231,213,0.6)' }}>
              Nos pondremos en contacto a la brevedad.
            </p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleSubmit}
            className="w-full flex flex-col gap-10 p-10 rounded-sm"
            style={{
              background: 'rgba(240,231,213,0.03)',
              border: '1px solid rgba(212,175,55,0.15)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {[
              { placeholder: 'Nombre',              field: 'nombre',      type: 'text', required: true  },
              { placeholder: 'Empresa',             field: 'empresa',     type: 'text', required: true  },
              { placeholder: 'Presupuesto Estimado',field: 'presupuesto', type: 'text', required: false },
            ].map(({ placeholder, field, type, required }) => (
              <input
                key={field}
                type={type}
                placeholder={placeholder}
                required={required}
                onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  ...inputStyle,
                  '::placeholder': { color: 'rgba(240,231,213,0.35)' },
                }}
                className="placeholder:text-[rgba(240,231,213,0.35)]"
              />
            ))}

            <textarea
              placeholder="El Desafío Operativo..."
              required
              rows={3}
              onChange={e => setFormData({ ...formData, desafio: e.target.value })}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ ...inputStyle, resize: 'none' }}
              className="placeholder:text-[rgba(240,231,213,0.35)]"
            />

            <div className="flex justify-center mt-6">
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  background: '#D4AF37',
                  color: '#0A0E1A',
                  border: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  padding: '18px 56px',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease, box-shadow 0.3s ease',
                  boxShadow: '0 0 20px rgba(212,175,55,0.2)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F4C842'; e.currentTarget.style.boxShadow = '0 0 40px rgba(212,175,55,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; e.currentTarget.style.boxShadow = '0 0 20px rgba(212,175,55,0.2)'; }}
              >
                {status === 'loading' ? 'Iniciando...' : 'Solicitar Evaluación'}
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </section>
  );
}
