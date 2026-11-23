-- Growth loop: events, Again review, "Did you meet?", digest and funnel counts.
-- Uses its own accounts (O organiser; P, Q, R, S, T attendees) so earlier tests don't interfere.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

insert into auth.users (id, raw_user_meta_data, email) values
  ('00000000-0000-4000-8000-0000000000e0', '{"name":"Olive Organiser"}', 'olive@example.test'),
  ('00000000-0000-4000-8000-0000000000e1', '{"name":"Pat Park"}',        'pat@example.test'),
  ('00000000-0000-4000-8000-0000000000e2', '{"name":"Quinn Quail"}',     'quinn@example.test'),
  ('00000000-0000-4000-8000-0000000000e3', '{"name":"Rae Reed"}',        'rae@example.test'),
  ('00000000-0000-4000-8000-0000000000e4', '{"name":"Sol Shah"}',        'sol@example.test'),
  ('00000000-0000-4000-8000-0000000000e5', '{"name":"Tam Tan"}',         'tam@example.test');

create function pg_temp.as_user(u text) returns void language sql as $$
  select set_config('request.jwt.claims', format('{"sub":"00000000-0000-4000-8000-0000000000%s"}', u), true);
$$;

do $$ declare u text; begin
  foreach u in array array['e0','e1','e2','e3','e4','e5'] loop
    perform set_config('request.jwt.claims', format('{"sub":"00000000-0000-4000-8000-0000000000%s"}', u), true);
    set local role authenticated;
    perform public.ensure_starter_profile();
    reset role;
  end loop;
end $$;

create table g_ids as
  select substr(user_id::text, 35, 2) as who, public_id from public.profiles
   where user_id::text like '00000000-0000-4000-8000-0000000000e%';
grant select on g_ids to anon, authenticated;
create table g_event (code text);
grant select, insert on g_event to authenticated;

-- New app pages are reserved addresses.
do $$ begin
  assert public.is_reserved_handle('review') and public.is_reserved_handle('events') and public.is_reserved_handle('e');
end $$;

-- ---------------------------------------------------------------------------
-- Creating an event
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select pg_temp.as_user('e0');
do $$ declare r record; begin
  select * into r from public.create_event('  ', now(), now() + interval '2 hours');            assert r.status = 'invalid', 'blank name';
  select * into r from public.create_event('Meetup', now(), now() - interval '1 hour');         assert r.status = 'invalid', 'ends before start';
  select * into r from public.create_event('Meetup', now(), now() + interval '4 days');         assert r.status = 'invalid', 'too long';
  select * into r from public.create_event('Meetup', now() - interval '3 days', now());         assert r.status = 'invalid', 'too far in the past';
  select * into r from public.create_event('London Product Meetup', now() - interval '1 hour', now() + interval '3 hours');
  assert r.status = 'created' and r.code ~ '^[A-Za-z0-9_-]{12}$', 'created: ' || r.status;
  insert into g_event values (r.code);
  begin insert into public.events (organiser_id, name, starts_at, ends_at)
        values (auth.uid(), 'x', now(), now() + interval '1 hour'); assert false, 'direct insert';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- Anyone with the link sees the event; nobody sees who joined.
begin;
set local role anon;
do $$ declare j jsonb := public.get_public_event((select code from g_event)); begin
  assert j ->> 'name' = 'London Product Meetup' and j ->> 'organiserName' = 'Olive Organiser';
  assert (j ->> 'attendeeCount')::int = 1 and (j ->> 'isOn')::boolean and not (j ->> 'isOrganiser')::boolean and not (j ->> 'joined')::boolean;
  assert j::text !~ '00000000-0000-4000', 'no internal ids';
  assert public.get_public_event('nonexistent1') is null;
  begin perform public.join_event((select code from g_event)); assert false, 'anon join';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.event_attendees; assert false, 'anon reads attendees';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- P saves Q before either joins: nothing to tag yet. Then P and Q join: the save is tagged both ways.
