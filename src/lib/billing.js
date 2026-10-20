import { useEffect, useState } from 'react';

// Cliente del billing multiproducto (api/billing/*).

// Precio y prueba vigentes desde billing_products. Arranca con `fallback`
// (valor del build) y lo reemplaza cuando responde la API.
export function useBillingProduct(slug, fallback) {
  const [product, setProduct] = useState(fallback);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/billing/checkout?product=${encodeURIComponent(slug)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        setProduct(prev => ({
          ...prev,
          usd: data.price_usd ?? prev.usd,
          ars: data.price_ars ?? prev.ars,
          trialDays: data.trial_days ?? prev.trialDays,
        }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug]);
  return product;
}

// Devuelve la URL de Mercado Pago o tira un Error con un mensaje para mostrar.
export async function startCheckout(slug, email) {
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: slug, email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || 'No pudimos iniciar el pago.');
  return data.url;
}

// Parámetros con los que vuelve Mercado Pago a /<slug>/gracias:
// suscripción → preapproval_id · pago único → external_reference + payment_id.
export function accessQuery(slug, params) {
  const q = new URLSearchParams({ product: slug });
  const order = params.get('external_reference') || params.get('order');
  const preapprovalId = params.get('preapproval_id');
  const paymentId = params.get('payment_id') || params.get('collection_id');
  if (order) q.set('order', order);
  else if (preapprovalId) q.set('preapproval_id', preapprovalId);
  else return null;
  if (paymentId) q.set('payment_id', paymentId);
  return q.toString();
}
