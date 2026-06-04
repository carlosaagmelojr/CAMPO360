-- ============================================================
-- Campo360 — Script de banco de dados Supabase
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

-- Extensão UUID
create extension if not exists "uuid-ossp";

-- ── Equipes ─────────────────────────────────────────────────────
create table if not exists equipes (
  id   uuid primary key default uuid_generate_v4(),
  nome text not null
);

insert into equipes (nome) values
  ('Equipe Alpha'),
  ('Equipe Beta'),
  ('Equipe Gama'),
  ('Equipe Delta')
on conflict do nothing;

-- ── Ordens de serviço ───────────────────────────────────────────
create table if not exists ordens_servico (
  id                 uuid primary key default uuid_generate_v4(),
  numero             text not null unique,
  status             text not null default 'despachada',
  equipe_id          uuid references equipes(id),
  municipio          text,
  bairro             text,
  logradouro         text,
  referencia         text,
  id_poste           text,
  lat                double precision,
  lng                double precision,
  prazo              date,
  prazo_reprogramado date,
  observacoes        text,
  atualizado_em      timestamptz default now(),
  criado_em          timestamptz default now()
);

-- Índice geográfico para consultas de mapa
create index if not exists idx_os_geo
  on ordens_servico (lat, lng)
  where lat is not null and lng is not null;

create index if not exists idx_os_status   on ordens_servico (status);
create index if not exists idx_os_equipe   on ordens_servico (equipe_id);
create index if not exists idx_os_municipio on ordens_servico (municipio);

-- ── Localização das equipes ──────────────────────────────────────
create table if not exists localizacoes_equipe (
  equipe_id     uuid primary key references equipes(id),
  lat           double precision,
  lng           double precision,
  registrado_em timestamptz default now()
);

-- ── Row Level Security (RLS) ─────────────────────────────────────
-- Habilitar RLS nas tabelas
alter table equipes           enable row level security;
alter table ordens_servico    enable row level security;
alter table localizacoes_equipe enable row level security;

-- Política: acesso público de leitura e escrita via anon key
-- (para o sistema funcionar sem auth individual)
-- Em produção: troque por políticas por usuário autenticado

create policy "acesso_publico_equipes"
  on equipes for all
  using (true)
  with check (true);

create policy "acesso_publico_os"
  on ordens_servico for all
  using (true)
  with check (true);

create policy "acesso_publico_localizacoes"
  on localizacoes_equipe for all
  using (true)
  with check (true);

-- ── Realtime ────────────────────────────────────────────────────
-- Habilitar realtime nas tabelas
alter publication supabase_realtime add table ordens_servico;
alter publication supabase_realtime add table localizacoes_equipe;

-- ── Verificação ─────────────────────────────────────────────────
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
