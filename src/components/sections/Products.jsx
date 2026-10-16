import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { products } from '../../data/products';

const STATUS_STYLE = {
  available: { color: '#0A0E1A', background: '#D4AF37', border: '1px solid #D4AF37' },
  soon:      { color: '#F0E7D5', background: 'transparent', border: '1px solid rgba(240,231,213,0.35)' },
};

function Cta({ cta }) {
  const content = (
    <>
      <span className="font-display text-xs uppercase tracking-widest font-medium" style={{ color: '#F0E7D5' }}>
        {cta.label}
      </span>
      <span aria-hidden="true" style={{ color: '#D4AF37' }} className="group-hover:translate-x-2 transition-transform duration-300">→</span>
    </>
  );
  const className = 'product-cta relative z-10 mt-8 flex items-center gap-4 pt-6';
  const style = { borderTop: '1px solid rgba(240,231,213,0.1)', textDecoration: 'none' };

  return cta.href.startsWith('/')
    ? <Link to={cta.href} className={className} style={style}>{content}</Link>
    : <a href={cta.href} target="_blank" rel="noopener noreferrer" className={className} style={style}>{content}</a>;
}

export default function Products() {
  return (
    <div className="w-full mx-auto px-6 md:px-8 py-24 flex flex-col justify-center bg-transparent">
      <div className="text-center mb-12">
        <span className="font-display text-xs uppercase tracking-[0.4em] font-medium block mb-4" style={{ color: '#D4AF37' }}>
          Software propio
        </span>
        <h2 className="font-display text-4xl font-bold" style={{ color: '#F0E7D5' }}>
          Productos
        </h2>
        <p className="font-body text-base mt-4 max-w-xl mx-auto" style={{ color: 'rgba(240,231,213,0.85)', lineHeight: 1.6 }}>
          Además de construir a medida, hacemos productos propios. Estos son los que ya podés usar o esperar.
        </p>
      </div>

      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {products.map((p, i) => (
          <motion.article
            key={p.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card p-8 flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="relative z-10 flex-grow">
              <span
                className="inline-block font-display text-xs uppercase tracking-[0.15em] font-medium px-3 py-1 rounded-full mb-5"
                style={STATUS_STYLE[p.status]}
              >
                {p.statusLabel}
              </span>
              <span className="block font-display text-xs uppercase tracking-[0.2em] font-medium mb-3" style={{ color: '#D4AF37' }}>
                {p.category}
              </span>
              <h3 className="font-display text-3xl font-bold mb-4" style={{ color: '#F0E7D5' }}>
                {p.name}
              </h3>
              <p className="font-body text-base leading-relaxed" style={{ color: 'rgba(240,231,213,0.85)' }}>
                {p.description}
              </p>
              {p.meta && (
                <p className="font-body text-base mt-4 font-medium" style={{ color: '#F0E7D5' }}>
                  {p.meta}
                </p>
              )}
            </div>
            <Cta cta={p.cta} />
          </motion.article>
        ))}
      </div>
    </div>
  );
}
