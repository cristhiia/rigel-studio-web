// Productos propios de Rigel Studio. Agregar un producto = agregar un objeto.
//
// status: 'available' | 'soon'
// cta.href: ruta interna (empieza con "/") o URL externa.

const WHATSAPP = 'https://wa.me/5492645048401';

export const whatsappLink = text => `${WHATSAPP}?text=${encodeURIComponent(text)}`;

// Precio de Keelwise. Se cobra en pesos (KEELWISE_PRICE_ARS, expuesto al build
// por vite.config.js); USD es la referencia que se muestra.
const priceArs = Number(import.meta.env.KEELWISE_PRICE_ARS);

export const KEELWISE_PRICE = {
  usd: 10,
  ars: Number.isFinite(priceArs) && priceArs > 0 ? priceArs : null,
  trialDays: 7,
};

export const formatArs = n =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const products = [
  {
    id: 'keelwise',
    name: 'Keelwise',
    category: 'Finanzas personales · Android',
    status: 'available',
    statusLabel: 'Acceso anticipado',
    description:
      'Te dice cuánto podés gastar hoy, ordena tus gastos por categoría y te ayuda a ahorrar con un coach con IA.',
    meta: `USD ${KEELWISE_PRICE.usd} por mes · ${KEELWISE_PRICE.trialDays} días gratis`,
    cta: { label: 'Conocer Keelwise', href: '/keelwise' },
  },
  {
    id: 'gestor-pacientes',
    name: 'Gestor de pacientes',
    category: 'Salud · Consultorios',
    status: 'soon',
    statusLabel: 'Próximamente',
    description:
      'Un sistema para ordenar los pacientes de tu consultorio. Lo estamos construyendo: dejanos tu WhatsApp y te avisamos cuando salga.',
    meta: null,
    cta: {
      label: 'Avisame cuando salga',
      href: whatsappLink('Hola, quiero que me avisen cuando salga el Gestor de pacientes'),
    },
  },
];
