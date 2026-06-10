import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.25 } },
};
const cardVariants = {
  hidden: { y: 60, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 80, damping: 18 } },
};

// ── Price display: "desde" pequeño + monto + "ARS" discreto ──────────────────
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

// ── NEXUS card ───────────────────────────────────────────────────────────────
function NexusCard() {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -12, transition: { type: 'spring', stiffness: 300 } }}
      className="card-nexus relative flex flex-col p-8 rounded-sm overflow-hidden"
      style={{
        background: 'rgba(240,231,213,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(212,175,55,0.2)',
      }}
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
        onMouseEnter={e => e.currentTarget.style.color = '#F4C842'}
        onMouseLeave={e => e.currentTarget.style.color = '#D4AF37'}
      >
        Empezar acá <span style={{ fontSize: '1rem' }}>→</span>
      </button>
    </motion.div>
  );
}

// ── VANGUARD card ────────────────────────────────────────────────────────────
function VanguardCard() {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -12, transition: { type: 'spring', stiffness: 300 } }}
      className="card-vanguard relative flex flex-col p-8 rounded-sm overflow-hidden"
      style={{
        background: 'rgba(240,231,213,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(212,175,55,0.15)',
      }}
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
        onMouseEnter={e => e.currentTarget.style.color = '#F4C842'}
        onMouseLeave={e => e.currentTarget.style.color = '#D4AF37'}
      >
        Solicitar Acceso <span style={{ fontSize: '1rem' }}>→</span>
      </button>
    </motion.div>
  );
}

// ── ZENITH card — única tarjeta oscura ───────────────────────────────────────
function ZenithCard() {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -12, scale: 1.02, transition: { type: 'spring', stiffness: 300 } }}
      className="card-zenith relative flex flex-col p-10 rounded-sm overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
        border: '2px solid #D4AF37',
        boxShadow: '0 0 40px rgba(212,175,55,0.15), 0 20px 60px rgba(0,0,0,0.5)',
      }}
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
        onMouseEnter={e => { e.currentTarget.style.background = '#F0C84A'; e.currentTarget.style.boxShadow = '0 0 30px rgba(212,175,55,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        Aplicar a Zenith
      </button>

      <p className="font-montserrat text-center" style={{ color: 'rgba(240,231,213,0.40)', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
        Acceso por invitación o méritos del negocio
      </p>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MembershipSection() {
  return (
    <div className="relative w-full min-h-screen flex items-center justify-center py-32 overflow-hidden" style={{ zIndex: 10 }}>
      <div className="w-full max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="font-montserrat text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: '#D4AF37' }}>
            Niveles de Colaboración
          </p>
          <h2 className="membership-section-title font-playfair text-4xl md:text-5xl font-bold" style={{ color: '#F0E7D5' }}>
            Elige tu Universo
          </h2>
        </div>

        {/* Cards grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <NexusCard />
          <VanguardCard />
          <ZenithCard />
        </motion.div>
      </div>
    </div>
  );
}
