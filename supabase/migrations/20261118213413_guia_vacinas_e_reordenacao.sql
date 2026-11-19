-- Espelho dos cards do calendário e base editorial do guia de vacinas.
-- Aplicar manualmente depois das migrations iniciais; não executar via build.

alter table public.itens
  add column extras jsonb not null default '[]'::jsonb;

alter table public.itens
  add constraint itens_extras_array_check
  check (pg_catalog.jsonb_typeof(extras) = 'array');

create table public.guia_vacinas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ordem integer not null default 0,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'aprovado')),
  fonte_id text references public.fontes (id) on update cascade on delete restrict,
  nome text not null check (pg_catalog.btrim(nome) <> ''),
  nome_comercial text,
  fabricante text,
  rede text not null default 'privada' check (rede in ('pni', 'privada', 'ambas')),
  apresentacoes jsonb not null default '[]'::jsonb
    check (pg_catalog.jsonb_typeof(apresentacoes) = 'array'),
  faixa_etaria jsonb not null default '[]'::jsonb
    check (pg_catalog.jsonb_typeof(faixa_etaria) = 'array'),
  esquema_doses jsonb not null default '[]'::jsonb
    check (pg_catalog.jsonb_typeof(esquema_doses) = 'array'),
  indicacoes jsonb not null default '[]'::jsonb
    check (pg_catalog.jsonb_typeof(indicacoes) = 'array'),
  diferenciais_clinicos jsonb not null default '[]'::jsonb
    check (pg_catalog.jsonb_typeof(diferenciais_clinicos) = 'array'),
  beneficio text,
  conservacao_temperatura text,
  diluicao_preparo text,
  via_sitio_aplicacao text,
  intervalos_minimos jsonb not null default '[]'::jsonb
    check (pg_catalog.jsonb_typeof(intervalos_minimos) = 'array'),
  eventos_adversos jsonb not null default '[]'::jsonb
    check (pg_catalog.jsonb_typeof(eventos_adversos) = 'array'),
  contraindicacoes jsonb not null default '[]'::jsonb
    check (pg_catalog.jsonb_typeof(contraindicacoes) = 'array'),
  extras jsonb not null default '[]'::jsonb
    check (pg_catalog.jsonb_typeof(extras) = 'array'),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users (id) on delete set null,
  check (status <> 'aprovado' or fonte_id is not null)
);

create index guia_vacinas_status_ordem_idx on public.guia_vacinas (status, ordem);
create index guia_vacinas_fonte_idx on public.guia_vacinas (fonte_id);

alter table public.guia_vacinas enable row level security;
revoke all on public.guia_vacinas from anon, authenticated;
grant select, insert, update, delete on public.guia_vacinas to authenticated;

create policy "editores gerenciam guia de vacinas" on public.guia_vacinas
  for all to authenticated
  using (exists (
    select 1 from public.editores e where e.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.editores e where e.user_id = (select auth.uid())
  ));

create or replace function public.tocar_guia_vacina()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end;
$$;

create trigger guia_vacinas_tocar
  before insert or update on public.guia_vacinas
  for each row execute function public.tocar_guia_vacina();

create trigger guia_vacinas_serializar_escritas
  before insert or update or delete on public.guia_vacinas
  for each statement execute function public.serializar_escritas_editoriais();

