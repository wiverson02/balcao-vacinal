-- Run only against an empty, disposable development database after both migrations.
-- The transaction is rolled back at the end; never run concurrently with other writers.
begin;

do $$
declare
  function_oid regprocedure := 'public.semear_editorial(jsonb,jsonb,jsonb)'::regprocedure;
  export_oid regprocedure := 'public.exportar_editorial()'::regprocedure;
  is_security_definer boolean;
begin
  if exists (select 1 from public.fontes)
    or exists (select 1 from public.blocos)
    or exists (select 1 from public.itens)
  then
    raise exception 'This test requires empty fontes, blocos and itens tables.';
  end if;

  select p.prosecdef into is_security_definer
  from pg_catalog.pg_proc p
  where p.oid = function_oid;
  if is_security_definer is distinct from false then
    raise exception 'semear_editorial must use SECURITY INVOKER.';
  end if;
  if pg_catalog.has_function_privilege('anon', function_oid, 'EXECUTE') then
    raise exception 'anon must not be able to execute semear_editorial.';
  end if;
  if not pg_catalog.has_function_privilege('authenticated', function_oid, 'EXECUTE') then
    raise exception 'authenticated must be able to execute semear_editorial.';
  end if;
  select p.prosecdef into is_security_definer
  from pg_catalog.pg_proc p
  where p.oid = export_oid;
  if is_security_definer is distinct from false then
    raise exception 'exportar_editorial must use SECURITY INVOKER.';
  end if;
  if pg_catalog.has_function_privilege('anon', export_oid, 'EXECUTE') then
    raise exception 'anon must not be able to execute exportar_editorial.';
  end if;
  if not pg_catalog.has_function_privilege('authenticated', export_oid, 'EXECUTE') then
    raise exception 'authenticated must be able to execute exportar_editorial.';
  end if;
  if (
    select count(*) from pg_catalog.pg_trigger
    where not tgisinternal
      and (
        (tgrelid = 'public.fontes'::regclass and tgname = 'fontes_serializar_escritas')
        or (tgrelid = 'public.blocos'::regclass and tgname = 'blocos_serializar_escritas')
        or (tgrelid = 'public.itens'::regclass and tgname = 'itens_serializar_escritas')
      )
  ) <> 3 then
    raise exception 'Expected editorial write-serialization triggers are missing.';
  end if;
  if not exists (select 1 from public.editores) then
    raise exception 'Create an editor account in this disposable development database first.';
  end if;
end;
$$;

select pg_catalog.set_config(
  'request.jwt.claim.sub',
  (select e.user_id::text from public.editores e order by e.user_id limit 1),
  true
);
set local role authenticated;

select pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000000', true);
do $$
begin
  begin
    perform public.semear_editorial('[]'::jsonb, '[]'::jsonb, '[]'::jsonb);
    raise exception 'A non-editor unexpectedly executed semear_editorial.';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.exportar_editorial();
    raise exception 'A non-editor unexpectedly executed exportar_editorial.';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select pg_catalog.set_config(
  'request.jwt.claim.sub',
  (select e.user_id::text from public.editores e order by e.user_id limit 1),
  true
);
do $$
declare
  exportacao jsonb;
begin
  begin
    perform public.semear_editorial(
      '[{"id":"seed-security-test-source","ordem":1,"instituicao":"Test","titulo":"Test"}]'::jsonb,
      '[{"id":"00000000-0000-4000-8000-000000000001","rede":"privada","tipo":"grupo","rotulo":"Test","ordem":1}]'::jsonb,
      '[{"id":"00000000-0000-4000-8000-000000000002","bloco_id":"00000000-0000-4000-8000-000000000001","ordem":1,"nome":"","protege":"Test","esquema":"Test","fonte_id":"seed-security-test-source","status":"aprovado"}]'::jsonb
    );
    raise exception 'Invalid item unexpectedly passed validation.';
  exception when check_violation then
    null;
  end;

  if exists (select 1 from public.fontes where id = 'seed-security-test-source')
    or exists (select 1 from public.blocos where id = '00000000-0000-4000-8000-000000000001')
    or exists (select 1 from public.itens where id = '00000000-0000-4000-8000-000000000002')
  then
    raise exception 'Failed seed left partial rows behind.';
  end if;

  perform public.semear_editorial(
    '[{"id":"seed-security-test-source","ordem":1,"instituicao":"Test","titulo":"Test"}]'::jsonb,
    '[{"id":"00000000-0000-4000-8000-000000000001","rede":"privada","tipo":"grupo","rotulo":"Test","ordem":1}]'::jsonb,
    '[{"id":"00000000-0000-4000-8000-000000000002","bloco_id":"00000000-0000-4000-8000-000000000001","ordem":1,"nome":"Test vaccine","protege":"Test","esquema":"Test","fonte_id":"seed-security-test-source","status":"aprovado"}]'::jsonb
  );

  if not exists (select 1 from public.fontes where id = 'seed-security-test-source')
    or not exists (select 1 from public.blocos where id = '00000000-0000-4000-8000-000000000001')
    or not exists (select 1 from public.itens where id = '00000000-0000-4000-8000-000000000002')
  then
    raise exception 'Valid seed did not insert rows into all three tables.';
  end if;

  select public.exportar_editorial() into exportacao;
  if pg_catalog.jsonb_array_length(exportacao->'blocos') <> 1
    or pg_catalog.jsonb_array_length(exportacao->'itens') <> 1
    or pg_catalog.jsonb_array_length(exportacao->'fontes') <> 1
  then
    raise exception 'Consistent editorial export returned unexpected data.';
  end if;
end;
$$;

reset role;
rollback;
