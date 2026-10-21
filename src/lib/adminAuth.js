// Login del panel /admin con Supabase Auth del proyecto de billing (el mismo
// que usan las apps y api/billing). URL y anon key son públicas; el acceso
// real lo decide el servidor (api/admin/summary contra ADMIN_EMAILS).
let clientPromise = null;

export function getAdminClient() {
  const url = import.meta.env.VITE_BILLING_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_BILLING_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url, anonKey, {
        auth: { storageKey: 'rigel-admin-auth', persistSession: true, autoRefreshToken: true },
      }),
    );
  }
  return clientPromise;
}

export async function fetchAdminSummary(accessToken) {
  const res = await fetch('/api/admin/summary', { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  return res.json();
}

// Llamada autenticada a /api/admin/<path>. Pide el token en cada llamada para
// que Supabase lo renueve solo. Tira Error con el mensaje del servidor.
export async function adminRequest(client, path, { method = 'GET', body, query } = {}) {
  const { data } = await client.auth.getSession();
  const token = data && data.session && data.session.access_token;
  if (!token) throw new Error('La sesión venció. Volvé a ingresar.');
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  const res = await fetch(`/api/admin/${path}${qs}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json.error || 'No se pudo completar la operación');
    error.status = res.status;
    throw error;
  }
  return json;
}