begin;
set local role authenticated;
select pg_temp.as_user('e1');
do $$ declare r record; begin
  select * into r from public.save_profile((select public_id from g_ids where who = 'e2')); assert r.status = 'saved';
  assert (select context_label from public.my_saved_people() where public_id = (select public_id from g_ids where who = 'e2')) is null;
  assert public.join_event((select code from g_event)) = 'joined';
  assert public.join_event((select code from g_event)) = 'already';
  assert (select (public.get_public_event((select code from g_event)) ->> 'joined')::boolean);
end $$;
commit;

begin;
set local role authenticated;
select pg_temp.as_user('e2');
do $$ declare r record; begin
  assert public.join_event((select code from g_event)) = 'joined';
  select * into r from public.my_saved_people() where public_id = (select public_id from g_ids where who = 'e1');
  assert r.context_label = 'London Product Meetup' and r.context_source = 'event' and r.source = 'incoming_scan', 'Q tagged';
  assert (select count(*) from public.event_attendees) = 1, 'attendees see only their own attendance';
  assert (select count(*) from public.events) = 1;
end $$;
commit;

begin;
set local role authenticated;
select pg_temp.as_user('e1');
do $$ begin
  assert (select context_label from public.my_saved_people() where public_id = (select public_id from g_ids where who = 'e2')) = 'London Product Meetup', 'P tagged on join';
end $$;
commit;

-- R joins first, then saves P: tagged straight away.
begin;
set local role authenticated;
select pg_temp.as_user('e3');
do $$ declare r record; begin
  assert public.join_event((select code from g_event)) = 'joined';
  select * into r from public.save_profile((select public_id from g_ids where who = 'e1')); assert r.status = 'saved';
  assert (select context_source from public.my_saved_people() where public_id = (select public_id from g_ids where who = 'e1')) = 'event';
end $$;
commit;

-- S saves T and types their own context; when both are at the event, S's context is kept.
begin;
set local role authenticated;
select pg_temp.as_user('e4');
do $$ declare r record; begin
  assert public.join_event((select code from g_event)) = 'joined';
  select * into r from public.save_profile((select public_id from g_ids where who = 'e5'));
  -- T isn't there yet, so nothing is tagged.
  assert (select context_label from public.my_saved_people() where public_id = (select public_id from g_ids where who = 'e5')) is null;
  select * into r from public.set_saved_context((select public_id from g_ids where who = 'e5'), 'Lunch queue', 'manual', null);
  assert r.status = 'saved';
end $$;
commit;

begin;
set local role authenticated;
select pg_temp.as_user('e5');
do $$ begin
  assert public.join_event((select code from g_event)) = 'joined';
  assert (select context_label from public.my_saved_people() where public_id = (select public_id from g_ids where who = 'e4')) = 'London Product Meetup';
end $$;
commit;

begin;
set local role authenticated;
select pg_temp.as_user('e4');
do $$ declare r record; begin
  assert (select context_label from public.my_saved_people() where public_id = (select public_id from g_ids where who = 'e5')) = 'Lunch queue', 'own context kept';
  -- Removing event context can be undone with source 'event'.
  select * into r from public.set_saved_context((select public_id from g_ids where who = 'e5'), 'London Product Meetup', 'event', now());
  assert r.status = 'saved' and r.context_source = 'event';
end $$;
commit;

-- ---------------------------------------------------------------------------
-- Again review and organiser counts
-- ---------------------------------------------------------------------------
-- P and Q match; R says Again to P one-sidedly.
begin;
set local role authenticated;
select pg_temp.as_user('e1');
select public.set_again((select public_id from g_ids where who = 'e2'), true);
select pg_temp.as_user('e2');
select public.set_again((select public_id from g_ids where who = 'e1'), true);
select pg_temp.as_user('e3');
select public.set_again((select public_id from g_ids where who = 'e1'), true);
commit;

