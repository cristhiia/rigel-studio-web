import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { ROUTE_META, SITE } from './src/data/seo.js'

// Pesos que pinta el Hero en el primer render: se precargan para evitar
// el salto de fuente (CLS) al terminar la intro.
const HERO_FONTS = [
  { pkg: 'space-grotesk', file: 'space-grotesk-latin-700-normal' },
  { pkg: 'space-grotesk', file: 'space-grotesk-latin-500-normal' },
  { pkg: 'inter', file: 'inter-latin-400-normal' },
]

function preloadHeroFonts() {
  return {
    name: 'preload-hero-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const hrefs = ctx.bundle
          ? Object.values(ctx.bundle)
              .filter(a => a.type === 'asset' && a.fileName.endsWith('.woff2')
                && HERO_FONTS.some(f => a.fileName.includes(`${f.file}-`)))
              .map(a => `/${a.fileName}`)
          : HERO_FONTS.map(f => `/node_modules/@fontsource/${f.pkg}/files/${f.file}.woff2`)
        return hrefs.map(href => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href, crossorigin: '' },
          injectTo: 'head-prepend',
        }))
      },
    },
  }
}

// Genera dist/<ruta>/index.html con title/description/og propios para cada
// ruta de ROUTE_META: los crawlers de redes sociales no ejecutan JS, y Vercel
// sirve estos archivos estáticos antes del rewrite a /index.html.
function routeMetaPages() {
  let outDir
  const setTag = (html, attr, key, value) =>
    html.replace(
      new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`),
      (_, a, b) => `${a}${escapeAttr(value)}${b}`,
    )
  const escapeAttr = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

  return {
    name: 'route-meta-pages',
    apply: 'build',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir) },
    closeBundle() {
      const base = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')
      for (const [route, meta] of Object.entries(ROUTE_META)) {
        let html = base.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(meta.title)}</title>`)
        html = setTag(html, 'name', 'description', meta.description)
        html = setTag(html, 'property', 'og:title', meta.title)
        html = setTag(html, 'property', 'og:description', meta.description)
        html = setTag(html, 'property', 'og:url', `${SITE}${route}`)
        html = setTag(html, 'name', 'twitter:title', meta.title)
        html = setTag(html, 'name', 'twitter:description', meta.description)
        if (meta.noindex) html = html.replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>')
        const dir = path.join(outDir, route)
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, 'index.html'), html)
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), preloadHeroFonts(), routeMetaPages()],
  // KEELWISE_PRICE_ARS es público (se muestra en la landing); el resto de las
  // variables de Keelwise son solo de servidor y no llevan este prefijo.
  envPrefix: ['VITE_', 'KEELWISE_PRICE_'],
  test: { include: ['tests/**/*.test.js'], environment: 'node' },
})
