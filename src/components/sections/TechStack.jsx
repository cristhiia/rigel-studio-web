import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

const TECHS = [
  // Orbit 1 (inner) — 6 techs
  { name: 'React Native', symbol: '⚛', category: 'MOBILE',    desc: 'Apps iOS y Android con un solo código. Rendimiento nativo, sin compromisos.', orbit: 1 },
  { name: 'Expo',         symbol: '◈', category: 'MOBILE',    desc: 'El framework que acelera el desarrollo móvil. Menos configuración, más producto.', orbit: 1 },
  { name: 'React',        symbol: '⚛', category: 'FRONTEND',  desc: 'Interfaces modernas y reactivas. La base de todas nuestras aplicaciones web.', orbit: 1 },
  { name: 'Vite',         symbol: '⚡', category: 'FRONTEND',  desc: 'Build tool ultrarrápido. Tu web lista en segundos, no en minutos.', orbit: 1 },
  { name: 'Node.js',      symbol: '⬡', category: 'BACKEND',   desc: 'El motor del lado del servidor. APIs rápidas, escalables y confiables.', orbit: 1 },
  { name: 'Supabase',     symbol: '◉', category: 'DATABASE',  desc: 'Base de datos en tiempo real con autenticación incluida. El backend que no para.', orbit: 1 },
  // Orbit 2 (outer) — 5 techs
  { name: 'PostgreSQL',   symbol: '🐘', category: 'DATABASE',  desc: 'La base de datos relacional más robusta del mundo. Tus datos, seguros.', orbit: 2 },
  { name: 'Anthropic API',symbol: '✦', category: 'IA',         desc: 'Integramos Claude en tus sistemas. IA que entiende contexto y genera valor real.', orbit: 2 },
  { name: 'OpenAI API',   symbol: '◎', category: 'IA',         desc: 'GPT-4 al servicio de tu negocio. Automatización inteligente desde el día uno.', orbit: 2 },
  { name: 'Vercel',       symbol: '▲', category: 'DEPLOY',     desc: 'Deploy instantáneo, HTTPS automático y performance global.', orbit: 2 },
  { name: 'GitHub',       symbol: '⊙', category: 'INFRA',      desc: 'Control de versiones profesional. Cada cambio registrado, cada deploy trazable.', orbit: 2 },
];

const ORBIT1 = TECHS.filter(t => t.orbit === 1);
const ORBIT2 = TECHS.filter(t => t.orbit === 2);

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

