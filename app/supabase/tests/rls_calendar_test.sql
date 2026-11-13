-- Calendar connection, private context and prompt-editing tests. Runs after rls_test.sql (reuses its accounts).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

-- 1. Connection: owner can store and read status, but never the token column; others see nothing.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c"}', true);
do $$ begin
  perform public.save_calendar_connection('connected',
    array['https://www.googleapis.com/auth/calendar.events.readonly'], 'v1.ciphertext', 'Work', array['primary']);
  assert (select status from public.calendar_connections) = 'connected';
  assert public.calendar_secret() = 'v1.ciphertext';
  begin
    perform refresh_token_enc from public.calendar_connections;
    assert false, 'token column must not be selectable';
  exception when insufficient_privilege then null; end;
  -- reconnect without a new token keeps the old one and the selection
  perform public.set_calendar_selection(array['primary', 'team@example.test']);
  perform public.save_calendar_connection('connected', array['x'], null, null, array['primary']);
  assert public.calendar_secret() = 'v1.ciphertext', 'token kept on reconnect';
  assert (select selected_calendar_ids from public.calendar_connections) = array['primary', 'team@example.test'], 'selection kept';
  perform public.mark_calendar_needs_reconnect();
  assert (select status from public.calendar_connections) = 'needs_reconnect';
  begin
    perform public.save_calendar_connection('hacked', null, null, null, null);
    assert false, 'invalid status';
  exception when invalid_parameter_value then null; end;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ begin
  assert (select count(*) from public.calendar_connections) = 0, 'other accounts see no connection';
  assert public.calendar_secret() is null, 'other accounts get no secret';
end $$;
commit;

begin;
set local role anon;
do $$ begin
  begin perform public.calendar_secret(); assert false, 'anon secret';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- 2. Context: automatic inference never overwrites; removal sticks; disconnect removes only inferred context.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c"}', true);
do $$
declare
  a text := (select public_id from ids where who = 'a');
  b text := (select public_id from ids where who = 'b');
  r record;
begin
  select * into r from public.set_saved_context(a, 'Product Meetup London', 'calendar_auto', '2026-11-12T18:00:00Z', true);
  assert r.status = 'saved';
  select * into r from public.set_saved_context(a, 'Another event', 'calendar_auto', null, true);
  assert r.status = 'unchanged' and r.context_label = 'Product Meetup London', 'auto never replaces';
  select * into r from public.set_saved_context(b, 'Design systems talk', 'calendar_chosen', null, false);
  assert r.status = 'saved';
  -- remove b's context: it must not be inferred again
  perform public.set_saved_context(b, null, null, null, false);
  select * into r from public.set_saved_context(b, 'Inferred again', 'calendar_auto', null, true);
  assert r.status = 'unchanged' and r.context_label is null, 'removal sticks';
  -- manual correction always allowed
  select * into r from public.set_saved_context(b, 'Coffee queue at the venue', 'manual', null, false);
  assert r.status = 'saved' and r.context_source = 'manual';
  select * into r from public.set_saved_context('zzzzzzzzzzzz', 'x', 'manual', null, false);
  assert r.status = 'not_found';
  assert (select count(*) from public.my_saved_people() where context_label is not null) = 2;

  perform public.disconnect_calendar();
  assert (select count(*) from public.calendar_connections) = 0;
  assert (select context_label from public.my_saved_people() where public_id = a) is null, 'inferred context removed';
  assert (select context_label from public.my_saved_people() where public_id = b) = 'Coffee queue at the venue', 'manual context kept';
end $$;
commit;

-- Context is private: the subject and unrelated accounts can't read it, and it is never public.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$ begin
  assert (select count(*) from public.saved_people where context_label is not null) = 0, 'subject cannot read saver context';
  assert public.get_public_profile((select public_id from ids where who = 'b'))::text !~ 'Coffee queue', 'never in public profile';
end $$;
commit;

-- 3. Prompt editing: new wording = new item; earlier answers keep their context; no inherited badge.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$
declare old_q uuid; new_q uuid; same uuid; j jsonb;
begin
  select id into old_q from public.profile_actions where kind = 'question' and active;
  new_q := public.update_my_action('question', 'What should I read next?');
  assert new_q <> old_q, 'changed prompt gets a new ID';
  same := public.update_my_action('question', 'What should I read next?');
  assert same = new_q, 'unchanged prompt keeps its ID';
  assert (select count(*) from public.profile_actions where kind = 'question' and active) = 1;
  assert (select prompt_snapshot from public.contributions where action_id = old_q limit 1) = 'What would you like to know about my work?',
    'earlier answer keeps original wording';
  perform public.update_my_action('feedback', '   ');
  j := public.get_public_profile((select public_id from ids where who = 'a'));
  assert jsonb_array_length(j -> 'actions') = 2, 'empty prompt removes the action publicly';
  begin
    perform public.update_my_action('join_me', repeat('x', 181));
    assert false, 'prompt limit';
  exception when string_data_right_truncation then null; end;
  perform public.dismiss_calendar_idea('evt-1');
  perform public.dismiss_calendar_idea('evt-1');
  assert (select count(*) from public.calendar_idea_dismissals) = 1;
  perform public.undismiss_calendar_idea('evt-1');
  assert (select count(*) from public.calendar_idea_dismissals) = 0;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$ declare r record; q uuid; begin
  -- B already answered A's old question; the new question is independent.
  select (x ->> 'id')::uuid into q from jsonb_array_elements(public.get_public_profile((select public_id from ids where who = 'a')) -> 'actions') x
   where x ->> 'kind' = 'question';
  select * into r from public.submit_contribution(q, 'Thinking in Systems', 'key-0101-newq');
  assert r.status = 'sent', 'new question can be answered';
  assert (select count(*) from public.my_contributions_to((select public_id from ids where who = 'a')) where action_id = q) = 1;
end $$;
commit;

\o
\echo 'rls_calendar_test.sql: all assertions passed'
