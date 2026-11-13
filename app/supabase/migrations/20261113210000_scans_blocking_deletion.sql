-- Hi Again — incoming scans (with notice), blocking, reporting and account deletion.
-- Decisions (Tek, 13 November 2026): scanners see a short notice; signed-in scanners appear in the
-- owner's People by name and guests as a per-owner anonymous nickname. Blocking is full, silent
-- separation. Account deletion is immediate and permanent, including contributions sent to others.
-- A match reveals no contact details beyond existing public links.

-- ---------------------------------------------------------------------------
-- Blocks and reports
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (user_id) on delete cascade,
  blocked_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
revoke all on public.blocks from anon, authenticated;
grant select on public.blocks to authenticated;
create policy "Blockers see who they blocked"
  on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

-- Reports are write-only from the app; they are reviewed in the Supabase dashboard.
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (user_id) on delete set null,
  reported_id uuid references public.profiles (user_id) on delete set null,
  reason      text not null check (char_length(reason) between 1 and 2000),
  created_at  timestamptz not null default now()
);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

-- True when either person has blocked the other. Internal helper.
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.blocks
                  where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

-- ---------------------------------------------------------------------------
-- Incoming scans
-- ---------------------------------------------------------------------------
-- Registered scanners are added to the owner's People (source = 'incoming_scan').
alter table public.saved_people drop constraint saved_people_source_check;
alter table public.saved_people add constraint saved_people_source_check
  check (source in ('scan', 'guest_import', 'incoming_scan'));

-- Guests: one row per owner and per-owner browser token hash, shown under an anonymous nickname.
-- The browser hashes (token + owner) itself, so the same guest can't be linked across owners.
create table public.guest_encounters (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (user_id) on delete cascade,
  token_hash      text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  alias           text not null,
  first_at        timestamptz not null default now(),
  last_at         timestamptz not null default now(),
  note            text not null default '' check (char_length(note) <= 2000),
  note_updated_at timestamptz,
  archived_at     timestamptz,
  unique (owner_id, token_hash)
);
create index guest_encounters_recent on public.guest_encounters (owner_id, first_at);
alter table public.guest_encounters enable row level security;
revoke all on public.guest_encounters from anon, authenticated;
grant select (id, owner_id, alias, first_at, last_at, note, note_updated_at, archived_at)
  on public.guest_encounters to authenticated;
create policy "Owners read their guest encounters"
  on public.guest_encounters for select to authenticated
  using (owner_id = (select auth.uid()));

create or replace function public.guest_alias(h text)
returns text
language sql
immutable
set search_path = ''
as $$
  select (array['Curious','Friendly','Bright','Calm','Cheerful','Clever','Gentle','Keen',
                'Lively','Thoughtful','Bold','Kind','Quick','Sunny','Swift','Witty'])[get_byte(decode(h, 'hex'), 0) % 16 + 1]
      || ' ' ||
         (array['Otter','Fox','Heron','Badger','Robin','Hare','Owl','Wren',
                'Seal','Finch','Lynx','Puffin','Stoat','Swan','Vole','Kestrel'])[get_byte(decode(h, 'hex'), 1) % 16 + 1];
$$;

