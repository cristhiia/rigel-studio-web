import React from 'react';
import { motion } from 'framer-motion';

export default function Philosophy() {
  return (
    <section className="bg-transparent py-16 md:py-32 px-5 md:px-6 flex justify-center border-t border-[#856612]/10 relative z-10 w-full min-h-[80vh]">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl w-full"
      >
        
        {/* Encabezado de la Carta */}
        <div className="mb-16 text-center">
          <span className="text-[#856612] text-xs tracking-[0.5em] uppercase font-bold">
            Nota del Fundador
          </span>
          <div className="h-[1px] w-12 bg-[#856612]/30 mx-auto mt-4"></div>
        </div>

        {/* Cuerpo de la Carta */}
        <article className="font-serif text-[#4a4540] text-base md:text-xl leading-[1.8] space-y-8 italic opacity-90">
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

        {/* Firma Táctica */}
        <div className="mt-20 flex flex-col items-end">
          <div className="text-right">
            <p className="font-serif text-2xl text-[#212842] mb-1">Cristian G.</p>
            <p className="text-[#856612] text-xs tracking-widest uppercase font-bold">Director · Rigel Studio</p>
          </div>
          {/* Detalle de la R y la Estrella como sello de lacre */}
          <div className="mt-8 opacity-20 grayscale">
             <span className="text-4xl font-serif">R★</span>
          </div>
        </div>

      </motion.div>
    </section>
  );
}
