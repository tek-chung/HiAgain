-- Name-based handles. Runs last.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000001', '{"name":"Zoë O''Brien-Søndergård"}'),
  ('00000000-0000-4000-a000-000000000002', '{"name":"Alex Morgan"}'),
  ('00000000-0000-4000-a000-000000000003', '{"name":"张伟"}'),
  ('00000000-0000-4000-a000-000000000004', '{"name":"People"}'),
  ('00000000-0000-4000-a000-000000000005', '{"given_name":"Tek","family_name":"Chung"}');

create function pg_temp.sign_in(u uuid) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u)::text, true);
  perform public.ensure_starter_profile();
  return (select handle from public.profiles where user_id = u);
end $$;

do $$
declare h text;
begin
  assert (select handle from public.profiles where public_id = (select public_id from ids where who = 'a')) = 'alex-morgan', 'A';
  assert (select handle from public.profiles where public_id = (select public_id from ids where who = 'b')) = 'jamie-chen', 'B';
  assert (select handle from public.profiles where public_id = (select public_id from ids where who = 'c')) ~ '^member-[0-9]+$', 'no name → member-N';
  assert pg_temp.sign_in('00000000-0000-4000-a000-000000000001') = 'zoe-obrien-sondergard', 'accents and apostrophes';
  assert pg_temp.sign_in('00000000-0000-4000-a000-000000000002') = 'alex-morgan-2', 'same name numbered';
  assert pg_temp.sign_in('00000000-0000-4000-a000-000000000002') = 'alex-morgan-2', 'stable on repeat sign-in';
  h := pg_temp.sign_in('00000000-0000-4000-a000-000000000003');
  assert h ~ '^member-[0-9]+$', 'non-Latin name: ' || h;
  assert pg_temp.sign_in('00000000-0000-4000-a000-000000000004') = 'people-2', 'reserved word never used plain';
  assert pg_temp.sign_in('00000000-0000-4000-a000-000000000005') = 'tek-chung', 'given + family name';

  -- LinkedIn name changes → new handle; the old one stays theirs and resolves to the new one.
  update auth.users set raw_user_meta_data = '{"name":"Tek Kan Chung"}' where id = '00000000-0000-4000-a000-000000000005';
  assert pg_temp.sign_in('00000000-0000-4000-a000-000000000005') = 'tek-kan-chung', 'follows LinkedIn name';
  assert (select current_handle from public.resolve_handle('tek-chung')) = 'tek-kan-chung', 'old link redirects';
  -- Nobody else can take the old handle.
  insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-4000-a000-000000000006', '{"name":"Tek Chung"}');
  assert pg_temp.sign_in('00000000-0000-4000-a000-000000000006') = 'tek-chung-2', 'old handle stays reserved';
  -- Changing back reuses their own earlier handle.
  update auth.users set raw_user_meta_data = '{"name":"Tek Chung"}' where id = '00000000-0000-4000-a000-000000000005';
  assert pg_temp.sign_in('00000000-0000-4000-a000-000000000005') = 'tek-chung', 'reuses own earlier handle';
end $$;

begin;
set local role anon;
do $$ begin
  assert (select public_id from public.resolve_handle('Alex-Morgan')) = (select public_id from ids where who = 'a'), 'case-insensitive';
  assert not exists (select 1 from public.resolve_handle('nobody-here')), 'unknown';
  assert public.get_public_profile((select public_id from ids where who = 'a')) ->> 'handle' = 'alex-morgan';
  begin perform 1 from public.profile_handles; assert false, 'history not readable';
  exception when insufficient_privilege then null; end;
  begin perform public.assign_handle(gen_random_uuid(), 'x'); assert false, 'internal';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- Blocked pairs can't resolve each other's handle.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ begin
  perform public.block_user((select public_id from ids where who = 'b'));
  assert not exists (select 1 from public.resolve_handle('jamie-chen')), 'blocked';
  perform public.unblock_user((select public_id from ids where who = 'b'));
  assert exists (select 1 from public.resolve_handle('jamie-chen'));
end $$;
commit;
\o
\echo 'rls_zzzzzzhandles_test.sql: all assertions passed'
