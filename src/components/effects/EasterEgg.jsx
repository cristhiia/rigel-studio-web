import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const FEATURED_STARS = [
  { x: 0.15, y: 0.20 },
  { x: 0.80, y: 0.12 },
  { x: 0.60, y: 0.55 },
  { x: 0.25, y: 0.75 },
  { x: 0.88, y: 0.80 },
];

function NightCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width  = canvas.offsetWidth  || 600;
    canvas.height = canvas.offsetHeight || 400;

    const particles = Array.from({ length: 200 }, (_, i) => {
      let color;
      if      (i < 120) color = `rgba(255,255,255,${0.3 + Math.random() * 0.5})`;
      else if (i < 160) color = `rgba(240,231,213,${0.3 + Math.random() * 0.4})`;
      else if (i < 190) color = `rgba(212,175,55,${0.4 + Math.random() * 0.4})`;
      else              color = `rgba(74,144,226,${0.4 + Math.random() * 0.4})`;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        dx: (Math.random() - 0.5) * 0.2,
        dy: (Math.random() - 0.5) * 0.2,
        color,
        twinkle: Math.random() * Math.PI * 2,
      };
    });

    let phase = 0;
    let raf;

    const drawFeaturedStar = (x, y, r) => {
      const pulse = 0.7 + Math.sin(phase + x * 10) * 0.3;
      const s = r * pulse;
      const aura = ctx.createRadialGradient(x, y, 0, x, y, s * 8);
      aura.addColorStop(0, `rgba(212,175,55,${0.15 * pulse})`);
      aura.addColorStop(1, 'rgba(212,175,55,0)');
      ctx.save(); ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(x, y, s * 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dx, dy]) => {
        const len = s * 12;
        const g = ctx.createLinearGradient(x, y, x + dx * len, y + dy * len);
        g.addColorStop(0, `rgba(255,255,255,${0.7 * pulse})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * len, y + dy * len); ctx.stroke(); ctx.restore();
      });
      ctx.save(); ctx.fillStyle = `rgba(255,255,255,${0.9 * pulse})`; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    };

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0A0E1A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        const alpha = 0.4 + Math.sin(phase + p.twinkle) * 0.3;
        ctx.save(); ctx.globalAlpha = Math.max(0.05, alpha); ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      FEATURED_STARS.forEach(({ x, y }) => drawFeaturedStar(x * canvas.width, y * canvas.height, 2.5));
      phase += 0.015;
      raf = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
  );
}

export default function EasterEgg() {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const trigger = document.getElementById('easterEggTrigger');
      if (trigger) {
        if (window.scrollY > 200) {
          trigger.classList.add('visible');
        } else {
          trigger.classList.remove('visible');
        }
      }
    };

    // Also listen to lenis-scroll for smooth scroll compatibility
    const handleLenis = (e) => {
      const trigger = document.getElementById('easterEggTrigger');
      if (trigger) {
        if (e.detail.scroll > 200) {
          trigger.classList.add('visible');
        } else {
          trigger.classList.remove('visible');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('lenis-scroll', handleLenis);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('lenis-scroll', handleLenis);
    };
  }, []);

  return (
    <>
      {/* ── Trigger: R + ✦ fixed top-left ── */}
      <div
        id="easterEggTrigger"
        style={{
          position: 'fixed',
          top: 40,
          left: 40,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.6s ease',
        }}
      >
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.5rem',
          color: '#F0E7D5',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          R
        </span>
        <span
          onClick={() => setModalOpen(true)}
          style={{
            fontSize: '0.9rem',
            color: '#D4AF37',
            cursor: 'pointer',
            userSelect: 'none',
            animation: 'starTwinkle 3s ease-in-out infinite',
          }}
        >
          ✦
        </span>
      </div>

      <style>{`
        #easterEggTrigger.visible {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        @keyframes starTwinkle {
          0%,100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>

      {/* ── Modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 99999, background: 'rgba(0,5,15,0.92)', backdropFilter: 'blur(8px)' }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, filter: 'blur(20px)' }}
              animate={{ scale: 1,    opacity: 1, filter: 'blur(0px)' }}
              exit={{   scale: 0.95, opacity: 0, filter: 'blur(20px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-3xl rounded-sm overflow-hidden"
              style={{ border: '1px solid rgba(212,175,55,0.25)', maxHeight: '90vh' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ position: 'absolute', inset: 0 }}>
                <NightCanvas />
              </div>
              <div style={{
                position: 'relative', zIndex: 1, padding: '3rem',
                maxHeight: '90vh', overflowY: 'auto',
                background: 'rgba(10,14,26,0.75)',
              }}>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    position: 'absolute', top: 24, right: 24,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(240,231,213,0.4)',
                    fontFamily: 'Montserrat, sans-serif', fontSize: '0.75rem',
                    letterSpacing: '0.2em', textTransform: 'uppercase', zIndex: 2,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#D4AF37'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,231,213,0.4)'}
                >
                  ✕ Cerrar
                </button>

                <div style={{ color: '#F0E7D5', lineHeight: 1.9, maxWidth: 560, margin: '0 auto', fontFamily: 'Montserrat, sans-serif' }}>
                  <p style={{ textAlign: 'center', color: '#D4AF37', fontSize: '1.1rem', marginBottom: '1.5rem', letterSpacing: '0.3em' }}>✦</p>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#F0E7D5' }}>
                    EL ORIGEN
                  </h2>
                  <p style={{ color: 'rgba(240,231,213,0.5)', fontSize: '0.85rem', letterSpacing: '0.2em', marginBottom: '2.5rem' }}>
                    Pocos llegan hasta acá.
                  </p>
                  <hr style={{ borderColor: 'rgba(212,175,55,0.2)', marginBottom: '2rem' }} />
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#D4AF37', marginBottom: '1rem' }}>¿Por qué Rigel?</h3>
                  <p style={{ marginBottom: '1rem', color: 'rgba(240,231,213,0.85)' }}>Hay miles de millones de estrellas en el universo. Casi todas brillan en silencio. Nacen, arden y se apagan sin que nadie las nombre.</p>
                  <p style={{ marginBottom: '1rem', color: 'rgba(240,231,213,0.85)' }}>Unas pocas marcan un precedente.</p>
                  <p style={{ marginBottom: '1rem', color: '#F0E7D5', fontStyle: 'italic' }}>Rigel es una de esas.</p>
                  <p style={{ marginBottom: '2rem', color: 'rgba(240,231,213,0.85)' }}>Y esa es la decisión que tomamos en silencio cada día: ser de las pocas. No por suerte. No por ruido. Por una obsesión que pocos entienden — que cada cosa que hagamos, por pequeña que parezca, intente alcanzar la perfección.</p>
                  <p style={{ marginBottom: '2.5rem', color: 'rgba(240,231,213,0.75)' }}>En una era donde todo se automatiza y todo se parece, esa búsqueda es lo único que importa.</p>
                  <hr style={{ borderColor: 'rgba(212,175,55,0.2)', marginBottom: '2rem' }} />
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#D4AF37', marginBottom: '1rem' }}>¿Por qué existe Rigel Studio?</h3>
                  <p style={{ marginBottom: '1rem', color: 'rgba(240,231,213,0.85)' }}>Hace tiempo que vengo construyendo desde otro lugar. Una mirada propia. Una forma distinta de ver lo que otros ven igual.</p>
                  <p style={{ marginBottom: '1rem', color: '#F0E7D5', fontStyle: 'italic' }}>Esto no nació de un plan de negocio.</p>
                  <p style={{ marginBottom: '2.5rem', color: 'rgba(240,231,213,0.85)' }}>Nació de la necesidad de traducir esa forma diferente al mundo digital. De encontrar a quienes están listos para mirarlo distinto también.</p>
                  <hr style={{ borderColor: 'rgba(212,175,55,0.2)', marginBottom: '2rem' }} />
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#D4AF37', marginBottom: '1rem' }}>¿Qué vemos que otros no?</h3>
                  <p style={{ marginBottom: '1rem', color: 'rgba(240,231,213,0.85)' }}>Hay una oportunidad inmensa que el mercado ignora. Pymes, emprendedores, negocios reales que merecen algo más que plantillas recicladas y promesas vacías.</p>
                  <p style={{ marginBottom: '1rem', color: 'rgba(240,231,213,0.85)' }}>Las agencias tradicionales fallan por una razón simple: son tradicionales.</p>
                  <p style={{ marginBottom: '2.5rem', color: '#F0E7D5', fontWeight: 500 }}>Rigel Studio no compite con ellas. Las ignora.</p>
                  <hr style={{ borderColor: 'rgba(212,175,55,0.2)', marginBottom: '2rem' }} />
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#D4AF37', marginBottom: '1rem' }}>¿Hacia dónde vamos?</h3>
                  <p style={{ marginBottom: '1rem', color: 'rgba(240,231,213,0.85)' }}>En cinco años, Rigel será el mejor estudio de Argentina.</p>
                  <p style={{ marginBottom: '1rem', color: 'rgba(240,231,213,0.85)' }}>No por hacer bien las cosas — eso es lo mínimo.</p>
                  <p style={{ marginBottom: '2.5rem', color: 'rgba(240,231,213,0.85)' }}>Sino por haber traído al mercado algo que antes no existía. Por haber salido del status quo cuando nadie se animó.</p>
                  <hr style={{ borderColor: 'rgba(212,175,55,0.2)', marginBottom: '2rem' }} />
                  <p style={{ marginBottom: '1.5rem', color: '#F0E7D5', fontStyle: 'italic', fontSize: '1.05rem' }}>Si encontraste esta estrella, ya sos parte de algo que pocos verán.</p>
                  <p style={{ textAlign: 'center', color: '#D4AF37', fontSize: '1.1rem', letterSpacing: '0.3em', marginBottom: '1.5rem' }}>✦</p>
                  <p style={{ color: 'rgba(240,231,213,0.6)', fontSize: '0.85rem' }}>
                    — Cristhian Gallego<br />
                    <span style={{ letterSpacing: '0.15em' }}>Fundador</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
