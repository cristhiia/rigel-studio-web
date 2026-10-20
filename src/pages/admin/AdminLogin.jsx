import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageMeta } from '../../lib/seo';
import { getAdminClient } from '../../lib/adminAuth';
import { CREAM, GOLD, body, h1, input, primaryButton } from '../../components/ui/pageStyles';
import AdminShell from './AdminShell';

// /admin/ingresar — login con email y contraseña de Supabase Auth.
// No dice si el email es admin: eso lo resuelve /admin contra el servidor.
export default function AdminLogin() {
  usePageMeta('/admin/ingresar');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ loading: false, error: '' });

  useEffect(() => {
    if (!getAdminClient()) navigate('/', { replace: true });
  }, [navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const client = await getAdminClient();
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      navigate('/admin', { replace: true });
    } catch {
      setState({ loading: false, error: 'No pudimos ingresar. Revisá el email y la contraseña.' });
    }
  }

  const field = { ...input, width: '100%', borderRadius: 12, boxSizing: 'border-box' };
  const lbl = { ...body, display: 'block', color: CREAM, margin: '20px 0 8px' };

  return (
    <AdminShell>
      <section style={{ maxWidth: 420, margin: '0 auto', padding: '64px 16px 96px' }}>
        <h1 style={{ ...h1, fontSize: 'clamp(2rem, 6vw, 2.6rem)' }}>Ingresar</h1>
        <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <label htmlFor="adm-email" style={lbl}>Email</label>
          <input id="adm-email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} style={field} />
          <label htmlFor="adm-pass" style={lbl}>Contraseña</label>
          <input id="adm-pass" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={field} />
          <button type="submit" disabled={state.loading} style={{ ...primaryButton, width: '100%', marginTop: 28, opacity: state.loading ? 0.85 : 1 }}>
            {state.loading ? 'Ingresando…' : 'Ingresar'}
          </button>
          {state.error && (
            <p role="alert" style={{ ...body, color: CREAM, marginTop: 16, borderLeft: `2px solid ${GOLD}`, paddingLeft: 12 }}>
              {state.error}
            </p>
          )}
        </form>
      </section>
    </AdminShell>
  );
}
