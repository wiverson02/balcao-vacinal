-- Painel editorial do Balcão Vacinal.
--
-- Este banco é a "bancada de edição". O app público NÃO lê daqui: ele continua lendo
-- os JSONs de src/data/, que são gerados por `npm run publicar` a partir dos itens APROVADOS.
--
-- Acesso: só usuários listados em public.editores (cadastro feito por SQL, ver docs/PAINEL.md).
-- Desative o cadastro aberto em Authentication > Sign In / Providers (Allow new users to sign up).

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.editores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- Documentos de onde o conteúdo vem (espelha src/data/fontes.json).
create table public.fontes (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  ordem integer not null default 0,
  instituicao text not null check (btrim(instituicao) <> ''),
  titulo text not null check (btrim(titulo) <> ''),
  arquivo text check (arquivo is null or arquivo ~* '\.pdf$'),
  url text check (url is null or url ~ '^https://'),
  conferido_em date,
  atualizado_em timestamptz not null default now()
);

-- Um bloco é uma faixa etária da criança (ex.: "2 meses", com idade mínima)
-- ou um grupo (Adolescente, Adulto, Idoso, Gestante), em cada rede (privada ou SUS).
create table public.blocos (
  id uuid primary key default gen_random_uuid(),
  rede text not null check (rede in ('privada', 'sus')),
  tipo text not null check (tipo in ('faixa', 'grupo')),
  rotulo text not null check (btrim(rotulo) <> ''),
  idade_min_meses integer check (idade_min_meses >= 0),
  ordem integer not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (rede, tipo, rotulo),
  -- faixa exige idade mínima; grupo não tem
  check ((tipo = 'faixa') = (idade_min_meses is not null))
);

-- Cada vacina dentro de um bloco: [nome, protege contra, esquema] + fonte e página.
create table public.itens (
  id uuid primary key default gen_random_uuid(),
  bloco_id uuid not null references public.blocos (id) on delete restrict,
  ordem integer not null default 0,
  nome text not null check (btrim(nome) <> ''),
  protege text not null check (btrim(protege) <> ''),
  esquema text not null check (btrim(esquema) <> ''),
  fonte_id text references public.fontes (id) on update cascade on delete restrict,
  pagina text,
  trecho text,
  status text not null default 'rascunho' check (status in ('rascunho', 'aprovado', 'arquivado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users (id) on delete set null,
  -- nada vai para o app sem fonte
  check (status <> 'aprovado' or fonte_id is not null)
);

create index itens_bloco_idx on public.itens (bloco_id, ordem);
create index itens_fonte_idx on public.itens (fonte_id);

-- ---------------------------------------------------------------------------
-- Carimbo de alteração
-- ---------------------------------------------------------------------------

create function public.tocar_atualizado() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create function public.tocar_item() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end;
$$;

create trigger fontes_tocar before insert or update on public.fontes
  for each row execute function public.tocar_atualizado();
create trigger blocos_tocar before insert or update on public.blocos
  for each row execute function public.tocar_atualizado();
create trigger itens_tocar before insert or update on public.itens
  for each row execute function public.tocar_item();

-- ---------------------------------------------------------------------------
-- Segurança (RLS): só editores leem e escrevem; o público não vê nada
-- ---------------------------------------------------------------------------

alter table public.editores enable row level security;
alter table public.fontes enable row level security;
alter table public.blocos enable row level security;
alter table public.itens enable row level security;

revoke all on public.editores, public.fontes, public.blocos, public.itens from anon, authenticated;
grant select on public.editores to authenticated;
grant select, insert, update, delete on public.fontes, public.blocos, public.itens to authenticated;

-- Cada pessoa só enxerga a própria linha em editores (serve para o painel saber se pode entrar).
create policy "ver a propria linha de editor" on public.editores
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "editores gerenciam fontes" on public.fontes
  for all to authenticated
  using (exists (select 1 from public.editores e where e.user_id = (select auth.uid())))
  with check (exists (select 1 from public.editores e where e.user_id = (select auth.uid())));

create policy "editores gerenciam blocos" on public.blocos
  for all to authenticated
  using (exists (select 1 from public.editores e where e.user_id = (select auth.uid())))
  with check (exists (select 1 from public.editores e where e.user_id = (select auth.uid())));

create policy "editores gerenciam itens" on public.itens
  for all to authenticated
  using (exists (select 1 from public.editores e where e.user_id = (select auth.uid())))
  with check (exists (select 1 from public.editores e where e.user_id = (select auth.uid())));
