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
        <article className="font-body text-lg md:text-xl leading-[1.9] space-y-8 italic"
          style={{ color: 'rgba(240,231,213,0.85)' }}
        >
          <p>
            "Rigel Studio nació bajo una premisa innegociable: la tecnología debe ser tan privada como efectiva."
          </p>
          <p>
            Rigel es una de las estrellas que se usan para navegar. Keelwise lleva en el nombre la quilla de un barco. No es casualidad: hacemos software para que sepas dónde estás y hacia dónde ir.
          </p>
          <p>
            Hacemos software simple para problemas concretos. Cada producto resuelve una sola cosa, la resuelve bien y no te llena de ruido: menos pantallas, menos números sueltos, más control sobre lo que importa. Y si lo que necesitás no existe, lo armamos a medida.
          </p>
        </article>

        {/* Firma */}
        <div className="mt-20 flex flex-col items-end">
          <div className="text-right">
            <p className="font-display text-2xl mb-1" style={{ color: '#F0E7D5' }}>Cristian G.</p>
            <p className="text-xs tracking-widest uppercase font-bold" style={{ color: '#D4AF37' }}>
              Director · Rigel Studio
            </p>
          </div>
          <div className="mt-8" style={{ opacity: 0.2 }} aria-hidden="true">
            <span className="text-4xl font-display" style={{ color: '#D4AF37' }}>R★</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
