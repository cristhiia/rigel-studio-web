-- ══════════════════════════════════════════════════════════════════════════
-- CRM de Rigel Studio (/admin): fichas de producto, bitácora de avances y
-- piezas de publicidad con sus resultados. Se aplica en el mismo proyecto de
-- Supabase que el billing. Solo lo toca el servidor (service role): RLS
-- activado y sin permisos para anon / authenticated.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.crm_products (
  slug            text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name            text not null check (char_length(name) between 1 and 60),
  tagline         text not null default '' check (char_length(tagline) <= 140),
  status          text not null default 'idea'
                  check (status in ('idea', 'desarrollo', 'beta', 'vendiendo', 'pausado', 'archivado')),
  phase           text not null default '' check (char_length(phase) <= 80),
  pricing         text not null default '' check (char_length(pricing) <= 200),
  how_it_works    text not null default '' check (char_length(how_it_works) <= 4000),
  features        text not null default '' check (char_length(features) <= 4000),
  next_steps      text not null default '' check (char_length(next_steps) <= 4000),
  competition     text not null default '' check (char_length(competition) <= 4000),
  brand_brief     text not null default '' check (char_length(brand_brief) <= 4000),
  links           text not null default '' check (char_length(links) <= 2000),
  -- Si el producto cobra por el billing, acá va el slug de billing_products
  -- (de ahí salen los usuarios y el ingreso reales). Si no, valen los manuales.
  billing_slug    text,
  manual_users    integer not null default 0 check (manual_users between 0 and 10000000),
  manual_mrr_ars  integer not null default 0 check (manual_mrr_ars between 0 and 2000000000),
  sort_order      integer not null default 100,
  updated_at      timestamptz not null default now()
);

create table if not exists public.crm_log (
  id            bigint generated always as identity primary key,
  product_slug  text not null references public.crm_products (slug) on delete cascade,
  at            timestamptz not null default now(),
  kind          text not null default 'avance' check (kind in ('avance', 'decision', 'nota')),
  text          text not null check (char_length(text) between 1 and 600)
);
create index if not exists crm_log_product_at_idx on public.crm_log (product_slug, at desc);

create table if not exists public.crm_creatives (
  id            bigint generated always as identity primary key,
  product_slug  text not null references public.crm_products (slug) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  kind          text not null default 'post' check (kind in ('post', 'video', 'historia', 'otro')),
  title         text not null check (char_length(title) between 1 and 120),
  concept       text not null default '' check (char_length(concept) <= 1500),
  caption       text not null default '' check (char_length(caption) <= 2200),
  hashtags      text not null default '' check (char_length(hashtags) <= 500),
  media_url     text not null default '' check (char_length(media_url) <= 500),
  status        text not null default 'idea' check (status in ('idea', 'listo', 'publicado', 'descartado')),
  platform      text not null default 'instagram' check (platform in ('instagram', 'facebook', 'tiktok', 'otro')),
  published_on  date,
  -- Resultados cargados a mano (nada se conecta a Meta).
  reach         integer check (reach between 0 and 1000000000),
  views         integer check (views between 0 and 1000000000),
  likes         integer check (likes between 0 and 1000000000),
  comments      integer check (comments between 0 and 1000000000),
  saves         integer check (saves between 0 and 1000000000),
  shares        integer check (shares between 0 and 1000000000),
  clicks        integer check (clicks between 0 and 1000000000),
  conversions   integer check (conversions between 0 and 1000000000),
  spend_ars     integer check (spend_ars between 0 and 2000000000),
  verdict       text check (verdict is null or verdict in ('funciono', 'no_funciono')),
  learnings     text not null default '' check (char_length(learnings) <= 1000)
);
create index if not exists crm_creatives_product_idx on public.crm_creatives (product_slug, created_at desc);

alter table public.crm_products  enable row level security;
alter table public.crm_log       enable row level security;
alter table public.crm_creatives enable row level security;
revoke all on public.crm_products, public.crm_log, public.crm_creatives from anon, authenticated;

-- ── Generador de publicidad ───────────────────────────────────────────────
-- Brief estructurado por producto (el generador solo usa estos textos: no
-- inventa funciones, precios ni testimonios) y datos para volver a dibujar o
-- reutilizar cada pieza guardada.
alter table public.crm_products add column if not exists audience text not null default '' check (char_length(audience) <= 300);
alter table public.crm_products add column if not exists pains    text not null default '' check (char_length(pains) <= 1500);
alter table public.crm_products add column if not exists benefits text not null default '' check (char_length(benefits) <= 1500);
alter table public.crm_products add column if not exists cta      text not null default '' check (char_length(cta) <= 100);
alter table public.crm_products add column if not exists tone     text not null default '' check (char_length(tone) <= 200);
alter table public.crm_products add column if not exists hashtags text not null default '' check (char_length(hashtags) <= 300);
alter table public.crm_products add column if not exists accent   text not null default '' check (accent = '' or accent ~ '^#[0-9a-fA-F]{6}$');
alter table public.crm_products add column if not exists bg       text not null default '' check (bg = '' or bg ~ '^#[0-9a-fA-F]{6}$');

alter table public.crm_creatives add column if not exists layout jsonb;
alter table public.crm_creatives add column if not exists prompt text not null default '' check (char_length(prompt) <= 4000);

-- ── Aprendizaje de estilos ────────────────────────────────────────────────
-- tick: gusto visual (verde / rojo) que se le da a cada pieza generada.
-- learning_since: al reiniciar lo aprendido, el generador ignora lo anterior.
alter table public.crm_creatives add column if not exists tick text check (tick is null or tick in ('verde', 'rojo'));
alter table public.crm_products  add column if not exists learning_since timestamptz;

-- Estilo visual del producto: habilita plantillas con motivos propios en el generador
-- ('nautico' = brújula, ancla, velero, plano y arco luminoso, para Keelwise).
alter table public.crm_products add column if not exists motif text not null default '' check (motif in ('', 'nautico'));
update public.crm_products set motif = 'nautico' where slug = 'keelwise' and motif = '';
