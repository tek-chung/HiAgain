-- Hi Again — Google Calendar connection (separate from sign-in), private encounter context,
-- owner-editable action prompts and calendar-idea dismissals.

-- ---------------------------------------------------------------------------
-- Calendar connection. One per account. The refresh token is stored encrypted with a key that
-- exists only on the app server (CALENDAR_TOKEN_KEY); the database never sees it in clear.
-- ---------------------------------------------------------------------------
create table public.calendar_connections (
  user_id               uuid primary key references public.profiles (user_id) on delete cascade,
  provider              text not null default 'google' check (provider = 'google'),
  status                text not null check (status in ('connected', 'partial', 'needs_reconnect')),
  granted_scopes        text[] not null default '{}',
  refresh_token_enc     text,
  account_label         text check (account_label is null or char_length(account_label) <= 200),
  selected_calendar_ids text[] not null default '{}',
  connected_at          timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.calendar_connections enable row level security;
revoke all on public.calendar_connections from anon, authenticated;
-- The ciphertext column is deliberately not granted; the server reads it through calendar_secret().
grant select (user_id, provider, status, granted_scopes, account_label, selected_calendar_ids, connected_at, updated_at)
  on public.calendar_connections to authenticated;
create policy "Owners read their own calendar connection"
  on public.calendar_connections for select to authenticated
  using (user_id = (select auth.uid()));

-- Dismissed Join me ideas (per account, private). Keyed by provider event ID.
create table public.calendar_idea_dismissals (
  user_id      uuid not null references public.profiles (user_id) on delete cascade,
  event_key    text not null check (char_length(event_key) between 1 and 300),
  dismissed_at timestamptz not null default now(),
  primary key (user_id, event_key)
);
alter table public.calendar_idea_dismissals enable row level security;
revoke all on public.calendar_idea_dismissals from anon, authenticated;
grant select on public.calendar_idea_dismissals to authenticated;
create policy "Owners read their own dismissals"
  on public.calendar_idea_dismissals for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Private encounter context on a saved person, kept separate from manual notes.
-- calendar_auto  = inferred from one matching event (removed if the calendar is disconnected)
-- calendar_chosen = the person picked it from several matches
-- manual         = typed or corrected by the person
-- ---------------------------------------------------------------------------
alter table public.saved_people
  add column context_label       text check (context_label is null or char_length(context_label) between 1 and 200),
  add column context_source      text check (context_source in ('calendar_auto', 'calendar_chosen', 'manual')),
  add column context_event_start timestamptz,
  add column context_updated_at  timestamptz,
  add column context_dismissed   boolean not null default false,
  add constraint saved_people_context_consistent check ((context_label is null) = (context_source is null));

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

create or replace function public.save_calendar_connection(
  p_status text, p_scopes text[], p_refresh_token_enc text, p_account_label text, p_selected text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid();
begin
  if p_status not in ('connected', 'partial', 'needs_reconnect') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;
  insert into public.calendar_connections as c
    (user_id, status, granted_scopes, refresh_token_enc, account_label, selected_calendar_ids, connected_at, updated_at)
  values (uid, p_status, coalesce(p_scopes, '{}'), p_refresh_token_enc, left(p_account_label, 200),
          coalesce(p_selected, '{}'), now(), now())
  on conflict (user_id) do update set
    status                = excluded.status,
    granted_scopes        = excluded.granted_scopes,
    -- A reconnect without a new refresh token keeps the old one.
    refresh_token_enc     = coalesce(excluded.refresh_token_enc, c.refresh_token_enc),
    account_label         = coalesce(excluded.account_label, c.account_label),
    -- Keep the person's calendar choice on reconnect if those calendars are still offered.
    selected_calendar_ids = case when cardinality(c.selected_calendar_ids) > 0 then c.selected_calendar_ids
                                 else excluded.selected_calendar_ids end,
    updated_at            = now();
end;
$$;

create or replace function public.calendar_secret()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select refresh_token_enc from public.calendar_connections where user_id = auth.uid();
$$;

create or replace function public.mark_calendar_needs_reconnect()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.calendar_connections set status = 'needs_reconnect', updated_at = now()
   where user_id = auth.uid();
$$;

create or replace function public.set_calendar_selection(p_calendar_ids text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid();
begin
  if cardinality(coalesce(p_calendar_ids, '{}')) > 50 then
    raise exception 'Too many calendars' using errcode = '22023';
  end if;
  update public.calendar_connections set selected_calendar_ids = coalesce(p_calendar_ids, '{}'), updated_at = now()
   where user_id = uid;
end;
$$;

-- Disconnect: forget the token and selection, and remove context that was only inferred.
-- Context the person chose or typed stays (it is theirs, like a note).
create or replace function public.disconnect_calendar()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid();
begin
  delete from public.calendar_connections where user_id = uid;
  delete from public.calendar_idea_dismissals where user_id = uid;
  update public.saved_people
     set context_label = null, context_source = null, context_event_start = null, context_updated_at = now()
   where saver_id = uid and context_source = 'calendar_auto';
end;
$$;

-- Sets or clears the encounter context for one saved person.
-- p_only_if_empty: used for automatic inference so it never replaces something the person set or removed.
create or replace function public.set_saved_context(
  p_public_id text, p_label text, p_source text, p_event_start timestamptz, p_only_if_empty boolean default false)
returns table (status text, context_label text, context_source text, context_event_start timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_uid();
  subject uuid;
  row public.saved_people%rowtype;
  clean text := nullif(btrim(coalesce(p_label, '')), '');
begin
  if clean is not null and p_source not in ('calendar_auto', 'calendar_chosen', 'manual') then
    raise exception 'Invalid source' using errcode = '22023';
  end if;
  if clean is not null and char_length(clean) > 200 then
    raise exception 'Context too long' using errcode = '22001';
  end if;
  select p.user_id into subject from public.profiles p where p.public_id = p_public_id;
  select * into row from public.saved_people s where s.saver_id = uid and s.subject_id = subject for update;
  if not found then
    return query select 'not_found'::text, null::text, null::text, null::timestamptz; return;
  end if;
  if p_only_if_empty and (row.context_label is not null or row.context_dismissed) then
    return query select 'unchanged'::text, row.context_label, row.context_source, row.context_event_start; return;
  end if;
  update public.saved_people s
     set context_label       = clean,
         context_source      = case when clean is null then null else p_source end,
         context_event_start = case when clean is null then null else p_event_start end,
         context_updated_at  = now(),
         -- Removing context explicitly stops it being inferred again.
         context_dismissed   = (clean is null)
   where s.saver_id = uid and s.subject_id = subject;
  return query select 'saved'::text, clean, case when clean is null then null else p_source end,
                      case when clean is null then null else p_event_start end;
end;
$$;

-- Owner edits one of their action prompts. A changed prompt creates a new item (new stable ID),
-- so earlier answers keep their original context and the new item has no inherited badges.
create or replace function public.update_my_action(p_kind public.action_kind, p_prompt text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_uid();
  clean text := btrim(coalesce(p_prompt, ''));
  cur public.profile_actions%rowtype;
  new_id uuid;
begin
  if char_length(clean) > 180 then
    raise exception 'Prompt too long' using errcode = '22001';
  end if;
  select * into cur from public.profile_actions a where a.owner_id = uid and a.kind = p_kind and a.active for update;
  if found and cur.prompt = clean then
    return cur.id; -- unchanged
  end if;
  if found then
    update public.profile_actions set active = false, updated_at = now() where id = cur.id;
  end if;
  if clean = '' then
    return null; -- empty removes the action from the public profile
  end if;
  insert into public.profile_actions (owner_id, kind, prompt) values (uid, p_kind, clean) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.dismiss_calendar_idea(p_event_key text)
returns void language sql security definer set search_path = '' as $$
  insert into public.calendar_idea_dismissals (user_id, event_key)
  select public.require_uid(), p_event_key
  on conflict do nothing;
$$;

create or replace function public.undismiss_calendar_idea(p_event_key text)
returns void language sql security definer set search_path = '' as $$
  delete from public.calendar_idea_dismissals where user_id = public.require_uid() and event_key = p_event_key;
$$;

-- my_saved_people now also returns the private context (return type changes, so recreate).
drop function public.my_saved_people();
create function public.my_saved_people()
returns table (public_id text, display_name text, headline text, avatar_url text, linkedin_url text,
               saved_at timestamptz, note text, note_updated_at timestamptz,
               context_label text, context_source text, context_event_start timestamptz, context_dismissed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.public_id, p.display_name, p.headline, p.avatar_url, p.linkedin_url,
         s.saved_at, s.note, s.note_updated_at,
         s.context_label, s.context_source, s.context_event_start, s.context_dismissed
    from public.saved_people s
    join public.profiles p on p.user_id = s.subject_id
   where s.saver_id = auth.uid() and s.archived_at is null
   order by s.saved_at desc;
$$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_public_profile(text)                                    to anon, authenticated;
grant execute on function public.ensure_starter_profile()                                    to authenticated;
grant execute on function public.update_my_profile(text, text, text)                         to authenticated;
grant execute on function public.save_profile(text)                                          to authenticated;
grant execute on function public.import_guest_saves(jsonb)                                   to authenticated;
grant execute on function public.set_saved_note(text, text, timestamptz)                     to authenticated;
grant execute on function public.my_saved_people()                                           to authenticated;
grant execute on function public.submit_contribution(uuid, text, text)                       to authenticated;
grant execute on function public.my_contributions_to(text)                                   to authenticated;
grant execute on function public.save_calendar_connection(text, text[], text, text, text[])  to authenticated;
grant execute on function public.calendar_secret()                                           to authenticated;
grant execute on function public.mark_calendar_needs_reconnect()                             to authenticated;
grant execute on function public.set_calendar_selection(text[])                              to authenticated;
grant execute on function public.disconnect_calendar()                                       to authenticated;
grant execute on function public.set_saved_context(text, text, text, timestamptz, boolean)   to authenticated;
grant execute on function public.update_my_action(public.action_kind, text)                  to authenticated;
grant execute on function public.dismiss_calendar_idea(text)                                 to authenticated;
grant execute on function public.undismiss_calendar_idea(text)                               to authenticated;
