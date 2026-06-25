import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.25 } },
};
const cardVariants = {
  hidden: { y: 60, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 80, damping: 18 } },
};

function PriceDisplay({ amount, color = '#F0E7D5' }) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="font-montserrat text-xs uppercase tracking-widest" style={{ color: 'rgba(240,231,213,0.45)' }}>
        desde
      </span>
      <span className="font-playfair text-2xl font-bold" style={{ color }}>
        ${amount}
      </span>
      <span className="font-montserrat text-xs" style={{ color: 'rgba(240,231,213,0.35)', letterSpacing: '0.15em' }}>
        ARS
      </span>
    </div>
  );
}

function scrollToContact(tab) {
  document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('openContactTab', { detail: { tab } }));
  }, 600);
}

/* ── NEXUS ──────────────────────────────────────────────────────────────────── */
function NexusCard() {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -12, transition: { type: 'spring', stiffness: 300 } }}
      className="card-nexus glass-card relative flex flex-col p-8 overflow-hidden"
    >
      <div className="card-tag" style={{ color: '#3D5A80', fontSize: 10, letterSpacing: '0.4em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
        NIVEL 1
      </div>
      <h3 className="font-playfair text-3xl font-bold mb-1" style={{ color: '#F0E7D5' }}>NEXUS</h3>
      <p className="font-montserrat text-sm mb-6" style={{ color: 'rgba(240,231,213,0.6)', letterSpacing: '0.05em' }}>
        El Comienzo
      </p>
      <p className="font-montserrat text-sm mb-8" style={{ color: 'rgba(240,231,213,0.7)', lineHeight: 1.7 }}>
        Tu entrada al universo Rigel. Un proyecto concreto, rápido y ejecutado con la misma obsesión por el detalle que todo lo que hacemos.
      </p>

      <div className="flex-grow mb-8">
        <p className="font-montserrat text-[10px] uppercase tracking-widest mb-4" style={{ color: 'rgba(61,90,128,0.7)' }}>Incluye</p>
        {[
          'Presencia digital profesional o sistema inicial a medida',
          'Diseño + desarrollo + puesta en producción',
          'Entrega en 2 a 3 semanas',
          'Soporte 30 días post-lanzamiento',
        ].map(item => (
          <div key={item} className="flex items-start gap-3 mb-3">
            <span style={{ color: '#3D5A80', flexShrink: 0, marginTop: 1 }}>✦</span>
            <span className="font-montserrat text-sm" style={{ color: 'rgba(240,231,213,0.8)' }}>{item}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-6 mb-6" style={{ borderColor: 'rgba(61,90,128,0.2)' }}>
        <PriceDisplay amount="350.000" />
      </div>

      <button
        className="font-montserrat text-sm flex items-center gap-3 transition-all duration-300"
        style={{ color: '#D4AF37', letterSpacing: '0.15em' }}
        onClick={() => scrollToContact('idea')}
        onMouseEnter={e => e.currentTarget.style.color = '#F4C842'}
        onMouseLeave={e => e.currentTarget.style.color = '#D4AF37'}
      >
        Empezar acá <span style={{ fontSize: '1rem' }}>→</span>
      </button>
    </motion.div>
  );
}

/* ── VANGUARD ───────────────────────────────────────────────────────────────── */
function VanguardCard() {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -12, transition: { type: 'spring', stiffness: 300 } }}
      className="card-vanguard glass-card relative flex flex-col p-8 overflow-hidden"
    >
      <div className="card-tag" style={{ color: '#888888', fontSize: 10, letterSpacing: '0.4em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
        NIVEL 2 · PLATINO
      </div>
      <h3 className="font-playfair text-3xl font-bold mb-1" style={{ color: '#F0E7D5' }}>VANGUARD</h3>
      <p className="font-montserrat text-sm mb-6" style={{ color: 'rgba(240,231,213,0.6)', letterSpacing: '0.05em' }}>
        El Reconocimiento
      </p>
      <p className="font-montserrat text-sm mb-2" style={{ color: 'rgba(240,231,213,0.7)', lineHeight: 1.7 }}>
        Para quienes ya saben lo que valen.
      </p>
      <p className="font-montserrat text-xs mb-8" style={{ color: 'rgba(240,231,213,0.4)', fontStyle: 'italic', lineHeight: 1.6 }}>
        El salto de una presencia digital a un sistema que trabaja por vos.
      </p>

      <div className="flex-grow mb-8">
        <p className="font-montserrat text-[10px] uppercase tracking-widest mb-4" style={{ color: 'rgba(136,136,136,0.7)' }}>Fases</p>
        {[
          ['Auditoría profunda y UX avanzado', '3–4 sem.'],
          ['Motor Core e Integraciones',        '6–8 sem.'],
          ['Refinamiento y Optimización',        '2–3 sem.'],
        ].map(([fase, tiempo]) => (
          <div key={fase} className="flex justify-between items-start mb-3">
            <span className="font-montserrat text-sm" style={{ color: 'rgba(240,231,213,0.8)' }}>{fase}</span>
            <span className="font-montserrat text-xs ml-4 shrink-0" style={{ color: 'rgba(240,231,213,0.45)' }}>{tiempo}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-6 mb-6" style={{ borderColor: 'rgba(184,184,184,0.4)' }}>
        <PriceDisplay amount="1.200.000" />
      </div>

      <button
        className="font-montserrat text-sm flex items-center gap-3 transition-all duration-300"
        style={{ color: '#D4AF37', letterSpacing: '0.15em' }}
        onClick={() => scrollToContact('cotizacion')}
        onMouseEnter={e => e.currentTarget.style.color = '#F4C842'}
        onMouseLeave={e => e.currentTarget.style.color = '#D4AF37'}
      >
        Solicitar propuesta <span style={{ fontSize: '1rem' }}>→</span>
      </button>
    </motion.div>
  );
}

/* ── ZENITH MODAL ───────────────────────────────────────────────────────────── */
function ZenithModal({ onClose }) {
  useEffect(() => {
    // Mobile-safe body lock
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleApply = () => {
    onClose();
    setTimeout(() => {
      document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openContactTab', { detail: { tab: 'cotizacion' } }));
      }, 600);
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Botón cerrar — fixed para que no se pierda en mobile */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(212,175,55,0.15)',
          border: '1px solid rgba(212,175,55,0.4)',
          color: '#D4AF37',
          fontSize: '1rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,175,55,0.3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212,175,55,0.15)'; }}
      >
        ✕
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="zenith-modal-container"
        style={{
          maxWidth: 560,
          width: '100%',
          background: 'linear-gradient(135deg, #0A0A0A, #111111)',
          border: '1.5px solid rgba(212,175,55,0.6)',
          borderRadius: 28,
          padding: '48px 40px',
          position: 'relative',
          boxShadow: '0 0 60px rgba(212,175,55,0.15), 0 0 120px rgba(212,175,55,0.05)',
        }}
      >
        {/* Contenido */}
        <div style={{ textAlign: 'center' }}>

          {/* Estrella pulse */}
          <div
            style={{
              fontSize: '2rem',
              color: '#D4AF37',
              marginBottom: 16,
              animation: 'zenith-pulse 2.5s ease-in-out infinite',
            }}
          >
            ✦
          </div>

          {/* Label */}
          <p
            className="font-montserrat uppercase"
            style={{ color: '#D4AF37', fontSize: '0.7rem', letterSpacing: '0.4em', marginBottom: 12 }}
          >
            Membresía Exclusiva
          </p>

          {/* Título */}
          <h2
            className="font-montserrat font-bold"
            style={{ color: '#D4AF37', fontSize: '2.8rem', lineHeight: 1, marginBottom: 20 }}
          >
            ZENITH
          </h2>

          {/* Línea */}
          <div style={{ width: 80, height: 1, background: 'rgba(212,175,55,0.5)', margin: '0 auto 20px' }} />

          {/* Subtexto */}
          <p
            className="font-montserrat italic"
            style={{ color: 'rgba(240,231,213,0.7)', marginBottom: 32 }}
          >
            Acceso por invitación o méritos del negocio.
          </p>

          {/* Separador */}
          <div style={{ borderTop: '1px solid rgba(212,175,55,0.15)', marginBottom: 28 }} />

          {/* Lista */}
          <div style={{ maxWidth: 320, margin: '0 auto', textAlign: 'left', marginBottom: 28 }}>
            {[
              'Welcome Box físico personalizado',
              'Manifiesto impreso y firmado a mano',
              'WhatsApp directo con el fundador',
              'SLA garantizado menor a 2 horas',
              'Cena de las Estrellas anual',
              'Roadmap personalizado anual',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <span style={{ color: '#D4AF37', flexShrink: 0, marginTop: 2 }}>✦</span>
                <span className="font-montserrat" style={{ color: 'rgba(240,231,213,0.8)', fontSize: '0.9rem', lineHeight: 2 }}>
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Separador */}
          <div style={{ borderTop: '1px solid rgba(212,175,55,0.15)', marginBottom: 24 }} />

          {/* Precio */}
          <p className="font-montserrat font-bold" style={{ color: '#D4AF37', fontSize: '1.3rem', marginBottom: 24 }}>
            desde $2.500.000 ARS
          </p>

          {/* Botón */}
          <button
            onClick={handleApply}
            className="font-montserrat"
            style={{
              background: '#D4AF37',
              color: '#0A0A0A',
              fontWeight: 700,
              padding: '16px 40px',
              borderRadius: 100,
              border: 'none',
              width: '100%',
              fontSize: '0.85rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              marginBottom: 16,
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F4C842'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#D4AF37'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Quiero aplicar a Zenith
          </button>

          {/* Texto chico */}
          <p className="font-montserrat" style={{ color: 'rgba(240,231,213,0.4)', fontSize: '0.75rem' }}>
            La primera conversación es sin costo y sin compromiso.
          </p>
        </div>
      </motion.div>

      <style>{`
        @keyframes zenith-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.65; transform: scale(1.12); }
        }
        @media (max-width: 768px) {
          .zenith-modal-container {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 80px 24px 48px 24px !important;
            border: none !important;
            border-top: 2px solid rgba(212,175,55,0.6) !important;
          }
        }
      `}</style>
    </motion.div>
  );
}

/* ── ZENITH CARD ────────────────────────────────────────────────────────────── */
function ZenithCard({ onOpenModal }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -12, scale: 1.02, transition: { type: 'spring', stiffness: 300 } }}
      className="card-zenith glass-card glass-card--zenith relative flex flex-col p-10 overflow-hidden"
    >
      {/* Gold corner accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 60, height: 60,
        background: 'linear-gradient(135deg, transparent 50%, rgba(212,175,55,0.12) 50%)',
      }} />

      <div style={{ color: '#D4AF37', fontSize: 10, letterSpacing: '0.4em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
        MEMBRESÍA EXCLUSIVA
      </div>
      <h3 className="font-playfair text-4xl font-bold mb-1" style={{ color: '#D4AF37' }}>ZENITH</h3>
      <p className="font-montserrat text-sm mb-6" style={{ color: '#F0E7D5', letterSpacing: '0.08em', opacity: 0.9 }}>
        El Universo Privado
      </p>
      <p className="font-montserrat text-sm mb-8" style={{ color: 'rgba(240,231,213,0.75)', lineHeight: 1.7, fontStyle: 'italic' }}>
        Para quienes no piden, eligen.
      </p>

      <div className="flex-grow mb-8">
        {[
          'Welcome Box físico personalizado',
          'Manifiesto impreso y firmado a mano',
          'WhatsApp directo con el fundador',
          'SLA garantizado menos de 2 horas',
          'Cena de las Estrellas anual',
          'Roadmap personalizado anual',
        ].map(feature => (
          <div key={feature} className="flex items-start gap-3 mb-4">
            <span style={{ color: '#D4AF37', flexShrink: 0, marginTop: 1 }}>✦</span>
            <span className="font-montserrat text-sm" style={{ color: 'rgba(240,231,213,0.85)' }}>{feature}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-6 mb-6" style={{ borderColor: 'rgba(212,175,55,0.25)' }}>
        <PriceDisplay amount="2.500.000" color="#D4AF37" />
      </div>

      <button
        className="font-montserrat text-sm font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all duration-400 mb-4"
        style={{ background: '#D4AF37', color: '#0A0A0A', letterSpacing: '0.2em' }}
        onClick={onOpenModal}
        onMouseEnter={e => { e.currentTarget.style.background = '#F0C84A'; e.currentTarget.style.boxShadow = '0 0 30px rgba(212,175,55,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        Aplicar a Zenith →
      </button>

      <p className="font-montserrat text-center" style={{ color: 'rgba(240,231,213,0.40)', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
        Acceso por invitación o méritos del negocio
      </p>
    </motion.div>
  );
}

/* ── MAIN ───────────────────────────────────────────────────────────────────── */
export default function MembershipSection() {
  const [zenithOpen, setZenithOpen] = useState(false);

  const openZenith = () => {
    setZenithOpen(true);
    window.dispatchEvent(new CustomEvent('zenithModalOpen'));
  };

  const closeZenith = () => {
    setZenithOpen(false);
    window.dispatchEvent(new CustomEvent('zenithModalClose'));
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center py-32 overflow-hidden" style={{ zIndex: 10 }}>
      <div className="w-full max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="font-montserrat text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: '#D4AF37' }}>
            Niveles de Colaboración
          </p>
          <h2 className="membership-section-title font-playfair text-4xl md:text-5xl font-bold" style={{ color: '#F0E7D5' }}>
            Elige tu Universo
          </h2>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <NexusCard />
          <VanguardCard />
          <ZenithCard onOpenModal={openZenith} />
        </motion.div>
      </div>

      <AnimatePresence>
        {zenithOpen && <ZenithModal onClose={closeZenith} />}
      </AnimatePresence>
    </div>
  );
}
