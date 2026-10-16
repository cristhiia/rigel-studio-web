import React from 'react';
import PageShell from '../../components/layout/PageShell';
import { usePageMeta } from '../../lib/seo';
import { body, draftBanner, h1, h3, label, narrow } from '../../components/ui/pageStyles';

export const DRAFT_NOTICE = 'BORRADOR — revisar con abogado/contador antes de publicar';

// Estructura común de las páginas legales. sections: [{ title, paragraphs: [] }]
export default function LegalPage({ path, kicker, title, updated, intro, sections, children }) {
  usePageMeta(path);
  return (
    <PageShell>
      <div role="note" style={draftBanner}>{DRAFT_NOTICE}</div>
      <article style={{ ...narrow, padding: '48px 24px 96px' }}>
        <span style={label}>{kicker}</span>
        <h1 style={h1}>{title}</h1>
        {updated && <p style={{ ...body, marginTop: 16 }}>Última actualización: {updated}</p>}
        {intro && <p style={{ ...body, marginTop: 24 }}>{intro}</p>}
        {sections?.map(s => (
          <section key={s.title} style={{ marginTop: 40 }}>
            <h2 style={{ ...h3, fontSize: '1.3rem', marginBottom: 12 }}>{s.title}</h2>
            {s.paragraphs.map(p => <p key={p} style={{ ...body, marginBottom: 12 }}>{p}</p>)}
            {s.list && (
              <ul style={{ ...body, paddingLeft: 20, margin: '0 0 12px', listStyle: 'disc' }}>
                {s.list.map(item => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}
        {children}
      </article>
    </PageShell>
  );
}