-- Records a guest visit for the profile owner. Returns nothing either way, so it can't be used
-- to probe. Capped at 100 new guest encounters per owner per day to limit flooding.
create or replace function public.record_guest_scan(p_public_id text, p_token_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare owner uuid;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return; end if;
  select user_id into owner from public.profiles where public_id = p_public_id;
  if owner is null then return; end if;
  update public.guest_encounters set last_at = now() where owner_id = owner and token_hash = p_token_hash;
  if found then return; end if;
  if (select count(*) from public.guest_encounters where owner_id = owner and first_at > now() - interval '1 day') >= 100 then
    return;
  end if;
  insert into public.guest_encounters (owner_id, token_hash, alias)
  values (owner, p_token_hash, public.guest_alias(p_token_hash))
  on conflict (owner_id, token_hash) do update set last_at = now();
end;
$$;

create or replace function public.my_guest_encounters()
returns table (id uuid, alias text, first_at timestamptz, note text, note_updated_at timestamptz, archived_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.id, g.alias, g.first_at, g.note, g.note_updated_at, g.archived_at
    from public.guest_encounters g where g.owner_id = auth.uid() order by g.first_at desc;
$$;

create or replace function public.set_guest_archived(p_id uuid, p_archived boolean)
returns text
language plpgsql security definer set search_path = '' as $$
begin
  update public.guest_encounters
     set archived_at = case when p_archived then coalesce(archived_at, now()) else null end
   where id = p_id and owner_id = public.require_uid();
  return case when found then 'saved' else 'not_found' end;
end;
$$;

create or replace function public.set_guest_note(p_id uuid, p_note text, p_expected_updated_at timestamptz)
returns table (status text, note text, note_updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare row public.guest_encounters%rowtype;
begin
  if char_length(coalesce(p_note, '')) > 2000 then raise exception 'Note too long' using errcode = '22001'; end if;
  select * into row from public.guest_encounters g where g.id = p_id and g.owner_id = public.require_uid() for update;
  if not found then return query select 'not_found'::text, null::text, null::timestamptz; return; end if;
  if row.note_updated_at is distinct from p_expected_updated_at then
    return query select 'conflict'::text, row.note, row.note_updated_at; return;
  end if;
  update public.guest_encounters g set note = coalesce(p_note, ''), note_updated_at = now() where g.id = row.id
  returning 'saved'::text, g.note, g.note_updated_at into status, note, note_updated_at;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Blocking, reporting and deletion
-- ---------------------------------------------------------------------------
-- Silent, full separation: ends any match and removes both Again signals. Saves, notes and
-- contributions are hidden (not deleted) while the block exists, so unblocking restores them.
create or replace function public.block_user(p_public_id text)
returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.require_uid(); other uuid;
begin
  select user_id into other from public.profiles where public_id = p_public_id;
  if other is null or other = uid then return 'not_found'; end if;
  perform public.lock_pair(uid, other);
  insert into public.blocks (blocker_id, blocked_id) values (uid, other) on conflict do nothing;
  delete from public.again_matches where user_a = least(uid, other) and user_b = greatest(uid, other);
  delete from public.again_signals where (sender_id = uid and recipient_id = other) or (sender_id = other and recipient_id = uid);
  return 'blocked';
end;
$$;

create or replace function public.unblock_user(p_public_id text)
returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.require_uid();
begin
  delete from public.blocks b using public.profiles p
   where b.blocker_id = uid and b.blocked_id = p.user_id and p.public_id = p_public_id;
  return case when found then 'unblocked' else 'not_found' end;
end;
$$;

create or replace function public.my_blocked()
returns table (public_id text, display_name text, avatar_url text, blocked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.public_id, p.display_name, p.avatar_url, b.created_at
    from public.blocks b join public.profiles p on p.user_id = b.blocked_id
   where b.blocker_id = auth.uid() order by b.created_at desc;
$$;

create or replace function public.report_user(p_public_id text, p_reason text)
returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.require_uid(); other uuid; clean text := btrim(coalesce(p_reason, ''));
begin
  select user_id into other from public.profiles where public_id = p_public_id;
  if other is null or other = uid then return 'not_found'; end if;
  if clean = '' or char_length(clean) > 2000 then return 'invalid'; end if;
  if (select count(*) from public.reports where reporter_id = uid and created_at > now() - interval '1 day') >= 20 then
    return 'limited';
  end if;
  insert into public.reports (reporter_id, reported_id, reason) values (uid, other, clean);
  return 'reported';
end;
$$;

-- Permanently deletes the caller's account. Every table cascades from auth.users → profiles,
-- including contributions they sent, Again signals and matches, notes and the calendar link.
-- (The app revokes the Google token first.) Reports they filed or received keep the text only.
create or replace function public.delete_my_account()
returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.require_uid();
begin
  delete from auth.users where id = uid;
  return 'deleted';
end;
$$;

-- save_profile: block rule + incoming scan for the owner.
-- Signed-in scan: saves the person with the server's time. Repeat scans keep the original.
create or replace function public.save_profile(p_public_id text)
returns table (status text, saved_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_uid();
  subject uuid;
  saved boolean;
begin
  select p.user_id into subject from public.profiles p where p.public_id = p_public_id;
  if subject is null then return query select 'not_found'::text, null::timestamptz; return; end if;
  if subject = uid then return query select 'self'::text, null::timestamptz; return; end if;
  if public.is_blocked(uid, subject) then return query select 'not_found'::text, null::timestamptz; return; end if;

  insert into public.saved_people (saver_id, subject_id, saved_at, source)
  values (uid, subject, now(), 'scan')
  on conflict on constraint saved_people_pkey do nothing;
  saved := found;

  -- The owner sees a signed-in scanner in their People (scanners are told on the profile).
  insert into public.saved_people (saver_id, subject_id, saved_at, source)
  values (subject, uid, now(), 'incoming_scan')
  on conflict on constraint saved_people_pkey do nothing;

  return query
    select case when saved then 'saved' else 'already_saved' end, s.saved_at
    from public.saved_people s where s.saver_id = uid and s.subject_id = subject;
end;
$$;

-- import_guest_saves: blocked people are skipped silently.
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
    if public.is_blocked(uid, subject) then
      return query select pid, 'not_found'::text, null::timestamptz, null::text, null::timestamptz;
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

-- submit_contribution: blocked pairs see the item as unavailable.
-- Sends one contribution. Retries with the same idempotency key return the original row;
-- a second answer to the same question returns the existing answer instead of creating one.
create or replace function public.submit_contribution(p_action_id uuid, p_body text, p_idempotency_key text)
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
  if public.is_blocked(uid, act.owner_id) then
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

create or replace function public.my_contributions_to(p_public_id text)
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
     and not public.is_blocked(auth.uid(), c.recipient_id)
   order by c.sent_at;
$$;

drop function public.my_saved_people();
create function public.my_saved_people()
returns table (public_id text, display_name text, headline text, avatar_url text, linkedin_url text,
               saved_at timestamptz, note text, note_updated_at timestamptz,
               context_label text, context_source text, context_event_start timestamptz, context_dismissed boolean,
               source text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.public_id, p.display_name, p.headline, p.avatar_url, p.linkedin_url,
         s.saved_at, s.note, s.note_updated_at,
         s.context_label, s.context_source, s.context_event_start, s.context_dismissed, s.source
    from public.saved_people s
    join public.profiles p on p.user_id = s.subject_id
   where s.saver_id = auth.uid() and s.archived_at is null
     and not public.is_blocked(auth.uid(), s.subject_id)
   order by s.saved_at desc;
$$;

drop function public.my_saved_person(text);
-- One saved person (archived or not), for person detail.
create function public.my_saved_person(p_public_id text)
returns table (saved_at timestamptz, note text, note_updated_at timestamptz, archived_at timestamptz,
               context_label text, context_source text, context_event_start timestamptz, context_dismissed boolean,
               source text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.saved_at, s.note, s.note_updated_at, s.archived_at,
         s.context_label, s.context_source, s.context_event_start, s.context_dismissed, s.source
    from public.saved_people s join public.profiles p on p.user_id = s.subject_id
   where s.saver_id = auth.uid() and p.public_id = p_public_id
     and not public.is_blocked(auth.uid(), s.subject_id);
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
     and not public.is_blocked(auth.uid(), s.subject_id)
   order by s.archived_at desc;
$$;

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
   where (c.recipient_id = auth.uid() or c.sender_id = auth.uid())
     and not public.is_blocked(c.sender_id, c.recipient_id)
   order by greatest(c.sent_at, coalesce(c.edited_at, c.sent_at)) desc;
$$;

create or replace function public.unread_activity_count()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select (select count(*)::int
            from public.contributions c
            left join public.activity_reads r on r.user_id = auth.uid() and r.contribution_id = c.id
           where c.recipient_id = auth.uid() and coalesce(r.version_read, 0) < c.version
             and not public.is_blocked(c.sender_id, c.recipient_id))
       + (select count(*)::int
            from public.again_matches m
            left join public.match_reads r on r.user_id = auth.uid() and r.match_id = m.id
           where auth.uid() in (m.user_a, m.user_b) and r.match_id is null);
$$;

create or replace function public.my_again_state(p_public_id text)
returns table (state text, matched_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid(); other uuid; m timestamptz;
begin
  select p.user_id into other from public.profiles p where p.public_id = p_public_id;
  if other is null or other = uid or public.is_blocked(uid, other) then
    return query select 'none'::text, null::timestamptz; return;
  end if;
  select created_at into m from public.again_matches where user_a = least(uid, other) and user_b = greatest(uid, other);
  if m is not null then return query select 'matched'::text, m; return; end if;
  if exists (select 1 from public.again_signals where sender_id = uid and recipient_id = other) then
    return query select 'sent'::text, null::timestamptz; return;
  end if;
  return query select 'none'::text, null::timestamptz;
end;
$$;

create or replace function public.set_again(p_public_id text, p_on boolean)
returns table (state text, matched_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid(); other uuid; m timestamptz;
begin
  select p.user_id into other from public.profiles p where p.public_id = p_public_id;
  if other is null or public.is_blocked(uid, other) then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  if other = uid then raise exception 'Cannot say Again to yourself' using errcode = '22023'; end if;
  perform public.lock_pair(uid, other);

  select created_at into m from public.again_matches where user_a = least(uid, other) and user_b = greatest(uid, other);
  if m is not null then return query select 'matched'::text, m; return; end if;

  if not p_on then
    delete from public.again_signals where sender_id = uid and recipient_id = other;
    return query select 'none'::text, null::timestamptz; return;
  end if;

  insert into public.again_signals (sender_id, recipient_id) values (uid, other) on conflict do nothing;
  if exists (select 1 from public.again_signals where sender_id = other and recipient_id = uid) then
    insert into public.again_matches (user_a, user_b) values (least(uid, other), greatest(uid, other))
    on conflict (user_a, user_b) do nothing;
    select created_at into m from public.again_matches where user_a = least(uid, other) and user_b = greatest(uid, other);
    return query select 'matched'::text, m; return;
  end if;
  return query select 'sent'::text, null::timestamptz;
end;
$$;

-- The public profile. This function defines the public-field allowlist (provisional, see README).
create or replace function public.get_public_profile(p_public_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'publicId',    p.public_id,
    'displayName', p.display_name,
    'headline',    p.headline,
    'avatarUrl',   p.avatar_url,
    'linkedinUrl', p.linkedin_url,
    'actions', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind, 'prompt', a.prompt)
                       order by array_position(array['join_me','question','feedback']::public.action_kind[], a.kind))
      from public.profile_actions a
      where a.owner_id = p.user_id and a.active), '[]'::jsonb))
  from public.profiles p
  where p.public_id = p_public_id
    -- A signed-in visitor in a blocked pair sees the profile as unavailable.
    and (auth.uid() is null or not public.is_blocked(auth.uid(), p.user_id));
$$;


revoke execute on function public.is_blocked(uuid, uuid), public.guest_alias(text) from public, anon, authenticated;
revoke execute on function public.record_guest_scan(text, text), public.my_guest_encounters(), public.set_guest_archived(uuid, boolean),
  public.set_guest_note(uuid, text, timestamptz), public.block_user(text), public.unblock_user(text), public.my_blocked(),
  public.report_user(text, text), public.delete_my_account(), public.save_profile(text), public.import_guest_saves(jsonb),
  public.submit_contribution(uuid, text, text), public.my_contributions_to(text), public.my_saved_people(),
  public.my_saved_person(text), public.my_archived_people(), public.my_activity(), public.unread_activity_count(),
  public.my_again_state(text), public.set_again(text, boolean), public.get_public_profile(text) from public, anon;
grant execute on function public.get_public_profile(text)                to anon, authenticated;
grant execute on function public.record_guest_scan(text, text)           to anon;
grant execute on function public.my_guest_encounters()                   to authenticated;
grant execute on function public.set_guest_archived(uuid, boolean)       to authenticated;
grant execute on function public.set_guest_note(uuid, text, timestamptz) to authenticated;
grant execute on function public.block_user(text)                        to authenticated;
grant execute on function public.unblock_user(text)                      to authenticated;
grant execute on function public.my_blocked()                            to authenticated;
grant execute on function public.report_user(text, text)                 to authenticated;
grant execute on function public.delete_my_account()                     to authenticated;
grant execute on function public.save_profile(text)                      to authenticated;
grant execute on function public.import_guest_saves(jsonb)               to authenticated;
grant execute on function public.submit_contribution(uuid, text, text)   to authenticated;
grant execute on function public.my_contributions_to(text)               to authenticated;
grant execute on function public.my_saved_people()                       to authenticated;
grant execute on function public.my_saved_person(text)                   to authenticated;
grant execute on function public.my_archived_people()                    to authenticated;
grant execute on function public.my_activity()                           to authenticated;
grant execute on function public.unread_activity_count()                 to authenticated;
grant execute on function public.my_again_state(text)                    to authenticated;
grant execute on function public.set_again(text, boolean)                to authenticated;
