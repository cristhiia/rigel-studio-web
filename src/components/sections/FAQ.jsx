import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const FAQS = [
  {
    q: '¿Cuánto cuesta desarrollar un sistema con Rigel Studio?',
    a: 'Depende del alcance y la complejidad de tu proyecto. Tenemos tres niveles: NEXUS desde $350.000 ARS para proyectos de entrada rápida (2-3 semanas), VANGUARD desde $1.200.000 ARS para proyectos completos, y ZENITH desde $2.500.000 ARS para la experiencia completa. La mejor forma de saberlo es contarnos tu idea — la primera charla es sin costo.',
  },
  {
    q: '¿Cuánto tiempo tarda un proyecto?',
    a: 'Un proyecto NEXUS tarda 2 a 3 semanas. Un VANGUARD completo entre 6 y 10 semanas. Trabajamos con entregas parciales para que puedas ver el avance desde la primera semana.',
  },
  {
    q: '¿Trabajan con empresas de otras provincias o solo San Juan?',
    a: 'Trabajamos con clientes en toda Argentina. La mayoría de nuestros proyectos se gestionan de forma 100% remota — reuniones por video, entregas por etapas y comunicación directa con el fundador.',
  },
  {
    q: '¿Qué pasa si necesito cambios después de que termina el proyecto?',
    a: 'Todos los proyectos incluyen 30 días de soporte post-lanzamiento. Después podemos acordar un plan de mantenimiento o trabajar los cambios por separado según lo que necesites.',
  },
  {
    q: '¿Me quedo con el código una vez terminado?',
    a: 'Sí. El código es tuyo. Entregamos el repositorio completo, acceso a todos los servicios y la documentación necesaria para que puedas administrarlo o seguir desarrollándolo con quien quieras.',
  },
  {
    q: '¿Por dónde puedo empezar?',
    a: 'Completá el formulario de contacto con tu idea y te respondemos en menos de 24 horas. Si preferís hablar directo, también podés escribirnos por WhatsApp.',
  },
];

function FAQItem({ item, isOpen, onToggle }) {
  const answerRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (answerRef.current) {
      setHeight(isOpen ? answerRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div
      style={{
        border: `1px solid ${isOpen ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.15)'}`,
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        transition: 'border-color 0.3s ease',
      }}
    >
      <div
        role="button"
        onClick={onToggle}
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          color: '#F0E7D5',
          fontWeight: 600,
          gap: 16,
        }}
      >
        <span className="font-montserrat" style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>
          {item.q}
        </span>
        <span
          style={{
            color: '#D4AF37',
            fontSize: '1.1rem',
            flexShrink: 0,
            display: 'inline-block',
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          ✦
        </span>
      </div>

      <div
        style={{
          height: height,
          overflow: 'hidden',
          transition: 'height 0.35s ease',
        }}
      >
        <div
          ref={answerRef}
          style={{
            padding: '0 24px 20px',
            color: 'rgba(240,231,213,0.7)',
            lineHeight: 1.7,
          }}
          className="font-montserrat"
        >
          {item.a}
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section
      id="faq"
      className="fade-section w-full relative"
      style={{ zIndex: 10, padding: '120px 24px 100px' }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-montserrat uppercase text-center"
          style={{
            color: '#D4AF37',
            fontSize: '0.7rem',
            letterSpacing: '0.35em',
            marginBottom: 20,
          }}
        >
          Antes de Empezar
        </motion.p>

        {/* Título */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.1 }}
          className="font-serif text-center"
          style={{
            color: '#F0E7D5',
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            marginBottom: 64,
            lineHeight: 1.2,
          }}
        >
          Preguntas frecuentes
        </motion.h2>

        {/* Acordeón */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {FAQS.map((item, i) => (
            <FAQItem
              key={i}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
