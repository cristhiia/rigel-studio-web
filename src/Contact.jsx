import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from './lib/supabase';

export default function Contact() {
  const [formData, setFormData] = useState({ nombre: '', empresa: '', desafio: '', presupuesto: '' });
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    const finalDesafio = `Presupuesto: ${formData.presupuesto}\n\nProblema: ${formData.desafio}`;
    const { error } = await supabase
      .from('portfolio_leads')
      .insert([{ nombre: formData.nombre, empresa: formData.empresa, desafio: finalDesafio }]);
    if (error) setStatus('error');
    else setStatus('success');
  };

  return (
    <section
      id="contacto"
      className="h-full w-full flex items-center justify-center bg-transparent"
    >
      <div className="w-full max-w-2xl px-8 py-16 flex flex-col items-center text-center">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-[#212842] mb-4">
            Iniciemos la secuencia.
          </h2>
        </motion.div>

        {/* Form */}
        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16 text-center"
          >
            <p className="font-montserrat tracking-[0.4em] text-[#D4AF37] uppercase text-sm mb-4">
              Transmisión Recibida.
            </p>
            <p className="font-playfair italic text-white/60 text-xl">
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
            className="w-full flex flex-col gap-10 bg-white/40 backdrop-blur-md border border-white/30 shadow-xl shadow-black/5 p-10 rounded-sm"
          >
            {/* Inputs con borde solo en línea base */}
            {[
              { placeholder: 'Nombre', field: 'nombre', type: 'text', required: true },
              { placeholder: 'Empresa', field: 'empresa', type: 'text', required: true },
              { placeholder: 'Presupuesto Estimado', field: 'presupuesto', type: 'text', required: false },
            ].map(({ placeholder, field, type, required }) => (
              <input
                key={field}
                type={type}
                placeholder={placeholder}
                required={required}
                onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                className="bg-transparent text-[#212842] font-montserrat text-lg placeholder:text-[#4a4540]/60 focus:outline-none focus:placeholder:text-[#4a4540]/80 pb-4 text-center transition-all duration-300 border-b border-[#D4AF37]/50 focus:border-[#D4AF37]"
              />
            ))}

            {/* Textarea */}
            <textarea
              placeholder="El Desafío Operativo..."
              required
              rows={3}
              onChange={e => setFormData({ ...formData, desafio: e.target.value })}
              className="bg-transparent text-[#212842] font-montserrat text-lg placeholder:text-[#4a4540]/60 focus:outline-none focus:placeholder:text-[#4a4540]/80 pb-4 text-center resize-none transition-all duration-300 border-b border-[#D4AF37]/50 focus:border-[#D4AF37]"
            />

            {/* Botón Supernova Central */}
            <div className="flex justify-center mt-6">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="font-montserrat text-sm text-[#D4AF37] uppercase bg-transparent px-16 py-5 transition-all duration-500 hover:bg-[#D4AF37] hover:text-[#001024]"
                style={{
                  border: '1px solid #D4AF37',
                  letterSpacing: '0.4em',
                  boxShadow: '0 0 20px rgba(197, 160, 40, 0.15)',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 50px rgba(197, 160, 40, 0.5)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(197, 160, 40, 0.15)'}
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
