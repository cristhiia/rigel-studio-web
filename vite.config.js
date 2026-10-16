import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), preloadHeroFonts()],
})
