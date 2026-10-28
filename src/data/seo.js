// Metadatos por ruta. Los usa la página (usePageMeta) y también vite.config.js,
// que genera en el build un HTML por ruta con estos tags: los crawlers de
// WhatsApp, Facebook o LinkedIn no ejecutan JavaScript.

export const SITE = 'https://rigelstudio.com.ar';

export const ROUTE_META = {
  '/keelwise': {
    title: 'Keelwise | App de finanzas personales para Android — Rigel Studio',
    description:
      'Keelwise te dice cuánto podés gastar hoy, ordena tus gastos y te muestra cómo gastás con reportes claros. Acceso anticipado para Android: anotate en la lista de espera.',
  },
  '/keelwise/escritorio': {
    title: 'Keelwise en la compu | Anotá tus gastos desde el navegador',
    description: 'La misma Keelwise del celular, en el navegador de tu computadora: anotás un gasto en dos segundos y ves cuánto podés gastar hoy.',
    // Pasar a false cuando la versión web esté publicada (VITE_KEELWISE_WEB_URL).
    noindex: true,
  },
  '/keelwise/gracias': {
    title: 'Gracias por suscribirte | Keelwise',
    description: 'Confirmación de tu suscripción a Keelwise.',
    noindex: true,
  },
  // Panel interno: noindex, fuera del sitemap y con título neutro.
  '/admin': {
    title: 'Rigel Studio',
    description: 'Rigel Studio, estudio de software en San Juan, Argentina.',
    noindex: true,
  },
  '/admin/ingresar': {
    title: 'Rigel Studio',
    description: 'Rigel Studio, estudio de software en San Juan, Argentina.',
    noindex: true,
  },
  '/terminos': {
    title: 'Términos y condiciones | Rigel Studio',
    description: 'Términos y condiciones de uso del sitio y de los productos de Rigel Studio.',
  },
  '/privacidad': {
    title: 'Política de privacidad | Rigel Studio',
    description: 'Qué datos guardan Rigel Studio y Keelwise, dónde y para qué.',
  },
  '/arrepentimiento': {
    title: 'Botón de arrepentimiento | Rigel Studio',
    description: 'Solicitá la revocación de tu compra o suscripción a un producto de Rigel Studio.',
  },
};
