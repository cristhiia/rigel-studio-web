import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageMeta } from '../../lib/seo';
import { fetchAdminSummary, getAdminClient } from '../../lib/adminAuth';
import { formatArs } from '../../data/products';
import { BODY, CREAM, CREAM_85, DISPLAY, GOLD, h1, h2 } from '../../components/ui/pageStyles';
import AdminShell, { LINE, NAVY } from './AdminShell';
import Subscribers from './Subscribers';
import Settings from './Settings';
import { Btn } from './adminUi';

// /admin — panel de gestión (Resumen | Suscriptores | Ajustes). Sin sesión o sin permiso (el servidor
// responde 404) vuelve a la home sin explicar por qué.

const TABS = [['resumen', 'Resumen'], ['suscriptores', 'Suscriptores'], ['ajustes', 'Ajustes']];
const TYPE_LABEL = { subscription: 'Suscripción', one_time: 'Pago único' };
const ORDER_STATUS = {
  created: 'Iniciado',
  failed: 'Falló',
  pending: 'Pendiente',
  authorized: 'Autorizada',
  paused: 'Pausada',
  cancelled: 'Cancelado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  refunded: 'Reembolsado',
};

const dateFmt = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Argentina/San_Juan',
});
const formatDate = iso => (iso ? dateFmt.format(new Date(iso)) : '—');
const monthName = iso =>
  new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/San_Juan' }).format(new Date(iso));

