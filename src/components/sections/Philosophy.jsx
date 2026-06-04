import React from 'react';
import { motion } from 'framer-motion';

export default function Philosophy() {
  return (
    <section className="bg-transparent py-32 px-6 flex justify-center relative w-full min-h-[80vh]"
      style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl w-full"
      >
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="text-xs tracking-[0.5em] uppercase font-bold" style={{ color: '#D4AF37' }}>
            Nota del Fundador
          </span>
          <div className="h-px w-12 mx-auto mt-4" style={{ background: 'rgba(212,175,55,0.3)' }} />
        </div>

        {/* Body */}
        <article className="font-serif text-lg md:text-xl leading-[1.9] space-y-8 italic"
          style={{ color: 'rgba(240,231,213,0.75)' }}
        >
          <p>
            "En un mundo saturado de soluciones genéricas y datos expuestos, Rigel Studio nació bajo una premisa innegociable: la tecnología debe ser tan privada como efectiva."
          </p>
          <p>
            No construimos herramientas para el mercado masivo. Diseñamos estructuras para quienes entienden que el software es el activo más crítico de su negocio. Cada línea de código que escribimos busca ese equilibrio perfecto entre la potencia técnica y el lujo del silencio.
          </p>
          <p>
            Nuestra misión no es simplemente resolver problemas, sino crear sistemas que respiren con la identidad de quien los posee. Con absoluta discreción, con total precisión.
          </p>
        </article>

        {/* Firma */}
        <div className="mt-20 flex flex-col items-end">
          <div className="text-right">
            <p className="font-serif text-2xl mb-1" style={{ color: '#F0E7D5' }}>Cristian G.</p>
            <p className="text-xs tracking-widest uppercase font-bold" style={{ color: '#D4AF37' }}>
              Director · Rigel Studio
            </p>
          </div>
          <div className="mt-8" style={{ opacity: 0.2 }}>
            <span className="text-4xl font-serif" style={{ color: '#D4AF37' }}>R★</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
