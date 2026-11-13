-- Editing, Activity read state and Archive. Runs after the other tests (reuses accounts A, B, C).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

-- B edits their answer to A; A sees it as unread again; C sees nothing.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$
declare c uuid; j uuid; r record; sent timestamptz;
begin
  select id, sent_at into c, sent from public.contributions where kind = 'question' and body = 'Your onboarding research';
  select id into j from public.contributions where kind = 'join_me';
  select * into r from public.edit_contribution(c, 'Your onboarding research, especially interviews', 1);
  assert r.status = 'saved' and r.version = 2, r.status;
  select * into r from public.edit_contribution(c, 'Stale edit', 1);
  assert r.status = 'conflict' and r.body = 'Your onboarding research, especially interviews', 'stale version rejected';
  select * into r from public.edit_contribution(c, '   ', 2); assert r.status = 'invalid';
  select * into r from public.edit_contribution(j, 'text', 1); assert r.status = 'not_editable', 'join interest has no editable text';
  assert (select sent_at from public.contributions where id = c) = sent, 'sent time unchanged';
  assert (select count(*) from public.my_activity() where direction = 'sent') >= 2;
  assert (select count(*) from public.my_activity() where unread) = 0, 'own submissions never unread';
  assert public.unread_activity_count() = 0;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c"}', true);
do $$ declare r record; begin
  select * into r from public.edit_contribution((select id from public.my_activity() limit 1), 'x', 1);
  assert r is null or r.status = 'not_found', 'C cannot edit others';
  assert (select count(*) from public.my_activity()) = 0, 'C sees no activity';
  -- marking someone else's contribution read does nothing
  assert public.mark_activity_read((select jsonb_agg(jsonb_build_object('id', id, 'version', 9)) from (select gen_random_uuid() id) x)) = 0;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$
declare items jsonb; n int; edited uuid;
begin
  n := public.unread_activity_count();
  assert n = 3, 'A has 3 unread received: ' || n;
  assert (select count(*) from public.my_activity() where direction = 'received' and other_public_id is not null) = 3;
  assert (select string_agg(other_public_id, '') from public.my_activity()) !~ '00000000-', 'no internal IDs';
  -- mark all as read with the versions A saw
  select jsonb_agg(jsonb_build_object('id', id, 'version', version)) into items from public.my_activity() where unread;
  perform public.mark_activity_read(items);
  assert public.unread_activity_count() = 0;
  -- a version A has not seen yet can't be marked read by claiming a higher version than exists
  select id into edited from public.my_activity() where kind = 'question' and body like 'Your onboarding%';
  perform public.mark_activity_read(jsonb_build_array(jsonb_build_object('id', edited, 'version', 99)));
  assert (select version_read from public.activity_reads where contribution_id = edited) = 2, 'clamped to actual version';
end $$;
commit;

-- B edits again after A's bulk read: it becomes unread for A once more.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$ declare r record; begin
  select * into r from public.edit_contribution((select id from public.contributions where kind = 'question' and body like 'Your onboarding%'), 'Your onboarding research — and hiring', 2);
  assert r.status = 'saved';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ begin
  assert public.unread_activity_count() = 1, 'later edit is unread again';
end $$;
commit;

-- Archive: private, reversible, metadata untouched.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c"}', true);
do $$
declare a text := (select public_id from ids where who = 'a'); before record; r record;
begin
  select * into before from public.my_saved_person(a);
  assert public.set_archived(a, true) = 'saved';
  assert (select count(*) from public.my_saved_people() where public_id = a) = 0, 'hidden from People';
  assert (select count(*) from public.my_archived_people() where public_id = a) = 1;
  select * into r from public.save_profile(a);
  assert r.status = 'already_saved' and (select archived_at from public.my_saved_person(a)) is not null, 'repeat scan keeps archived';
  assert public.set_archived(a, false) = 'saved';
  select * into r from public.my_saved_person(a);
  assert r.saved_at = before.saved_at and r.note = before.note and r.archived_at is null, 'restored intact';
  assert public.set_archived('zzzzzzzzzzzz', true) = 'not_found';
end $$;
commit;

\o
\echo 'rls_zactivity_test.sql: all assertions passed'