create or replace function public.reordenar_blocos(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rede text;
  v_tipo text;
  v_total bigint;
  v_correspondentes bigint;
begin
  if auth.uid() is null or not exists (
    select 1 from public.editores e where e.user_id = auth.uid()
  ) then
    raise exception 'Apenas editores podem reordenar blocos.'
      using errcode = '42501';
  end if;

  if p_ids is null or pg_catalog.array_position(p_ids, null) is not null then
    raise exception 'Informe todos os ids dos blocos para reordenar.'
      using errcode = '22023';
  end if;

  if pg_catalog.cardinality(p_ids) = 0 then
    if exists (select 1 from public.blocos) then
      raise exception 'A lista de blocos não pode estar vazia.'
        using errcode = '22023';
    end if;
    return;
  end if;

  if pg_catalog.cardinality(p_ids) <> (
    select pg_catalog.count(distinct x.id) from pg_catalog.unnest(p_ids) as x(id)
  ) then
    raise exception 'A lista de blocos contém ids repetidos.'
      using errcode = '22023';
  end if;

  select b.rede, b.tipo into v_rede, v_tipo
  from public.blocos b
  where b.id = p_ids[1];
  if not found then
    raise exception 'Bloco não encontrado.'
      using errcode = '22023';
  end if;

  select pg_catalog.count(*) into v_total
  from public.blocos b
  where b.rede = v_rede and b.tipo = v_tipo;

  select pg_catalog.count(*) into v_correspondentes
  from public.blocos b
  where b.rede = v_rede and b.tipo = v_tipo and b.id = any(p_ids);

  if v_total <> pg_catalog.cardinality(p_ids) or v_correspondentes <> v_total then
    raise exception 'A lista deve conter todos os blocos da mesma rede e tipo.'
      using errcode = '22023';
  end if;

  update public.blocos b
  set ordem = ordenados.posicao
  from (
    select x.id, x.posicao::integer as posicao
    from pg_catalog.unnest(p_ids) with ordinality as x(id, posicao)
  ) as ordenados
  where b.id = ordenados.id;
end;
$$;

create or replace function public.reordenar_itens(p_bloco_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total bigint;
  v_correspondentes bigint;
begin
  if auth.uid() is null or not exists (
    select 1 from public.editores e where e.user_id = auth.uid()
  ) then
    raise exception 'Apenas editores podem reordenar itens.'
      using errcode = '42501';
  end if;

  if p_bloco_id is null or p_ids is null
    or pg_catalog.array_position(p_ids, null) is not null
  then
    raise exception 'Informe o bloco e todos os ids dos itens para reordenar.'
      using errcode = '22023';
  end if;

  if pg_catalog.cardinality(p_ids) <> (
    select pg_catalog.count(distinct x.id) from pg_catalog.unnest(p_ids) as x(id)
  ) then
    raise exception 'A lista de itens contém ids repetidos.'
      using errcode = '22023';
  end if;

  select pg_catalog.count(*) into v_total
  from public.itens i where i.bloco_id = p_bloco_id;

  if v_total = 0 and pg_catalog.cardinality(p_ids) = 0 then
    return;
  end if;

  select pg_catalog.count(*) into v_correspondentes
  from public.itens i
  where i.bloco_id = p_bloco_id and i.id = any(p_ids);

  if v_total <> pg_catalog.cardinality(p_ids) or v_correspondentes <> v_total then
    raise exception 'A lista deve conter todos os itens do bloco.'
      using errcode = '22023';
  end if;

  update public.itens i
  set ordem = ordenados.posicao
  from (
    select x.id, x.posicao::integer as posicao
    from pg_catalog.unnest(p_ids) with ordinality as x(id, posicao)
  ) as ordenados
  where i.id = ordenados.id and i.bloco_id = p_bloco_id;
end;
$$;

create or replace function public.reordenar_guia_vacinas(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total bigint;
begin
  if auth.uid() is null or not exists (
    select 1 from public.editores e where e.user_id = auth.uid()
  ) then
    raise exception 'Apenas editores podem reordenar o guia de vacinas.'
      using errcode = '42501';
  end if;

  if p_ids is null or pg_catalog.array_position(p_ids, null) is not null then
    raise exception 'Informe todos os ids do guia para reordenar.'
      using errcode = '22023';
  end if;

  select pg_catalog.count(*) into v_total from public.guia_vacinas;
  if pg_catalog.cardinality(p_ids) <> v_total or pg_catalog.cardinality(p_ids) <> (
    select pg_catalog.count(distinct x.id) from pg_catalog.unnest(p_ids) as x(id)
  ) then
    raise exception 'A lista deve conter todos os registros do guia, sem repetição.'
      using errcode = '22023';
  end if;

  update public.guia_vacinas g
  set ordem = ordenados.posicao
  from (
    select x.id, x.posicao::integer as posicao
    from pg_catalog.unnest(p_ids) with ordinality as x(id, posicao)
  ) as ordenados
  where g.id = ordenados.id;
end;
$$;

create or replace function public.semear_guia_vacinas(p_guia_vacinas jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_inseridos integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.editores e where e.user_id = auth.uid()
  ) then
    raise exception 'Apenas editores podem semear o guia de vacinas.'
      using errcode = '42501';
  end if;

  if pg_catalog.jsonb_typeof(p_guia_vacinas) is distinct from 'array' then
    raise exception 'Os dados do guia devem ser um array JSON.'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(762915608143);

  insert into public.guia_vacinas (
    slug, ordem, status, fonte_id, nome, nome_comercial, fabricante, rede,
    apresentacoes, faixa_etaria, esquema_doses, indicacoes, diferenciais_clinicos,
    beneficio, conservacao_temperatura, diluicao_preparo, via_sitio_aplicacao,
    intervalos_minimos, eventos_adversos, contraindicacoes, extras
  )
  select
    g.slug, g.ordem, g.status, g.fonte_id, g.nome, g.nome_comercial, g.fabricante, g.rede,
    coalesce(g.apresentacoes, '[]'::jsonb),
    coalesce(g.faixa_etaria, '[]'::jsonb),
    coalesce(g.esquema_doses, '[]'::jsonb),
    coalesce(g.indicacoes, '[]'::jsonb),
    coalesce(g.diferenciais_clinicos, '[]'::jsonb),
    g.beneficio, g.conservacao_temperatura, g.diluicao_preparo, g.via_sitio_aplicacao,
    coalesce(g.intervalos_minimos, '[]'::jsonb),
    coalesce(g.eventos_adversos, '[]'::jsonb),
    coalesce(g.contraindicacoes, '[]'::jsonb),
    coalesce(g.extras, '[]'::jsonb)
  from pg_catalog.jsonb_to_recordset(p_guia_vacinas) as g(
    slug text,
    ordem integer,
    status text,
    fonte_id text,
    nome text,
    nome_comercial text,
    fabricante text,
    rede text,
    apresentacoes jsonb,
    faixa_etaria jsonb,
    esquema_doses jsonb,
    indicacoes jsonb,
    diferenciais_clinicos jsonb,
    beneficio text,
    conservacao_temperatura text,
    diluicao_preparo text,
    via_sitio_aplicacao text,
    intervalos_minimos jsonb,
    eventos_adversos jsonb,
    contraindicacoes jsonb,
    extras jsonb
  )
  on conflict (slug) do nothing;

  get diagnostics v_inseridos = row_count;
  return v_inseridos;
end;
$$;

create or replace function public.exportar_editorial()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  resultado jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.editores e where e.user_id = auth.uid()
  ) then
    raise exception 'Apenas editores podem exportar o conteúdo editorial.'
      using errcode = '42501';
  end if;

  select pg_catalog.jsonb_build_object(
    'blocos', coalesce(
      (select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(b)) from public.blocos b),
      '[]'::jsonb
    ),
    'itens', coalesce(
      (select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(i)) from public.itens i),
      '[]'::jsonb
    ),
    'fontes', coalesce(
      (select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(f)) from public.fontes f),
      '[]'::jsonb
    ),
    'guia_vacinas', coalesce(
      (select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(g) order by g.ordem, g.slug)
       from public.guia_vacinas g),
      '[]'::jsonb
    )
  )
  into resultado;

  return resultado;
end;
$$;

revoke all on function public.reordenar_blocos(uuid[]) from public, anon;
revoke all on function public.reordenar_itens(uuid, uuid[]) from public, anon;
revoke all on function public.reordenar_guia_vacinas(uuid[]) from public, anon;
revoke all on function public.semear_guia_vacinas(jsonb) from public, anon;
revoke all on function public.exportar_editorial() from public, anon;

grant execute on function public.reordenar_blocos(uuid[]) to authenticated;
grant execute on function public.reordenar_itens(uuid, uuid[]) to authenticated;
grant execute on function public.reordenar_guia_vacinas(uuid[]) to authenticated;
grant execute on function public.semear_guia_vacinas(jsonb) to authenticated;
grant execute on function public.exportar_editorial() to authenticated;
