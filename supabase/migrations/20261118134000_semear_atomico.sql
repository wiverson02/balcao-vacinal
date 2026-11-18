-- Carga inicial transacional do conteúdo editorial. Executar manualmente depois da migration inicial.
create or replace function public.serializar_escritas_editoriais()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(762915608143);
  return null;
end;
$$;

create trigger fontes_serializar_escritas
  before insert or update or delete on public.fontes
  for each statement execute function public.serializar_escritas_editoriais();
create trigger blocos_serializar_escritas
  before insert or update or delete on public.blocos
  for each statement execute function public.serializar_escritas_editoriais();
create trigger itens_serializar_escritas
  before insert or update or delete on public.itens
  for each statement execute function public.serializar_escritas_editoriais();

create or replace function public.semear_editorial(
  p_fontes jsonb,
  p_blocos jsonb,
  p_itens jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.editores e where e.user_id = auth.uid()
  ) then
    raise exception 'Apenas editores podem executar a carga inicial.'
      using errcode = '42501';
  end if;

  if pg_catalog.jsonb_typeof(p_fontes) is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_blocos) is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_itens) is distinct from 'array'
  then
    raise exception 'Os dados da carga inicial devem ser arrays JSON.'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(762915608143);

  if exists (select 1 from public.fontes)
    or exists (select 1 from public.blocos)
    or exists (select 1 from public.itens)
  then
    raise exception 'A carga inicial exige as tabelas fontes, blocos e itens vazias.'
      using errcode = '55000';
  end if;

  insert into public.fontes (id, ordem, instituicao, titulo, arquivo, url, conferido_em)
  select f.id, f.ordem, f.instituicao, f.titulo, f.arquivo, f.url, f.conferido_em
  from pg_catalog.jsonb_to_recordset(p_fontes) as f(
    id text,
    ordem integer,
    instituicao text,
    titulo text,
    arquivo text,
    url text,
    conferido_em date
  );

  insert into public.blocos (id, rede, tipo, rotulo, idade_min_meses, ordem)
  select b.id, b.rede, b.tipo, b.rotulo, b.idade_min_meses, b.ordem
  from pg_catalog.jsonb_to_recordset(p_blocos) as b(
    id uuid,
    rede text,
    tipo text,
    rotulo text,
    idade_min_meses integer,
    ordem integer
  );

  insert into public.itens (id, bloco_id, ordem, nome, protege, esquema, fonte_id, pagina, trecho, status)
  select i.id, i.bloco_id, i.ordem, i.nome, i.protege, i.esquema, i.fonte_id, i.pagina, i.trecho, i.status
  from pg_catalog.jsonb_to_recordset(p_itens) as i(
    id uuid,
    bloco_id uuid,
    ordem integer,
    nome text,
    protege text,
    esquema text,
    fonte_id text,
    pagina text,
    trecho text,
    status text
  );
end;
$$;

revoke all on function public.semear_editorial(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.semear_editorial(jsonb, jsonb, jsonb) to authenticated;

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
    )
  )
  into resultado;

  return resultado;
end;
$$;

revoke all on function public.exportar_editorial() from public, anon;
grant execute on function public.exportar_editorial() to authenticated;
