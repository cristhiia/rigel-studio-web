import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function EasterEgg({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            zIndex: 99999,
            background: 'rgba(10,14,26,0.8)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card relative w-full"
            style={{ maxWidth: 680, padding: 48, maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div
              role="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="glass-circle-btn"
              style={{ position: 'absolute', top: 20, right: 20 }}
            >
              ✕
            </div>

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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