const cell = { padding: '14px 12px', borderBottom: `1px solid ${LINE}`, textAlign: 'left', verticalAlign: 'top' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const th = { ...cell, fontFamily: DISPLAY, fontWeight: 500, color: CREAM_85, whiteSpace: 'nowrap' };

function Kpi({ label, value, accent = false, wide = false }) {
  return (
    <div className={wide ? 'adm-kpi adm-kpi--wide' : 'adm-kpi'} style={{ background: NAVY, border: `1px solid ${LINE}`, borderRadius: 16, padding: '20px 22px' }}>
      <p style={{ margin: 0, color: CREAM_85, fontSize: '1rem' }}>{label}</p>
      <p style={{ margin: '8px 0 0', fontFamily: DISPLAY, fontWeight: 700, fontSize: accent ? 'clamp(1.8rem, 5vw, 2.4rem)' : '2rem', lineHeight: 1.1, color: accent ? GOLD : CREAM, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>
        {value}
      </p>
    </div>
  );
}

function Empty({ children }) {
  return <p style={{ color: CREAM_85, margin: 0, padding: '20px 0', borderTop: `1px solid ${LINE}` }}>{children}</p>;
}

function ProductsTable({ products }) {
  if (products.length === 0) return <Empty>Todavía no hay productos cargados en billing_products.</Empty>;
  return (
    <table className="adm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={th}>Producto</th>
          <th style={th}>Cobro</th>
          <th style={{ ...th, textAlign: 'right' }}>Activos</th>
          <th style={{ ...th, textAlign: 'right' }}>En prueba</th>
          <th style={{ ...th, textAlign: 'right' }}>Morosos</th>
          <th style={{ ...th, textAlign: 'right' }}>Cancelados</th>
          <th style={{ ...th, textAlign: 'right' }}>Altas / bajas del mes</th>
          <th style={{ ...th, textAlign: 'right' }}>Ingreso del mes</th>
        </tr>
      </thead>
      <tbody>
        {products.map(p => (
          <tr key={p.slug}>
            <td data-label="Producto" style={{ ...cell, fontFamily: DISPLAY, fontWeight: 500 }}><span>
              {p.name}
              {!p.on_sale && <span style={{ color: CREAM_85, fontFamily: BODY, fontWeight: 400 }}> · pausado</span>}
            </span></td>
            <td data-label="Cobro" style={cell}><span>{TYPE_LABEL[p.billing_type] || p.billing_type}</span></td>
            <td data-label="Activos" style={num}><span>{p.active}</span></td>
            <td data-label="En prueba" style={num}><span>{p.trial}</span></td>
            <td data-label="Morosos" style={num}><span>{p.past_due}</span></td>
            <td data-label="Cancelados" style={num}><span>{p.cancelled}</span></td>
            <td data-label="Altas / bajas del mes" style={num}><span>{p.new_this_month} / {p.churned_this_month}</span></td>
            <td data-label="Ingreso del mes" style={num}><span>
              {formatArs(p.billing_type === 'subscription' ? p.mrr_ars : p.one_time_month_ars)}
              {p.billing_type === 'subscription' && <span style={{ color: CREAM_85 }}> recurrente</span>}
            </span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrdersTable({ orders, names }) {
  if (orders.length === 0) return <Empty>Todavía no hay pedidos.</Empty>;
  return (
    <table className="adm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={th}>Fecha</th>
          <th style={th}>Producto</th>
          <th style={th}>Email</th>
          <th style={th}>Estado</th>
          <th style={{ ...th, textAlign: 'right' }}>Monto</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(o => (
          <tr key={o.id}>
            <td data-label="Fecha" style={{ ...cell, whiteSpace: 'nowrap' }}><span>{formatDate(o.created_at)}</span></td>
            <td data-label="Producto" style={cell}><span>
              {names[o.product_slug] || o.product_slug}
              <span style={{ color: CREAM_85 }}> · {TYPE_LABEL[o.billing_type] || o.billing_type}</span>
            </span></td>
            <td data-label="Email" style={{ ...cell, overflowWrap: 'anywhere' }}><span>{o.email}</span></td>
            <td data-label="Estado" style={cell}><span>{ORDER_STATUS[o.status] || o.status}</span></td>
            <td data-label="Monto" style={num}><span>{formatArs(o.amount_ars)}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Admin() {
  usePageMeta('/admin');
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [email, setEmail] = useState('');
  const [client, setClient] = useState(null);
  const [tab, setTab] = useState('resumen');

  useEffect(() => {
    let cancelled = false;
    const goHome = () => { if (!cancelled) navigate('/', { replace: true }); };
    (async () => {
      const pending = getAdminClient();
      if (!pending) return goHome();
      const c = await pending;
      const { data: auth } = await c.auth.getSession();
      const session = auth && auth.session;
      if (!session) return goHome();
      const summary = await fetchAdminSummary(session.access_token).catch(() => null);
      if (!summary) {
        await c.auth.signOut().catch(() => {});
        return goHome();
      }
      if (cancelled) return;
      setClient(c);
      setEmail(session.user && session.user.email);
      setData(summary);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  async function logout() {
    if (client) await client.auth.signOut().catch(() => {});
    navigate('/', { replace: true });
  }

  // Mientras verifica: pantalla vacía (no anticipa nada del panel).
  if (!data) return <div style={{ minHeight: '100vh', background: '#0A0E1A' }} />;

  const t = data.totals;
  const names = Object.fromEntries(data.products.map(p => [p.slug, p.name]));
  const hasOneTime = data.products.some(p => p.billing_type === 'one_time');

  return (
    <AdminShell
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <span className="adm-user" style={{ color: CREAM_85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
          <button
            type="button"
            onClick={logout}
            style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: '1rem', color: CREAM, background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 100, padding: '10px 18px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Salir
          </button>
        </div>
      }
    >
      <style>{`
        .adm-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .adm-kpi--wide { grid-column: span 2; }
        @media (max-width: 860px) {
          .adm-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 640px) {
          .adm-user { display: none; }
          .adm-table thead { display: none; }
          .adm-table, .adm-table tbody, .adm-table tr, .adm-table td { display: block; width: 100%; box-sizing: border-box; }
          .adm-table tr { border: 1px solid ${LINE}; border-radius: 12px; padding: 6px 14px; margin-bottom: 12px; background: ${NAVY}; }
          .adm-table td { border-bottom: 1px solid ${LINE} !important; padding: 10px 0 !important; text-align: right !important; display: flex; justify-content: space-between; gap: 16px; }
          .adm-table td:last-child { border-bottom: none !important; }
          .adm-table td::before { content: attr(data-label); color: ${CREAM_85}; text-align: left; flex: 0 0 auto; }
          .adm-table td > span { min-width: 0; overflow-wrap: anywhere; }
        }
      `}</style>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 16px 96px' }}>
        <div role="tablist" aria-label="Secciones" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {TABS.map(([id, label]) => (
            <Btn key={id} kind={tab === id ? 'primary' : 'ghost'} onClick={() => setTab(id)} style={{ flex: '1 1 0', minWidth: 0, padding: '10px 4px', fontSize: '0.95rem' }}>{label}</Btn>
          ))}
        </div>

        {tab === 'resumen' && (
          <>
        <h1 style={{ ...h1, fontSize: 'clamp(2rem, 5vw, 2.8rem)' }}>Resumen</h1>
        <p style={{ color: CREAM_85, margin: '12px 0 32px' }}>
          Altas y bajas de {monthName(data.month_start)} · actualizado {formatDate(data.generated_at)}
        </p>

        <div className="adm-kpis">
              <Kpi wide accent label="Ingreso mensual recurrente" value={formatArs(t.mrr_ars)} />
              <Kpi label="Clientes activos" value={t.active} />
              <Kpi label="En prueba" value={t.trial} />
              <Kpi label="Morosos" value={t.past_due} />
              <Kpi label="Cancelados" value={t.cancelled} />
              <Kpi label="Altas del mes" value={t.new_this_month} />
              <Kpi label="Bajas del mes" value={t.churned_this_month} />
              {hasOneTime && <Kpi wide label="Pagos únicos del mes" value={formatArs(t.one_time_month_ars)} />}
            </div>

            <h2 style={{ ...h2, fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)', margin: '56px 0 16px' }}>Por producto</h2>
            <ProductsTable products={data.products} />

            <h2 style={{ ...h2, fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)', margin: '56px 0 16px' }}>Últimos pedidos</h2>
            <OrdersTable orders={data.recent_orders} names={names} />
          </>
        )}

        {tab === 'suscriptores' && (
          <>
            <h1 style={{ ...h1, fontSize: 'clamp(2rem, 5vw, 2.8rem)', marginBottom: 20 }}>Suscriptores</h1>
            <Subscribers client={client} products={data.products} />
          </>
        )}

        {tab === 'ajustes' && (
          <>
            <h1 style={{ ...h1, fontSize: 'clamp(2rem, 5vw, 2.8rem)', marginBottom: 20 }}>Ajustes</h1>
            <Settings client={client} />
          </>
        )}
      </section>
    </AdminShell>
  );
}
