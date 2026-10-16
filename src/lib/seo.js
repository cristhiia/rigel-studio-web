import { useEffect } from 'react';
import { ROUTE_META, SITE } from '../data/seo';

const TAGS = [
  ['name', 'description', m => m.description],
  ['property', 'og:title', m => m.title],
  ['property', 'og:description', m => m.description],
  ['property', 'og:url', (m, path) => `${SITE}${path}`],
  ['name', 'twitter:title', m => m.title],
  ['name', 'twitter:description', m => m.description],
];

// Aplica title/description/og/twitter de ROUTE_META[path] y los restaura al salir.
export function usePageMeta(path) {
  useEffect(() => {
    const meta = ROUTE_META[path];
    if (!meta) return undefined;

    const prevTitle = document.title;
    document.title = meta.title;

    const restore = TAGS.map(([attr, key, value]) => {
      const el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) return null;
      const prev = el.getAttribute('content');
      el.setAttribute('content', value(meta, path));
      return () => el.setAttribute('content', prev);
    });

    let robots = null;
    if (meta.noindex) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      robots.content = 'noindex';
      document.head.appendChild(robots);
    }

    return () => {
      document.title = prevTitle;
      restore.forEach(fn => fn && fn());
      robots?.remove();
    };
  }, [path]);
}
