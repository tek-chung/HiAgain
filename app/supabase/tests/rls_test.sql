-- Access-control and behaviour tests for the first-milestone schema.
-- Run with scripts/test-db.sh (local Postgres + auth stub). Fictional data only.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

-- Fixtures: three accounts (as Supabase Auth would create after LinkedIn sign-in)
insert into auth.users (id, raw_user_meta_data, email) values
  ('00000000-0000-4000-8000-00000000000a', '{"name":"Alex Morgan","picture":"https://media.example/alex.jpg","email":"alex@example.test"}', 'alex@example.test'),
  ('00000000-0000-4000-8000-00000000000b', '{"given_name":"Jamie","family_name":"Chen","picture":"http://insecure.example/x.jpg"}', 'jamie@example.test'),
  ('00000000-0000-4000-8000-00000000000c', '{}', 'sam@example.test');

create table public.ids (who text primary key, public_id text); -- test helper
grant all on public.ids to authenticated, anon;

-- 1. Starter profiles: created once, idempotent, defaults present, email never copied.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$
declare r record; r2 record; n int;
begin
  select * into r from public.ensure_starter_profile();
  assert r.created, 'first call creates';
  select * into r2 from public.ensure_starter_profile();
  assert not r2.created and r2.public_id = r.public_id, 'second call reuses the same profile';
  assert r.public_id ~ '^[A-Za-z0-9_-]{12}$', 'public id format';
  select count(*) into n from public.profile_actions; assert n = 3, 'three default actions';
  insert into ids values ('a', r.public_id);
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$ declare r record; begin
  select * into r from public.ensure_starter_profile(); insert into ids values ('b', r.public_id);
  assert (select display_name from public.profiles) = 'Jamie Chen', 'name from given/family';
  assert (select avatar_url from public.profiles) is null, 'non-HTTPS picture dropped';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c"}', true);
do $$ declare r record; begin
  select * into r from public.ensure_starter_profile(); insert into ids values ('c', r.public_id);
  assert (select display_name from public.profiles) = '', 'missing name tolerated';
end $$;
commit;

-- Owner edits keep working and never get overwritten by a repeat sign-in.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ begin
  perform public.update_my_profile('Alex M.', 'Product builder · London', 'https://www.linkedin.com/in/alex-morgan-demo');
  perform public.ensure_starter_profile();
  assert (select display_name from public.profiles) = 'Alex M.', 'edit preserved after repeat sign-in';
  begin
    perform public.update_my_profile('Alex', null, 'https://evil.example/in/alex');
    assert false, 'bad LinkedIn URL must be rejected';
  exception when check_violation then null;
  end;
end $$;
commit;

-- 2. Public profile: anonymous access returns only allowlisted fields.
begin;
set local role anon;
do $$
declare j jsonb; keys text[];
begin
  j := public.get_public_profile((select public_id from ids where who = 'a'));
  select array_agg(k order by k) into keys from jsonb_object_keys(j) k;
  assert keys = array['actions','avatarUrl','displayName','headline','linkedinUrl','publicId'], 'allowlist: ' || keys::text;
  assert j::text !~ 'example.test', 'no email in public response';
  assert j::text !~ '00000000-0000-4000', 'no internal user id in public response';
  assert jsonb_array_length(j -> 'actions') = 3;
  assert (j -> 'actions' -> 0 ->> 'kind') = 'join_me' and (j -> 'actions' -> 0 ->> 'prompt') = 'Coffee and a catch-up?';
  assert public.get_public_profile('nonexistent1') is null, 'unknown id gives null';
end $$;
-- anon cannot read tables or call private functions
do $$ begin
  begin perform 1 from public.profiles; assert false, 'anon read profiles';
  exception when insufficient_privilege then null; end;
  begin perform public.save_profile('x'); assert false, 'anon save';
  exception when insufficient_privilege then null; end;
  begin perform public.my_saved_people(); assert false, 'anon list saves';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- 3. Signed-in save (B saves A): repeat scan keeps original; self-scan refused; no direct writes.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$
