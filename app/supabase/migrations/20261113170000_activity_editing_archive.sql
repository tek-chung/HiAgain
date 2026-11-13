-- Hi Again — sender editing, Activity (Sent/Received) with private read state, and People Archive.

-- ---------------------------------------------------------------------------
-- Contribution versions: each saved edit increments version; recipients see it as unread again.
-- ---------------------------------------------------------------------------
alter table public.contributions add column version int not null default 1 check (version >= 1);

-- Per-user read receipts, per contribution version. Private to the reader.
create table public.activity_reads (
  user_id         uuid not null references public.profiles (user_id) on delete cascade,
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  version_read    int not null check (version_read >= 1),
  read_at         timestamptz not null default now(),
  primary key (user_id, contribution_id)
);
alter table public.activity_reads enable row level security;
revoke all on public.activity_reads from anon, authenticated;
grant select on public.activity_reads to authenticated;
create policy "Readers see their own receipts"
  on public.activity_reads for select to authenticated
  using (user_id = (select auth.uid()));

-- Sender edits written content in place. Participants, item context and sent time never change.
-- Join me interest has no editable text. Optimistic concurrency via the expected version.
create or replace function public.edit_contribution(p_id uuid, p_body text, p_expected_version int)
returns table (status text, id uuid, body text, version int, edited_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_uid();
  c public.contributions%rowtype;
  clean text := btrim(coalesce(p_body, ''));
begin
  select * into c from public.contributions x where x.id = p_id and x.sender_id = uid for update;
  if not found then
    return query select 'not_found'::text, null::uuid, null::text, null::int, null::timestamptz; return;
  end if;
  if c.kind = 'join_me' then
    return query select 'not_editable'::text, c.id, c.body, c.version, c.edited_at; return;
  end if;
  if clean = '' or char_length(clean) > 1500 then
    return query select 'invalid'::text, c.id, c.body, c.version, c.edited_at; return;
  end if;
  if c.version <> p_expected_version then
    return query select 'conflict'::text, c.id, c.body, c.version, c.edited_at; return;
  end if;
  if clean = c.body then
    return query select 'unchanged'::text, c.id, c.body, c.version, c.edited_at; return;
  end if;
  update public.contributions x set body = clean, version = x.version + 1, edited_at = now()
   where x.id = c.id
  returning 'saved'::text, x.id, x.body, x.version, x.edited_at into status, id, body, version, edited_at;
  return next;
end;
$$;

-- Activity for the signed-in person: what they received and what they sent.
-- Only participants' public fields are returned; never internal IDs. Own submissions are never unread.
create or replace function public.my_activity()
returns table (id uuid, direction text, kind public.action_kind, prompt_snapshot text, body text,
               sent_at timestamptz, edited_at timestamptz, version int, unread boolean,
               other_public_id text, other_display_name text, other_avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         case when c.recipient_id = auth.uid() then 'received' else 'sent' end,
         c.kind, c.prompt_snapshot, c.body, c.sent_at, c.edited_at, c.version,
         c.recipient_id = auth.uid() and coalesce(r.version_read, 0) < c.version,
         p.public_id, p.display_name, p.avatar_url
    from public.contributions c
    join public.profiles p on p.user_id = case when c.recipient_id = auth.uid() then c.sender_id else c.recipient_id end
    left join public.activity_reads r on r.user_id = auth.uid() and r.contribution_id = c.id
   where c.recipient_id = auth.uid() or c.sender_id = auth.uid()
   order by greatest(c.sent_at, coalesce(c.edited_at, c.sent_at)) desc;
$$;

create or replace function public.unread_activity_count()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
    from public.contributions c
    left join public.activity_reads r on r.user_id = auth.uid() and r.contribution_id = c.id
   where c.recipient_id = auth.uid() and coalesce(r.version_read, 0) < c.version;
$$;

-- Marks the given {id, version} pairs read: exactly what the person saw, so later arrivals
-- or later edits stay unread. Only received contributions can be marked.
create or replace function public.mark_activity_read(p_items jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_uid();
  n int;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 500 then
    raise exception 'Expected an array of at most 500 items' using errcode = '22023';
  end if;
  insert into public.activity_reads as ar (user_id, contribution_id, version_read)
  select uid, c.id, least((i ->> 'version')::int, c.version)
    from jsonb_array_elements(p_items) i
    join public.contributions c on c.id = (i ->> 'id')::uuid and c.recipient_id = uid
   where (i ->> 'version') ~ '^[0-9]{1,9}$'
  on conflict (user_id, contribution_id) do update
    set version_read = greatest(ar.version_read, excluded.version_read), read_at = now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Archive: private, reversible organisation of People. Timestamps, notes, context and
-- contributions are untouched; it is not blocking and does not withdraw anything.
-- ---------------------------------------------------------------------------
create or replace function public.set_archived(p_public_id text, p_archived boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid();
begin
  update public.saved_people s
     set archived_at = case when p_archived then coalesce(s.archived_at, now()) else null end
    from public.profiles p
   where s.saver_id = uid and p.user_id = s.subject_id and p.public_id = p_public_id;
  return case when found then 'saved' else 'not_found' end;
end;
$$;

create or replace function public.my_archived_people()
returns table (public_id text, display_name text, headline text, avatar_url text, linkedin_url text,
               saved_at timestamptz, archived_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.public_id, p.display_name, p.headline, p.avatar_url, p.linkedin_url, s.saved_at, s.archived_at
    from public.saved_people s join public.profiles p on p.user_id = s.subject_id
   where s.saver_id = auth.uid() and s.archived_at is not null
   order by s.archived_at desc;
$$;

-- One saved person (archived or not), for person detail.
create or replace function public.my_saved_person(p_public_id text)
returns table (saved_at timestamptz, note text, note_updated_at timestamptz, archived_at timestamptz,
               context_label text, context_source text, context_event_start timestamptz, context_dismissed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.saved_at, s.note, s.note_updated_at, s.archived_at,
         s.context_label, s.context_source, s.context_event_start, s.context_dismissed
    from public.saved_people s join public.profiles p on p.user_id = s.subject_id
   where s.saver_id = auth.uid() and p.public_id = p_public_id;
$$;

-- Guest imports now carry archive state: a person archived on this browser arrives archived.
-- (Existing account rows keep their own archive state.)
create or replace function public.import_guest_saves(p_items jsonb)
returns table (public_id text, status text, saved_at timestamptz, server_note text, server_note_updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := public.require_uid();
  item jsonb;
  pid  text;
  subject uuid;
  ts   timestamptz;
  arch timestamptz;
  incoming_note text;
  existing public.saved_people%rowtype;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Expected an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'At most 50 items per call' using errcode = '22023';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    pid := item ->> 'public_id';
    begin
      ts := (item ->> 'saved_at')::timestamptz;
      arch := (item ->> 'archived_at')::timestamptz;
    exception when others then
      ts := null;
    end;
    incoming_note := nullif(btrim(coalesce(item ->> 'note', '')), '');

    if pid is null or pid !~ '^[A-Za-z0-9_-]{12}$' or ts is null
       or ts < timestamptz '2026-01-01' or ts > now() + interval '5 minutes'
       or (incoming_note is not null and char_length(incoming_note) > 2000) then
      return query select pid, 'invalid'::text, null::timestamptz, null::text, null::timestamptz;
      continue;
    end if;
    ts := least(ts, now());
    if arch is not null then arch := least(greatest(arch, ts), now()); end if;

    select p.user_id into subject from public.profiles p where p.public_id = pid;
    if subject is null then
      return query select pid, 'not_found'::text, null::timestamptz, null::text, null::timestamptz;
      continue;
    end if;
    if subject = uid then
      return query select pid, 'self'::text, null::timestamptz, null::text, null::timestamptz;
      continue;
    end if;

    insert into public.saved_people (saver_id, subject_id, saved_at, note, note_updated_at, source, archived_at)
    values (uid, subject, ts, coalesce(incoming_note, ''),
            case when incoming_note is null then null else now() end, 'guest_import', arch)
    on conflict on constraint saved_people_pkey do nothing;

    if found then
      return query select pid, 'imported'::text, ts, null::text, null::timestamptz;
      continue;
    end if;

    select * into existing from public.saved_people s
     where s.saver_id = uid and s.subject_id = subject for update;

    if ts < existing.saved_at then
      update public.saved_people s set saved_at = ts where s.saver_id = uid and s.subject_id = subject;
      existing.saved_at := ts;
    end if;

    if incoming_note is null or incoming_note = existing.note then
      return query select pid, 'merged'::text, existing.saved_at, null::text, null::timestamptz;
    elsif existing.note = '' then
      update public.saved_people s set note = incoming_note, note_updated_at = now()
       where s.saver_id = uid and s.subject_id = subject;
      return query select pid, 'merged'::text, existing.saved_at, null::text, null::timestamptz;
    else
      return query select pid, 'note_conflict'::text, existing.saved_at, existing.note, existing.note_updated_at;
    end if;
  end loop;
end;
$$;

-- submit_contribution and my_contributions_to now also expose version (for editing).
drop function public.submit_contribution(uuid, text, text);
-- Sends one contribution. Retries with the same idempotency key return the original row;
-- a second answer to the same question returns the existing answer instead of creating one.
create function public.submit_contribution(p_action_id uuid, p_body text, p_idempotency_key text)
returns table (status text, id uuid, action_id uuid, kind public.action_kind, prompt_snapshot text,
               body text, sent_at timestamptz, edited_at timestamptz, version int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_uid();
  act public.profile_actions%rowtype;
  new_id uuid;
  clean text := btrim(coalesce(p_body, ''));
begin
  if not exists (select 1 from public.profiles where user_id = uid) then
    raise exception 'Profile missing' using errcode = 'P0002';
  end if;
  select * into act from public.profile_actions a where a.id = p_action_id and a.active;
  if not found then
    return query select 'not_found'::text, null::uuid, null::uuid, null::public.action_kind, null::text, null::text, null::timestamptz, null::timestamptz, null::int;
    return;
  end if;
  if act.owner_id = uid then
    return query select 'self'::text, null::uuid, null::uuid, null::public.action_kind, null::text, null::text, null::timestamptz, null::timestamptz, null::int;
    return;
  end if;
  if char_length(clean) > 1500 or (act.kind <> 'join_me' and clean = '') then
    return query select 'invalid'::text, null::uuid, null::uuid, null::public.action_kind, null::text, null::text, null::timestamptz, null::timestamptz, null::int;
    return;
  end if;

  insert into public.contributions (sender_id, recipient_id, action_id, kind, prompt_snapshot, body, idempotency_key)
  values (uid, act.owner_id, act.id, act.kind, act.prompt, clean, p_idempotency_key)
  on conflict do nothing
  returning contributions.id into new_id;

  if new_id is not null then
    return query select 'sent'::text, c.id, c.action_id, c.kind, c.prompt_snapshot, c.body, c.sent_at, c.edited_at, c.version
                   from public.contributions c where c.id = new_id;
  else
    -- Same retry, or an existing answer to this question.
    return query select 'existing'::text, c.id, c.action_id, c.kind, c.prompt_snapshot, c.body, c.sent_at, c.edited_at, c.version
                   from public.contributions c
                  where c.sender_id = uid
                    and (c.idempotency_key = p_idempotency_key
                         or (c.kind = 'question' and c.action_id = act.id))
                  order by (c.idempotency_key = p_idempotency_key) desc
                  limit 1;
  end if;
end;
$$;


drop function public.my_contributions_to(text);
create function public.my_contributions_to(p_public_id text)
returns table (id uuid, action_id uuid, kind public.action_kind, prompt_snapshot text, body text,
               sent_at timestamptz, edited_at timestamptz, version int)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.action_id, c.kind, c.prompt_snapshot, c.body, c.sent_at, c.edited_at, c.version
    from public.contributions c
    join public.profiles p on p.user_id = c.recipient_id
   where c.sender_id = auth.uid() and p.public_id = p_public_id
   order by c.sent_at;
$$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_public_profile(text)                                    to anon, authenticated;
grant execute on function public.ensure_starter_profile()                                    to authenticated;
grant execute on function public.update_my_profile(text, text, text)                         to authenticated;
grant execute on function public.save_profile(text)                                          to authenticated;
grant execute on function public.import_guest_saves(jsonb)                                   to authenticated;
grant execute on function public.set_saved_note(text, text, timestamptz)                     to authenticated;
grant execute on function public.my_saved_people()                                           to authenticated;
grant execute on function public.my_saved_person(text)                                       to authenticated;
grant execute on function public.my_archived_people()                                        to authenticated;
grant execute on function public.set_archived(text, boolean)                                 to authenticated;
grant execute on function public.submit_contribution(uuid, text, text)                       to authenticated;
grant execute on function public.edit_contribution(uuid, text, int)                          to authenticated;
grant execute on function public.my_contributions_to(text)                                   to authenticated;
grant execute on function public.my_activity()                                               to authenticated;
grant execute on function public.unread_activity_count()                                     to authenticated;
grant execute on function public.mark_activity_read(jsonb)                                   to authenticated;
grant execute on function public.save_calendar_connection(text, text[], text, text, text[])  to authenticated;
grant execute on function public.calendar_secret()                                           to authenticated;
grant execute on function public.mark_calendar_needs_reconnect()                             to authenticated;
grant execute on function public.set_calendar_selection(text[])                              to authenticated;
grant execute on function public.disconnect_calendar()                                       to authenticated;
grant execute on function public.set_saved_context(text, text, text, timestamptz, boolean)   to authenticated;
grant execute on function public.update_my_action(public.action_kind, text)                  to authenticated;
grant execute on function public.dismiss_calendar_idea(text)                                 to authenticated;
grant execute on function public.undismiss_calendar_idea(text)                               to authenticated;
