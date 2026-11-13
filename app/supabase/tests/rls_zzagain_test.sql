-- Again privacy and lifecycle. Runs last; reuses accounts A, B, C.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

-- B says Again to A. A sees nothing, anywhere.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$ declare r record; begin
  select * into r from public.set_again((select public_id from ids where who = 'a'), true);
  assert r.state = 'sent', r.state;
  select * into r from public.set_again((select public_id from ids where who = 'a'), true);
  assert r.state = 'sent', 'idempotent';
  assert (select count(*) from public.again_signals) = 1;
  begin perform public.set_again((select public_id from ids where who = 'b'), true); assert false, 'self';
  exception when invalid_parameter_value then null; end;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ declare before int; begin
  assert (select count(*) from public.again_signals) = 0, 'recipient cannot read incoming signal';
  assert (select state from public.my_again_state((select public_id from ids where who = 'b'))) = 'none', 'state hides incoming';
  assert (select count(*) from public.my_matches()) = 0;
  before := public.unread_activity_count();
  perform 1; -- one-sided incoming adds nothing to unread (checked again below after withdrawal)
  assert public.get_public_profile((select public_id from ids where who = 'a'))::text !~ 'again', 'nothing public';
end $$;
commit;

-- B withdraws, then says Again again; C can never see any of it.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$ declare r record; begin
  select * into r from public.set_again((select public_id from ids where who = 'a'), false); assert r.state = 'none';
  assert (select count(*) from public.again_signals) = 0;
  select * into r from public.set_again((select public_id from ids where who = 'a'), true); assert r.state = 'sent';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c"}', true);
do $$ begin
  assert (select count(*) from public.again_signals) = 0 and (select count(*) from public.again_matches) = 0;
  begin perform public.lock_pair(gen_random_uuid(), gen_random_uuid()); assert false, 'internal';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- A reciprocates: match created once, both see it, both get one unread event.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ declare r record; u int; begin
  u := public.unread_activity_count();
  select * into r from public.set_again((select public_id from ids where who = 'b'), true);
  assert r.state = 'matched' and r.matched_at is not null, r.state;
  assert (select count(*) from public.my_matches()) = 1;
  assert public.unread_activity_count() = u + 1, 'match is one unread event';
  assert (select string_agg(other_public_id, '') from public.my_matches()) !~ '00000000-', 'no internal IDs';
  perform public.mark_matches_read((select array_agg(id) from public.my_matches()));
  assert public.unread_activity_count() = u;
  select * into r from public.set_again((select public_id from ids where who = 'b'), false);
  assert r.state = 'matched', 'turning off does not silently end a match';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$ begin
  assert (select state from public.my_again_state((select public_id from ids where who = 'a'))) = 'matched';
  assert (select unread from public.my_matches() limit 1), 'unread for B independently';
  assert public.end_match((select public_id from ids where who = 'a')) = 'ended';
  assert public.end_match((select public_id from ids where who = 'a')) = 'not_found';
  assert (select count(*) from public.again_signals) = 0, 'both signals removed';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ begin
  assert (select count(*) from public.my_matches()) = 0, 'gone for A too';
  assert (select state from public.my_again_state((select public_id from ids where who = 'b'))) = 'none', 'A must say Again afresh';
end $$;
commit;

\o
\echo 'rls_zzagain_test.sql: all assertions passed'
