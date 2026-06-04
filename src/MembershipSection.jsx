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

// ── NEXUS card ───────────────────────────────────────────────────────────────
function NexusCard() {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -12, transition: { type: 'spring', stiffness: 300 } }}
      className="card-nexus relative flex flex-col p-8 rounded-sm overflow-hidden"
      style={{
        background: 'rgba(240,231,213,0.60)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(61,90,128,0.40)',
      }}
    >
      <div style={{ color: '#3D5A80', fontSize: 10, letterSpacing: '0.4em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
        NIVEL 1
      </div>
      <h3 className="font-playfair font-bold mb-1" style={{ color: '#212842', fontSize: '2rem' }}>NEXUS</h3>
      <p className="font-montserrat mb-3" style={{ color: '#3D5A80', letterSpacing: '0.05em', fontSize: '0.85rem' }}>
        El Comienzo
      </p>
      <p className="font-montserrat mb-4" style={{ color: 'rgba(33,40,66,0.65)', lineHeight: 1.7, fontSize: '0.9rem' }}>
        La estructura sólida que tu negocio merece.
      </p>

      <div className="flex-grow mb-4">
        <p className="font-montserrat text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgba(61,90,128,0.7)' }}>Fases</p>
        {[
          ['Auditoría y Arquitectura', '2–3 sem.'],
          ['Desarrollo del Motor Core', '4–6 sem.'],
          ['Refinamiento y Lanzamiento', '1–2 sem.'],
        ].map(([fase, tiempo]) => (
          <div key={fase} className="flex justify-between items-start mb-2">
            <span className="font-montserrat" style={{ color: 'rgba(33,40,66,0.80)', fontSize: '0.85rem' }}>{fase}</span>
            <span className="font-montserrat ml-4 shrink-0" style={{ color: 'rgba(61,90,128,0.65)', fontSize: '0.8rem' }}>{tiempo}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-3 mb-3" style={{ borderColor: 'rgba(61,90,128,0.2)' }}>
        <span className="font-playfair font-bold" style={{ color: '#212842', fontSize: '1.5rem' }}>desde USD 8,000</span>
      </div>

      <button
        className="font-montserrat text-sm flex items-center gap-3 transition-all duration-300"
        style={{ color: '#3D5A80', letterSpacing: '0.15em' }}
        onMouseEnter={e => e.currentTarget.style.color = '#212842'}
        onMouseLeave={e => e.currentTarget.style.color = '#3D5A80'}
      >
        Solicitar Propuesta <span style={{ fontSize: '1rem' }}>→</span>
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
        background: 'rgba(240,231,213,0.60)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid #B8B8B8',
      }}
    >
      <div style={{ color: '#888888', fontSize: 10, letterSpacing: '0.4em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
        NIVEL 2 · PLATINO
      </div>
      <h3 className="font-playfair font-bold mb-1" style={{ color: '#212842', fontSize: '2rem' }}>VANGUARD</h3>
      <p className="font-montserrat mb-3" style={{ color: '#888888', letterSpacing: '0.05em', fontSize: '0.85rem' }}>
        El Reconocimiento
      </p>
      <p className="font-montserrat mb-4" style={{ color: 'rgba(33,40,66,0.65)', lineHeight: 1.7, fontSize: '0.9rem' }}>
        Para quienes ya saben lo que valen.
      </p>

      <div className="flex-grow mb-4">
        <p className="font-montserrat text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgba(136,136,136,0.7)' }}>Fases</p>
        {[
          ['Auditoría profunda y UX avanzado', '3–4 sem.'],
          ['Motor Core e Integraciones',        '6–8 sem.'],
          ['Refinamiento y Optimización',        '2–3 sem.'],
        ].map(([fase, tiempo]) => (
          <div key={fase} className="flex justify-between items-start mb-2">
            <span className="font-montserrat" style={{ color: 'rgba(33,40,66,0.80)', fontSize: '0.85rem' }}>{fase}</span>
            <span className="font-montserrat ml-4 shrink-0" style={{ color: 'rgba(136,136,136,0.65)', fontSize: '0.8rem' }}>{tiempo}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-3 mb-3" style={{ borderColor: 'rgba(184,184,184,0.4)' }}>
        <span className="font-playfair font-bold" style={{ color: '#212842', fontSize: '1.5rem' }}>desde USD 18,000</span>
      </div>

      <button
        className="font-montserrat text-sm flex items-center gap-3 transition-all duration-300"
        style={{ color: '#888888', letterSpacing: '0.15em' }}
        onMouseEnter={e => e.currentTarget.style.color = '#212842'}
        onMouseLeave={e => e.currentTarget.style.color = '#888888'}
      >
        Solicitar Acceso <span style={{ fontSize: '1rem' }}>→</span>
      </button>
    </motion.div>
  );
}

// ── ZENITH card ───────────────────────────────────────────────────────────────
function ZenithCard() {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -12, scale: 1.02, transition: { type: 'spring', stiffness: 300 } }}
      className="card-zenith relative flex flex-col p-8 rounded-sm overflow-hidden"
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

      <div style={{ color: '#D4AF37', fontSize: 10, letterSpacing: '0.4em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
        MEMBRESÍA EXCLUSIVA
      </div>
      <h3 className="font-playfair font-bold mb-1" style={{ color: '#D4AF37', fontSize: '2rem' }}>ZENITH</h3>
      <p className="font-montserrat mb-3" style={{ color: '#F0E7D5', letterSpacing: '0.08em', opacity: 0.9, fontSize: '0.85rem' }}>
        El Universo Privado
      </p>
      <p className="font-montserrat mb-4" style={{ color: 'rgba(240,231,213,0.75)', lineHeight: 1.7, fontStyle: 'italic', fontSize: '0.9rem' }}>
        Para quienes no piden, eligen.
      </p>

      <div className="flex-grow mb-4">
        {[
          'Welcome Box físico personalizado',
          'Manifiesto impreso y firmado a mano',
          'WhatsApp directo con el fundador',
          'SLA garantizado menos de 2 horas',
          'Cena de las Estrellas anual',
          'Roadmap personalizado anual',
        ].map(feature => (
          <div key={feature} className="flex items-start gap-3 mb-2">
            <span style={{ color: '#D4AF37', flexShrink: 0, marginTop: 1 }}>✦</span>
            <span className="font-montserrat" style={{ color: 'rgba(240,231,213,0.85)', fontSize: '0.85rem' }}>{feature}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-3 mb-3" style={{ borderColor: 'rgba(212,175,55,0.25)' }}>
        <span className="font-playfair font-bold" style={{ color: '#D4AF37', fontSize: '1.5rem' }}>desde USD 35,000+</span>
      </div>

      <button
        className="font-montserrat text-sm font-bold uppercase tracking-widest py-2 px-6 rounded-sm transition-all duration-400 mb-3"
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
    <div className="relative w-full flex items-center justify-center py-10 overflow-hidden" style={{ zIndex: 10 }}>
      <div className="w-full max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-6">
          <p className="font-montserrat text-[10px] uppercase tracking-[0.4em] mb-3" style={{ color: '#D4AF37' }}>
            Niveles de Colaboración
          </p>
          <h2 className="font-playfair text-4xl md:text-5xl font-bold" style={{ color: '#212842' }}>
            Elige tu Universo
          </h2>
        </div>

        {/* Cards grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          <NexusCard />
          <VanguardCard />
          <ZenithCard />
        </motion.div>
      </div>
    </div>
  );
}
