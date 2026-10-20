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
