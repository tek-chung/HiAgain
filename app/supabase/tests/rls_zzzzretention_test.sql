-- Guest-visit retention (12 months after the most recent visit).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null
-- Make one of A's guest visits 13 months old and another 11 months old (test setup as superuser).
insert into public.guest_encounters (owner_id, token_hash, alias, first_at, last_at)
select user_id, repeat('c', 64), 'Old Visitor', now() - interval '14 months', now() - interval '13 months'
  from public.profiles where public_id = (select public_id from ids where who = 'a');
insert into public.guest_encounters (owner_id, token_hash, alias, first_at, last_at)
select user_id, repeat('d', 64), 'Recent Visitor', now() - interval '14 months', now() - interval '11 months'
  from public.profiles where public_id = (select public_id from ids where who = 'a');

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ begin
  assert not exists (select 1 from public.my_guest_encounters() where alias = 'Old Visitor'), 'expired visit hidden';
  assert exists (select 1 from public.my_guest_encounters() where alias = 'Recent Visitor'), '11-month-old visit kept';
  begin perform public.purge_expired_guest_encounters(); assert false, 'purge is internal';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- A new guest visit purges that owner's expired rows.
begin;
set local role anon;
do $$ begin perform public.record_guest_scan((select public_id from ids where who = 'a'), repeat('e', 64)); end $$;
commit;
do $$ begin
  assert not exists (select 1 from public.guest_encounters where alias = 'Old Visitor'), 'purged on next visit';
  assert exists (select 1 from public.guest_encounters where alias = 'Recent Visitor');
  assert public.purge_expired_guest_encounters() = 0;
end $$;
\o
\echo 'rls_zzzzretention_test.sql: all assertions passed'
