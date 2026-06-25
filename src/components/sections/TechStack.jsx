import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const TECHS = [
  {
    symbol: '⚛',
    category: 'MOBILE',
    name: 'React Native',
    desc: 'Construimos apps para iOS y Android con un solo código. Rendimiento nativo, sin compromisos.',
  },
  {
    symbol: '◈',
    category: 'MOBILE',
    name: 'Expo',
    desc: 'El framework que acelera el desarrollo móvil. Menos configuración, más producto.',
  },
  {
    symbol: '⚛',
    category: 'FRONTEND',
    name: 'React',
    desc: 'Interfaces modernas y reactivas. La base de todas nuestras aplicaciones web.',
  },
  {
    symbol: '⚡',
    category: 'FRONTEND',
    name: 'Vite',
    desc: 'Build tool ultrarrápido. Tu web lista en segundos, no en minutos.',
  },
  {
    symbol: '⬡',
    category: 'BACKEND',
    name: 'Node.js',
    desc: 'El motor del lado del servidor. APIs rápidas, escalables y confiables.',
  },
  {
    symbol: '◉',
    category: 'DATABASE',
    name: 'Supabase',
    desc: 'Base de datos en tiempo real con autenticación incluida. El backend que no para.',
  },
  {
    symbol: '🐘',
    category: 'DATABASE',
    name: 'PostgreSQL',
    desc: 'La base de datos relacional más robusta del mundo. Tus datos, seguros y estructurados.',
  },
  {
    symbol: '✦',
    category: 'INTELIGENCIA ARTIFICIAL',
    name: 'Anthropic API',
    desc: 'Integramos Claude en tus sistemas. IA que entiende contexto y genera valor real.',
  },
  {
    symbol: '◎',
    category: 'INTELIGENCIA ARTIFICIAL',
    name: 'OpenAI API',
    desc: 'GPT-4 al servicio de tu negocio. Automatización inteligente desde el día uno.',
  },
  {
    symbol: '▲',
    category: 'DEPLOY',
    name: 'Vercel',
    desc: 'Deploy instantáneo, HTTPS automático y performance global. Tu web siempre disponible.',
  },
  {
    symbol: '⊙',
    category: 'INFRAESTRUCTURA',
    name: 'GitHub',
    desc: 'Control de versiones profesional. Cada cambio registrado, cada deploy trazable.',
  },
];

export default function TechStack() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);
  const total = TECHS.length;

  const goTo = useCallback((idx) => {
    setVisible(false);
    setTimeout(() => {
      setCurrent((idx + total) % total);
      setVisible(true);
    }, 220);
  }, [total]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(next, 3000);
    return () => clearInterval(intervalRef.current);
  }, [paused, next]);

  const tech = TECHS[current];

  return (
    <section
      id="tecnologias"
      className="fade-section w-full relative"
      style={{ zIndex: 10, padding: '120px 24px 100px' }}
    >
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-montserrat uppercase text-center"
          style={{ color: '#D4AF37', fontSize: '0.7rem', letterSpacing: '0.35em', marginBottom: 20 }}
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
          style={{ color: '#F0E7D5', fontSize: 'clamp(2rem, 5vw, 3.2rem)', marginBottom: 64, lineHeight: 1.2 }}
        >
          Las herramientas detrás de cada misión
        </motion.h2>

        {/* Carrusel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Flecha izquierda */}
            <button
              onClick={prev}
              aria-label="Anterior"
              style={{
                width: 44, height: 44,
                borderRadius: '50%',
                border: '1px solid rgba(212,175,55,0.3)',
                background: 'rgba(212,175,55,0.1)',
                color: '#D4AF37',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,175,55,0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; }}
            >
              ←
            </button>

            {/* Card central */}
            <div
              style={{
                flex: 1,
                maxWidth: 480,
                background: 'rgba(240,231,213,0.06)',
                border: '1px solid rgba(212,175,55,0.35)',
                borderRadius: 24,
                padding: '48px 40px',
                textAlign: 'center',
                boxShadow: '0 0 40px rgba(212,175,55,0.08)',
                minHeight: 280,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateX(0)' : 'translateX(40px)',
                  transition: 'opacity 0.22s ease, transform 0.22s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {/* Símbolo */}
                <span style={{ fontSize: '3rem', color: '#D4AF37', lineHeight: 1 }}>
                  {tech.symbol}
                </span>

                {/* Categoría */}
                <p
                  className="font-montserrat uppercase"
                  style={{
                    color: 'rgba(212,175,55,0.6)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.3em',
                    marginTop: 8,
                  }}
                >
                  {tech.category}
                </p>

                {/* Nombre */}
                <h3
                  className="font-montserrat font-bold"
                  style={{ color: '#F0E7D5', fontSize: '2rem', marginTop: 12, lineHeight: 1 }}
                >
                  {tech.name}
                </h3>

                {/* Línea divisora */}
                <div
                  style={{
                    width: 60,
                    height: 1,
                    background: 'rgba(212,175,55,0.4)',
                    margin: '20px auto 0',
                  }}
                />

                {/* Descripción */}
                <p
                  className="font-montserrat"
                  style={{
                    color: 'rgba(240,231,213,0.7)',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    marginTop: 16,
                    maxWidth: 320,
                  }}
                >
                  {tech.desc}
                </p>
              </div>
            </div>

            {/* Flecha derecha */}
            <button
              onClick={next}
              aria-label="Siguiente"
              style={{
                width: 44, height: 44,
                borderRadius: '50%',
                border: '1px solid rgba(212,175,55,0.3)',
                background: 'rgba(212,175,55,0.1)',
                color: '#D4AF37',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,175,55,0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; }}
            >
              →
            </button>
          </div>

          {/* Dots */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              marginTop: 32,
            }}
          >
            {TECHS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Ir a ${TECHS[i].name}`}
                style={{
                  width: i === current ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === current ? '#D4AF37' : 'rgba(212,175,55,0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'width 0.3s ease, background 0.3s ease',
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Frase final */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
          className="font-serif italic text-center"
          style={{
            color: 'rgba(240,231,213,0.55)',
            marginTop: 64,
            fontSize: '1.05rem',
            lineHeight: 1.7,
          }}
        >
          Elegimos cada herramienta con criterio. No usamos lo que está de moda — usamos lo que resuelve el problema.
        </motion.p>
      </div>
    </section>
  );
}
