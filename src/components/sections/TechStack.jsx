import React from 'react';
import { motion } from 'framer-motion';

const CATEGORIES = [
  {
    label: 'Mobile & Frontend',
    techs: ['React Native', 'Expo', 'React', 'Vite'],
  },
  {
    label: 'Backend & Database',
    techs: ['Node.js', 'Supabase', 'PostgreSQL'],
  },
  {
    label: 'Inteligencia Artificial',
    techs: ['Anthropic API (Claude)', 'OpenAI API'],
  },
  {
    label: 'Deploy & Infraestructura',
    techs: ['Vercel', 'GitHub'],
  },
];

const cardStyle = {
  background: 'rgba(240,231,213,0.05)',
  border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: 16,
  padding: '24px 16px',
  textAlign: 'center',
  transition: 'all 0.3s ease',
  cursor: 'default',
};

export default function TechStack() {
  return (
    <section
      id="tecnologias"
      className="fade-section w-full relative"
      style={{ zIndex: 10, padding: '120px 24px 100px' }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Label superior */}
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
          Stack Tecnológico
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
          Las herramientas detrás de cada misión
        </motion.h2>

        {/* Grid de cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}
          className="tech-grid"
        >
          {CATEGORIES.flatMap((cat) =>
            cat.techs.map((tech, i) => (
              <motion.div
                key={`${cat.label}-${tech}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="tech-card"
                style={cardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(212,175,55,0.1)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <p
                  className="font-montserrat font-bold"
                  style={{ color: '#F0E7D5', fontSize: '1rem', marginBottom: 8 }}
                >
                  {tech}
                </p>
                <p
                  className="font-montserrat uppercase"
                  style={{
                    color: '#D4AF37',
                    fontSize: '0.65rem',
                    letterSpacing: '0.25em',
                    fontWeight: 300,
                  }}
                >
                  {cat.label}
                </p>
              </motion.div>
            ))
          )}
        </div>

        {/* Frase final */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
          className="font-serif italic text-center"
          style={{
            color: 'rgba(240,231,213,0.6)',
            marginTop: 64,
            fontSize: '1.05rem',
            lineHeight: 1.7,
          }}
        >
          Elegimos cada herramienta con criterio. No usamos lo que está de moda — usamos lo que resuelve el problema.
        </motion.p>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .tech-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tech-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (min-width: 1025px) {
          .tech-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}