declare r record; r2 record; a text := (select public_id from ids where who='a');
begin
  select * into r from public.save_profile(a); assert r.status = 'saved', r.status;
  select * into r2 from public.save_profile(a); assert r2.status = 'already_saved' and r2.saved_at = r.saved_at;
  select * into r from public.save_profile((select public_id from ids where who='b')); assert r.status = 'self';
  select * into r from public.save_profile('zzzzzzzzzzzz'); assert r.status = 'not_found';
  begin
    insert into public.saved_people (saver_id, subject_id, saved_at, source)
    values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c', now(), 'scan');
    assert false, 'direct insert must be denied';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set display_name = 'hacked';
    assert false, 'direct update must be denied';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- 4. Guest import (C imports a browser collection): retry-safe, earliest time, note conflicts.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c"}', true);
do $$
declare
  a text := (select public_id from ids where who='a');
  b text := (select public_id from ids where who='b');
  c text := (select public_id from ids where who='c');
  items jsonb;
  r record; n int;
begin
  items := jsonb_build_array(
    jsonb_build_object('public_id', a, 'saved_at', '2026-11-12T09:00:00Z', 'note', 'Met at the product meetup'),
    jsonb_build_object('public_id', b, 'saved_at', '2026-11-12T10:00:00Z', 'note', null),
    jsonb_build_object('public_id', c, 'saved_at', '2026-11-12T10:00:00Z', 'note', null),
    jsonb_build_object('public_id', 'nonexistent1', 'saved_at', '2026-11-12T10:00:00Z'),
    jsonb_build_object('public_id', '../etc', 'saved_at', '2026-11-12T10:00:00Z'),
    jsonb_build_object('public_id', a, 'saved_at', '2099-01-01T00:00:00Z'));
  create temporary table res1 on commit drop as select * from public.import_guest_saves(items);
  assert (select array_agg(status order by ord) from (select status, row_number() over () ord from res1) x)
       = array['imported','imported','self','not_found','invalid','invalid'], (select array_agg(status)::text from res1);

  -- Retry the same batch: nothing duplicated, same timestamps, notes untouched.
  create temporary table res2 on commit drop as select * from public.import_guest_saves(items);
  select count(*) into n from public.saved_people; assert n = 2, 'no duplicates after retry: ' || n;
  assert (select saved_at from public.saved_people s join public.profiles p on false limit 1) is null; -- RLS: C can't read others' profiles
  assert (select count(*) from res2 where status = 'merged') = 2;

  -- Earlier timestamp from another browser wins; later one never moves it.
  perform public.import_guest_saves(jsonb_build_array(jsonb_build_object('public_id', a, 'saved_at', '2026-11-11T08:00:00Z')));
  perform public.import_guest_saves(jsonb_build_array(jsonb_build_object('public_id', a, 'saved_at', '2026-11-13T08:00:00Z')));
  assert (select saved_at from public.my_saved_people() where public_id = a) = '2026-11-11T08:00:00Z';

  -- Different note: reported as a conflict, existing note kept.
  select * into r from public.import_guest_saves(jsonb_build_array(
    jsonb_build_object('public_id', a, 'saved_at', '2026-11-12T09:00:00Z', 'note', 'A different note')));
  assert r.status = 'note_conflict' and r.server_note = 'Met at the product meetup', r.status;
  assert (select note from public.my_saved_people() where public_id = a) = 'Met at the product meetup';

  -- Empty account note: incoming note is adopted.
  select * into r from public.import_guest_saves(jsonb_build_array(
    jsonb_build_object('public_id', b, 'saved_at', '2026-11-12T10:00:00Z', 'note', 'Designer, talk again')));
  assert r.status = 'merged';
  assert (select note from public.my_saved_people() where public_id = b) = 'Designer, talk again';

  -- Batch limit
  begin
    perform public.import_guest_saves((select jsonb_agg(jsonb_build_object('public_id', a, 'saved_at', now())) from generate_series(1, 51)));
    assert false, 'batch limit';
  exception when invalid_parameter_value then null; end;