begin;
set local role authenticated;
select pg_temp.as_user('e1');
do $$ declare r record; begin
  assert (select count(*) from public.my_recent_people(7)) = 2, 'P recently met Q and R';
  select * into r from public.my_recent_people(7) where public_id = (select public_id from g_ids where who = 'e2');
  assert r.again_state = 'matched' and r.matched_at is not null and r.context_label = 'London Product Meetup';
  select * into r from public.my_recent_people(7) where public_id = (select public_id from g_ids where who = 'e3');
  assert r.again_state = 'none', 'incoming one-sided Again stays hidden';
  assert (select count(*) from public.my_recent_people(-5)) = 2, 'days clamped';
  -- Only the organiser gets counts.
  assert (select count(*) from public.event_stats((select code from g_event))) = 0;
end $$;
commit;

begin;
set local role authenticated;
select pg_temp.as_user('e0');
do $$ declare r record; code2 text; begin
  select * into r from public.event_stats((select code from g_event));
  assert r.attendees = 6 and r.connections = 3 and r.mutual_agains = 1, format('stats %s %s %s', r.attendees, r.connections, r.mutual_agains);
  assert (select count(*) from public.my_events()) = 1 and (select is_organiser from public.my_events());
  assert public.leave_event((select code from g_event)) = 'organiser';
  -- A small event hides mutual Agains.
  select c.code into code2 from public.create_event('Tiny dinner', now(), now() + interval '2 hours') c;
  select * into r from public.event_stats(code2);
  assert r.attendees = 1 and r.mutual_agains is null, 'hidden under 5 attendees';
  -- An event that finished long ago can't be joined.
  select c.code into code2 from public.create_event('Yesterday', now() - interval '23 hours', now() - interval '22 hours') c;
  insert into g_event values (code2);
end $$;
commit;

begin;
set local role authenticated;
select pg_temp.as_user('e3');
do $$ begin
  assert public.join_event((select code from g_event where code <> (select code from g_event limit 1) limit 1)) = 'ended';
  assert public.leave_event((select code from g_event limit 1)) = 'left';
  assert public.join_event('nonexistent1') = 'not_found';
end $$;
commit;

-- ---------------------------------------------------------------------------
-- "Did you meet?"
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select pg_temp.as_user('e1');
do $$ begin
  assert public.set_match_outcome((select public_id from g_ids where who = 'e2'), 'met') = 'saved';
  assert public.set_match_outcome((select public_id from g_ids where who = 'e2'), 'party') = 'invalid';
  assert public.set_match_outcome((select public_id from g_ids where who = 'e3'), 'met') = 'not_found', 'no match with R';
  assert (select outcome from public.my_match_outcome((select public_id from g_ids where who = 'e2'))) = 'met';
end $$;
commit;

begin;
set local role authenticated;
select pg_temp.as_user('e2');
do $$ begin
  assert (select count(*) from public.match_outcomes) = 0, 'Q cannot read P''s answer';
  assert (select outcome from public.my_match_outcome((select public_id from g_ids where who = 'e1'))) is null;
  assert (select matched_at from public.my_match_outcome((select public_id from g_ids where who = 'e1'))) is not null;
end $$;
commit;

-- ---------------------------------------------------------------------------
-- Next-day digest
-- ---------------------------------------------------------------------------
-- Before a secret is set, and with a wrong or short key, the digest refuses.
begin;
set local role anon;
do $$ begin
  begin perform public.digest_due('x-0123456789abcdef0123456789abcdef'); assert false, 'no secret yet';
  exception when insufficient_privilege then null; end;
  begin perform public.set_app_secret('digest', 'x'); assert false, 'anon sets secret';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.app_secrets; assert false, 'anon reads secrets';
  exception when insufficient_privilege then null; end;
end $$;
commit;

begin;
set local role authenticated;
select pg_temp.as_user('e5');
do $$ begin
  begin perform public.set_app_secret('digest', 'x'); assert false, 'user sets secret';
  exception when insufficient_privilege then null; end;
  assert public.set_digest_email(false) = false;
  assert (select digest_email from public.notification_settings) = false;
