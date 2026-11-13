-- Incoming scans, blocking, reporting and deletion. Runs last; reuses accounts A, B, C.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

-- 1. A signed-in scan adds the scanner to the owner's People as an incoming scan.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c"}', true);
do $$ begin perform public.save_profile((select public_id from ids where who = 'a')); end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ begin
  assert (select source from public.my_saved_people() where public_id = (select public_id from ids where who = 'c')) = 'incoming_scan',
    'A sees C as an incoming scan';
end $$;
commit;

-- 2. Guest scans: anonymous, deduplicated, capped, owner-only.
begin;
set local role anon;
do $$ declare h text := repeat('ab', 32); begin
  perform public.record_guest_scan((select public_id from ids where who = 'a'), h);
  perform public.record_guest_scan((select public_id from ids where who = 'a'), h);
  perform public.record_guest_scan((select public_id from ids where who = 'a'), 'not-a-hash');
  perform public.record_guest_scan('nonexistent1', h);
  begin perform 1 from public.guest_encounters; assert false, 'anon cannot read';
  exception when insufficient_privilege then null; end;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ declare g record; r record; begin
  assert (select count(*) from public.my_guest_encounters()) = 1, 'deduplicated';
  select * into g from public.my_guest_encounters();
  assert g.alias ~ '^[A-Z][a-z]+ [A-Z][a-z]+$', 'alias: ' || g.alias;
  begin perform token_hash from public.guest_encounters; assert false, 'token hash not readable';
  exception when insufficient_privilege then null; end;
  select * into r from public.set_guest_note(g.id, 'Asked about the pilot', null); assert r.status = 'saved';
  select * into r from public.set_guest_note(g.id, 'stale', null); assert r.status = 'conflict';
  assert public.set_guest_archived(g.id, true) = 'saved';
  assert (select archived_at from public.my_guest_encounters()) is not null;
  assert public.set_guest_archived(g.id, false) = 'saved';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$ begin
  assert (select count(*) from public.my_guest_encounters()) = 0, 'other owners see none';
  assert public.set_guest_archived((select id from public.guest_encounters limit 1), true) = 'not_found';
end $$;
commit;

-- Flood cap: at most 100 new guest encounters per owner per day.
begin;
set local role anon;
do $$ declare i int; begin
  for i in 1..150 loop
    perform public.record_guest_scan((select public_id from ids where who = 'b'), encode(sha256(i::text::bytea), 'hex'));
  end loop;
end $$;
commit;
do $$ begin
  assert (select count(*) from public.guest_encounters g join public.profiles p on p.user_id = g.owner_id
          where p.public_id = (select public_id from ids where who = 'b')) = 100, 'capped at 100';
end $$;

-- 3. Blocking: A and B make a match, then A blocks B.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$ begin perform public.set_again((select public_id from ids where who = 'a'), true); end $$;
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ declare r record; begin
  select * into r from public.set_again((select public_id from ids where who = 'b'), true); assert r.state = 'matched';
  assert (select count(*) from public.my_activity() where other_public_id = (select public_id from ids where who = 'b')) > 0;
  assert public.block_user((select public_id from ids where who = 'b')) = 'blocked';
  assert public.block_user((select public_id from ids where who = 'a')) = 'not_found', 'cannot block self';
  assert (select count(*) from public.my_matches()) = 0, 'match ended';
  assert (select count(*) from public.my_activity() where other_public_id = (select public_id from ids where who = 'b')) = 0, 'contributions hidden';
  assert (select count(*) from public.my_saved_people() where public_id = (select public_id from ids where who = 'b')) = 0, 'hidden from People';
  assert (select count(*) from public.my_blocked()) = 1;
  assert public.get_public_profile((select public_id from ids where who = 'b')) is null, 'blocker sees B as unavailable';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$ declare r record; q uuid; n int; begin
  assert public.get_public_profile((select public_id from ids where who = 'a')) is null, 'blocked sees A as unavailable';
  select * into r from public.save_profile((select public_id from ids where who = 'a')); assert r.status = 'not_found';
  select id into q from public.contributions where kind = 'feedback' limit 1;
  select a.id into q from public.profile_actions a join public.profiles p on p.user_id = a.owner_id
   where p.public_id = (select public_id from ids where who = 'a') and a.active limit 1;
  select * into r from public.submit_contribution(q, 'hello', 'key-block-0001'); assert r.status = 'not_found', 'cannot contribute';
  begin perform public.set_again((select public_id from ids where who = 'a'), true); assert false, 'cannot Again';
  exception when no_data_found then null; end;
  assert (select state from public.my_again_state((select public_id from ids where who = 'a'))) = 'none';
  assert (select count(*) from public.my_activity() where other_public_id = (select public_id from ids where who = 'a')) = 0;
  assert (select count(*) from public.blocks) = 0, 'B cannot see that A blocked them';
  assert (select count(*) from public.import_guest_saves(jsonb_build_array(jsonb_build_object(
    'public_id', (select public_id from ids where who = 'a'), 'saved_at', now()))) where status = 'not_found') = 1;
  assert public.report_user((select public_id from ids where who = 'a'), 'Test report') = 'reported';
  assert public.report_user((select public_id from ids where who = 'a'), '   ') = 'invalid';
  begin perform 1 from public.reports; assert false, 'reports not readable';
  exception when insufficient_privilege then null; end;
end $$;
commit;
set role anon;
do $$ begin
  assert public.get_public_profile((select public_id from ids where who = 'a')) is not null, 'anonymous visitors unaffected';
end $$;
reset role;

-- Unblock restores saves and history (signals/match stay ended).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ begin
  assert public.unblock_user((select public_id from ids where who = 'b')) = 'unblocked';
  assert (select count(*) from public.my_activity() where other_public_id = (select public_id from ids where who = 'b')) > 0;
  assert (select count(*) from public.my_matches()) = 0;
end $$;
commit;

-- 4. Account deletion removes everything, including contributions sent to others.
insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-4000-8000-0000000000ee', '{"name":"Leaving User"}');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000ee"}', true);
do $$ declare q uuid; r record; begin
  perform public.ensure_starter_profile();
  perform public.save_profile((select public_id from ids where who = 'a'));
  select (x ->> 'id')::uuid into q from jsonb_array_elements(public.get_public_profile((select public_id from ids where who = 'a')) -> 'actions') x
   where x ->> 'kind' = 'join_me';
  select * into r from public.submit_contribution(q, 'Feedback on my deck?', 'key-del-00001'); assert r.status = 'sent', r.status;
  perform public.set_again((select public_id from ids where who = 'a'), true);
  perform public.report_user((select public_id from ids where who = 'a'), 'Leaving report');
  assert public.delete_my_account() = 'deleted';
end $$;
commit;
do $$ begin
  assert not exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000ee');
  assert not exists (select 1 from public.profiles where user_id = '00000000-0000-4000-8000-0000000000ee');
  assert not exists (select 1 from public.contributions where body = 'Feedback on my deck?'), 'sent contributions deleted';
  assert not exists (select 1 from public.again_signals where sender_id = '00000000-0000-4000-8000-0000000000ee');
  assert not exists (select 1 from public.saved_people where saver_id = '00000000-0000-4000-8000-0000000000ee' or subject_id = '00000000-0000-4000-8000-0000000000ee');
  assert (select reporter_id from public.reports where reason = 'Leaving report') is null, 'report kept without identity';
end $$;

\o
\echo 'rls_zzzscans_test.sql: all assertions passed'
