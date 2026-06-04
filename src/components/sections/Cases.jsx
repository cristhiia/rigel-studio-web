import React from 'react';
import { motion } from 'framer-motion';

const projects = [
  {
    id: 1,
    title: 'Keelwise',
    tag: 'Fintech & UX',
    shortDescription: 'Ecosistema Fintech. Convergencia perfecta entre hardware de billetera inteligente y software de gestión.',
    buttonText: 'Explorar Arquitectura',
    problem: 'Falta de educación financiera y herramientas de gestión desconectadas de la realidad del usuario.',
    solution: 'Desarrollo de un gestor de gastos con un coach financiero de tono argentino que detecta patrones de consumo y se adapta a las etapas de vida del usuario.'
  },
  {
    id: 2,
    title: 'Qué Tomamos',
    tag: 'Desarrollo & Lógica',
    shortDescription: 'Desarrollo móvil premium. Algoritmos de recomendación en tiempo real para el ecosistema vitivinícola.',
    buttonText: 'Ver Despliegue',
    problem: 'Dificultad para elegir el vino perfecto para cada comida en el mercado de San Juan, Argentina.',
    solution: 'Desarrollo de una interfaz minimalista e integración de un motor de recomendaciones precisas basadas en maridaje.'
  },
  {
    id: 3,
    title: 'Gestión Operativa',
    tag: 'Sistemas & AI',
    shortDescription: 'Arquitectura de interfaces y sistemas con integración IA para máxima eficiencia industrial.',
    buttonText: 'Ver Detalles',
    problem: 'Cuellos de botella en el diagnóstico y gestión operativa de mantenimiento.',
    solution: 'Arquitectura de interfaz orientada a la eficiencia operativa e integración de diagnóstico asistido, reduciendo el margen de error técnico.'
  }
];

export default function Cases({ onSelectCase }) {
  return (
    <div className="w-full mx-auto px-8 py-24 h-full flex flex-col justify-center bg-transparent">
      <h2
        className="font-playfair text-4xl font-bold mb-12 text-center"
        style={{ color: '#F0E7D5' }}
      >
        Casos de Estudio
      </h2>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8 pb-8">
        {projects.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onSelectCase(p)}
            className="case-card cursor-pointer backdrop-blur-md transition-all duration-300 p-8 flex flex-col justify-between group relative overflow-hidden"
            style={{
              background: 'rgba(240,231,213,0.05)',
              border: '1px solid rgba(212,175,55,0.2)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)';
              e.currentTarget.style.background  = 'rgba(240,231,213,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)';
              e.currentTarget.style.background  = 'rgba(240,231,213,0.05)';
            }}
          >
            <div className="relative z-10 flex-grow">
              <span
                className="font-montserrat text-[10px] uppercase tracking-[0.2em] block mb-6"
                style={{ color: '#D4AF37' }}
              >
                {p.tag}
              </span>
              <h3
                className="font-playfair text-3xl font-bold mb-4 transition-colors duration-300"
                style={{ color: '#F0E7D5' }}
              >
                {p.title}
              </h3>
              <p
                className="font-montserrat text-sm leading-relaxed pt-2 pb-4"
                style={{ color: 'rgba(240,231,213,0.7)' }}
              >
                {p.shortDescription}
              </p>
            </div>

            <div
              className="relative z-10 mt-8 flex items-center gap-4 pt-6"
              style={{ borderTop: '1px solid rgba(240,231,213,0.1)' }}
            >
              <span
                className="font-montserrat text-xs uppercase tracking-widest transition-colors"
                style={{ color: 'rgba(240,231,213,0.5)' }}
              >
                {p.buttonText}
              </span>
              <span style={{ color: '#D4AF37' }} className="group-hover:translate-x-2 transition-transform duration-300">→</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