end $$;
commit;

select public.set_app_secret('digest', 'test-digest-secret-0123456789abcdef');
-- Pretend P's and T's saves happened yesterday afternoon, London time.
update public.saved_people
   set saved_at = ((date_trunc('day', now() at time zone 'Europe/London') - interval '9 hours') at time zone 'Europe/London')
 where saver_id in ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e5');

begin;
set local role anon;
do $$ declare r record; begin
  begin perform public.digest_due('test-digest-secret-0123456789abcdeX'); assert false, 'wrong key';
  exception when insufficient_privilege then null; end;
  select * into r from public.digest_due('test-digest-secret-0123456789abcdef')
   where user_id = '00000000-0000-4000-8000-0000000000e1';
  assert r.email = 'pat@example.test' and r.first_name = 'Pat' and r.people_count = 2 and r.event_name = 'London Product Meetup',
    format('%s %s %s %s', r.email, r.first_name, r.people_count, r.event_name);
  assert not exists (select 1 from public.digest_due('test-digest-secret-0123456789abcdef') where user_id = '00000000-0000-4000-8000-0000000000e5'),
    'opted out';
  assert public.digest_mark_sent('test-digest-secret-0123456789abcdef', array['00000000-0000-4000-8000-0000000000e1']::uuid[]) = 1;
  assert not exists (select 1 from public.digest_due('test-digest-secret-0123456789abcdef') where user_id = '00000000-0000-4000-8000-0000000000e1'),
    'sent once a day';
end $$;
commit;

-- ---------------------------------------------------------------------------
-- Funnel counts
-- ---------------------------------------------------------------------------
begin;
set local role anon;
select public.log_funnel('review_opened');
select public.log_funnel('review_opened');
select public.log_funnel('not-a-step');
do $$ begin
  begin perform 1 from public.funnel_counts; assert false, 'anon reads counts';
  exception when insufficient_privilege then null; end;
  begin perform public.funnel_report(30); assert false, 'anon report';
  exception when insufficient_privilege then null; end;
end $$;
commit;

do $$ begin
  assert (select n from public.funnel_counts where kind = 'review_opened') = 2;
  assert not exists (select 1 from public.funnel_counts where kind = 'not-a-step');
  assert (select value from public.funnel_report(30) where step like '15%') >= 1;
  assert (select value from public.funnel_report(30) where step like '18%') >= 1;
end $$;

begin;
set local role authenticated;
select pg_temp.as_user('e1');
do $$ begin
  begin perform public.funnel_report(30); assert false, 'user report';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- ---------------------------------------------------------------------------
-- Blocking and deletion
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select pg_temp.as_user('e5');
select public.block_user((select public_id from g_ids where who = 'e0'));
do $$ begin
  assert public.get_public_event((select code from g_event limit 1)) is null, 'blocked organiser''s event unavailable';
end $$;
commit;

begin;
set local role authenticated;
select pg_temp.as_user('e0');
select public.delete_my_account();
commit;

do $$ begin
  assert (select count(*) from public.events where name in ('London Product Meetup', 'Tiny dinner', 'Yesterday')) = 0;
  assert (select count(*) from public.event_attendees a join public.profiles p on p.user_id = a.user_id
           where p.user_id::text like '00000000-0000-4000-8000-0000000000e%') = 0;
  assert (select count(*) from public.saved_people where event_id is not null
           and saver_id::text like '00000000-0000-4000-8000-0000000000e%') = 0, 'event links cleared';
  -- The context people saw stays theirs.
  assert (select context_label from public.saved_people where saver_id = '00000000-0000-4000-8000-0000000000e1'
           and subject_id = '00000000-0000-4000-8000-0000000000e2') = 'London Product Meetup';
end $$;

\o
\echo rls_zzzzzzzgrowth_test.sql: all assertions passed