export default function TechStack() {
  const isMobile = useIsMobile();

  const SIZE    = isMobile ? 320 : 500;
  const R1      = isMobile ? 105 : 160;
  const R2      = isMobile ? 148 : 230;
  const NODE_D  = isMobile ? 44  : 56;
  const NODE_R  = NODE_D / 2;
  const FONT    = isMobile ? '0.45rem' : '0.55rem';
  const CENTER  = SIZE / 2;

  const SPEED1  =  0.25; // deg/frame — clockwise
  const SPEED2  = -0.17; // deg/frame — counter-clockwise

  const angle1Ref = useRef(0);
  const angle2Ref = useRef(0);
  const pausedRef = useRef(false);
  const frameRef  = useRef();
  const nodeRefs  = useRef([]);

  const [tooltip, setTooltip] = useState(null); // { name, desc }

  const animate = useCallback(() => {
    if (!pausedRef.current) {
      angle1Ref.current += SPEED1;
      angle2Ref.current += SPEED2;
    }

    ORBIT1.forEach((_, i) => {
      const el = nodeRefs.current[i];
      if (!el) return;
      const base = (360 / ORBIT1.length) * i;
      const rad  = ((base + angle1Ref.current) * Math.PI) / 180;
      const x    = CENTER + Math.cos(rad) * R1 - NODE_R;
      const y    = CENTER + Math.sin(rad) * R1 - NODE_R;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });

    ORBIT2.forEach((_, i) => {
      const el = nodeRefs.current[ORBIT1.length + i];
      if (!el) return;
      const base = (360 / ORBIT2.length) * i;
      const rad  = ((base + angle2Ref.current) * Math.PI) / 180;
      const x    = CENTER + Math.cos(rad) * R2 - NODE_R;
      const y    = CENTER + Math.sin(rad) * R2 - NODE_R;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });

    frameRef.current = requestAnimationFrame(animate);
  }, [CENTER, R1, R2, NODE_R]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animate]);

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

        {/* Sistema orbital */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <div
            style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}
            onMouseLeave={() => { pausedRef.current = false; setTooltip(null); }}
          >
            {/* Anillo visual órbita 1 */}
            <div style={{
              position: 'absolute',
              width: R1 * 2,
              height: R1 * 2,
              top: CENTER - R1,
              left: CENTER - R1,
              borderRadius: '50%',
              border: '1px dashed rgba(212,175,55,0.18)',
              pointerEvents: 'none',
            }} />

            {/* Anillo visual órbita 2 */}
            <div style={{
              position: 'absolute',
              width: R2 * 2,
              height: R2 * 2,
              top: CENTER - R2,
              left: CENTER - R2,
              borderRadius: '50%',
              border: '1px dashed rgba(212,175,55,0.1)',
              pointerEvents: 'none',
            }} />

            {/* Centro — estrella ✦ */}
            <div style={{
              position: 'absolute',
              width: 80,
              height: 80,
              top: CENTER - 40,
              left: CENTER - 40,
              borderRadius: '50%',
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'center-glow 3s ease-in-out infinite',
              zIndex: 5,
            }}>
              <span style={{ fontSize: '2rem', color: '#D4AF37', lineHeight: 1 }}>✦</span>
            </div>

            {/* Nodos — posicionados absolutamente, animados por rAF */}
            {TECHS.map((tech, i) => (
              <div
                key={tech.name}
                ref={el => { nodeRefs.current[i] = el; }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: NODE_D,
                  height: NODE_D,
                  willChange: 'transform',
                }}
              >
                <div
                  onMouseEnter={() => {
                    pausedRef.current = true;
                    setTooltip({ name: tech.name, symbol: tech.symbol, category: tech.category, desc: tech.desc });
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'rgba(240,231,213,0.06)',
                    border: '1px solid rgba(212,175,55,0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'default',
                    transition: 'transform 0.2s ease, border-color 0.2s ease, background 0.2s ease',
                    padding: 4,
                    textAlign: 'center',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.2)';
                    e.currentTarget.style.borderColor = 'rgba(212,175,55,0.7)';
                    e.currentTarget.style.background = 'rgba(212,175,55,0.12)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)';
                    e.currentTarget.style.background = 'rgba(240,231,213,0.06)';
                  }}
                >
                  <span style={{ fontSize: isMobile ? '0.7rem' : '0.9rem', lineHeight: 1, marginBottom: 1 }}>{tech.symbol}</span>
                  <span
                    className="font-montserrat font-bold"
                    style={{ fontSize: FONT, color: '#F0E7D5', lineHeight: 1.1 }}
                  >
                    {tech.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tooltip */}
        <div style={{
          minHeight: 80,
          marginTop: 32,
          textAlign: 'center',
          transition: 'opacity 0.3s ease',
          opacity: tooltip ? 1 : 0,
        }}>
          {tooltip && (
            <div style={{
              display: 'inline-block',
              background: 'rgba(240,231,213,0.05)',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: 16,
              padding: '16px 24px',
              maxWidth: 400,
            }}>
              <p className="font-montserrat uppercase" style={{ color: '#D4AF37', fontSize: '0.6rem', letterSpacing: '0.3em', marginBottom: 6 }}>
                {tooltip.category}
              </p>
              <p className="font-montserrat font-bold" style={{ color: '#F0E7D5', fontSize: '1.1rem', marginBottom: 8 }}>
                {tooltip.symbol} {tooltip.name}
              </p>
              <p className="font-montserrat" style={{ color: 'rgba(240,231,213,0.7)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                {tooltip.desc}
              </p>
            </div>
          )}
        </div>

        {/* Frase final */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
          className="font-serif italic text-center"
          style={{ color: 'rgba(240,231,213,0.55)', marginTop: 48, fontSize: '1.05rem', lineHeight: 1.7 }}
        >
          Elegimos cada herramienta con criterio. No usamos lo que está de moda — usamos lo que resuelve el problema.
        </motion.p>
      </div>

      <style>{`
        @keyframes center-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(212,175,55,0.2); }
          50%       { box-shadow: 0 0 40px rgba(212,175,55,0.45); }
        }
      `}</style>
    </section>
  );
}