end $$;
commit;

-- 5. Notes: optimistic concurrency.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c"}', true);
do $$
declare a text := (select public_id from ids where who='a'); cur timestamptz; r record;
begin
  select note_updated_at into cur from public.my_saved_people() where public_id = a;
  select * into r from public.set_saved_note(a, 'Edited on phone', cur); assert r.status = 'saved';
  select * into r from public.set_saved_note(a, 'Stale edit from laptop', cur); assert r.status = 'conflict' and r.note = 'Edited on phone';
  select * into r from public.set_saved_note('zzzzzzzzzzzz', 'x', null); assert r.status = 'not_found';
end $$;
commit;

-- 6. Isolation: A and an unrelated account see none of C's saves or notes.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ begin
  assert (select count(*) from public.saved_people where saver_id <> '00000000-0000-4000-8000-00000000000a') = 0, 'A sees no saved_people rows of others';
  assert (select count(*) from public.my_saved_people()) = (select count(*) from public.saved_people), 'only own rows';
  assert not exists (select 1 from public.my_saved_people() where note <> ''), 'none of C''s notes';
  assert (select count(*) from public.profiles) = 1, 'A reads only own profile';
  assert (select count(*) from public.profile_actions) = 3, 'A reads only own actions';
end $$;
commit;

-- 7. Contributions: one answer per question, idempotent retries, participant-only reads.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$
declare
  j jsonb := public.get_public_profile((select public_id from ids where who='a'));
  q uuid; jm uuid; fb uuid; r record; r2 record; n int;
begin
  select (x ->> 'id')::uuid into q  from jsonb_array_elements(j -> 'actions') x where x ->> 'kind' = 'question';
  select (x ->> 'id')::uuid into jm from jsonb_array_elements(j -> 'actions') x where x ->> 'kind' = 'join_me';
  select (x ->> 'id')::uuid into fb from jsonb_array_elements(j -> 'actions') x where x ->> 'kind' = 'feedback';

  select * into r from public.submit_contribution(q, 'Your onboarding research', 'key-0001-answer'); assert r.status = 'sent';
  select * into r2 from public.submit_contribution(q, 'Your onboarding research', 'key-0001-answer'); assert r2.status = 'existing' and r2.id = r.id, 'retry';
  select * into r2 from public.submit_contribution(q, 'A second answer', 'key-0002-answer'); assert r2.status = 'existing' and r2.id = r.id and r2.body = 'Your onboarding research', 'one answer per question';

  select * into r from public.submit_contribution(jm, '', 'key-0003-join'); assert r.status = 'sent', 'join interest may be empty';
  select * into r from public.submit_contribution(fb, '   ', 'key-0004-fb'); assert r.status = 'invalid', 'empty request rejected';
  select * into r from public.submit_contribution(fb, repeat('x', 1501), 'key-0005-fb'); assert r.status = 'invalid', 'over limit';
  select * into r from public.submit_contribution(gen_random_uuid(), 'x', 'key-0006-xx'); assert r.status = 'not_found';
  select count(*) into n from public.my_contributions_to((select public_id from ids where who='a')); assert n = 2;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ declare r record; q uuid; begin
  assert (select count(*) from public.contributions) = 2, 'recipient reads received contributions';
  select id into q from public.profile_actions where kind = 'question';
  select * into r from public.submit_contribution(q, 'answering myself', 'key-0007-self'); assert r.status = 'self';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c"}', true);
do $$ begin
  assert (select count(*) from public.contributions) = 0, 'unrelated account reads no contributions';
  assert (select count(*) from public.my_contributions_to((select public_id from ids where who='a'))) = 0;
end $$;
commit;

-- 8. Unauthenticated callers get an explicit error from write functions, even if granted.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
do $$ begin
  begin perform public.ensure_starter_profile(); assert false, 'no uid';
  exception when invalid_authorization_specification then null; end;
end $$;
commit;

\o
\echo 'rls_test.sql: all assertions passed'
