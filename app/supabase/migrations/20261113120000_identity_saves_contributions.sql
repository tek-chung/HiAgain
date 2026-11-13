-- Hi Again — first milestone schema.
-- Accounts come from Supabase Auth (LinkedIn OIDC). Everything private is protected by RLS;
-- all writes go through narrow SECURITY DEFINER functions that check auth.uid() explicitly.
-- Tables are never writable directly by the anon or authenticated roles.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- 12-character URL-safe opaque ID from 72 random bits (bytes 11–16 of a v4 UUID are fully random).
create or replace function public.new_public_id()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(
    encode(
      substring(uuid_send(gen_random_uuid()) from 11 for 6) ||
      substring(uuid_send(gen_random_uuid()) from 11 for 3),
      'base64'),
    '+/', '-_');
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  public_id    text not null unique default public.new_public_id()
               check (public_id ~ '^[A-Za-z0-9_-]{12}$'),
  display_name text not null default '' check (char_length(display_name) <= 80),
  headline     text check (headline is null or char_length(headline) <= 120),
  avatar_url   text check (avatar_url is null or avatar_url ~ '^https://'),
  linkedin_url text check (linkedin_url is null or linkedin_url ~ '^https://www\.linkedin\.com/in/[A-Za-z0-9_%-]{3,100}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.profiles is
  'One per account. Public fields are exposed only through get_public_profile(); the table itself is owner-readable only.';

create type public.action_kind as enum ('join_me', 'question', 'feedback');

create table public.profile_actions (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (user_id) on delete cascade,
  kind       public.action_kind not null,
  prompt     text not null check (char_length(prompt) between 1 and 180),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Proposed pilot default: one active item per action type per profile.
create unique index profile_actions_one_active_per_kind
  on public.profile_actions (owner_id, kind) where active;

create table public.saved_people (
  saver_id        uuid not null references public.profiles (user_id) on delete cascade,
  subject_id      uuid not null references public.profiles (user_id) on delete cascade,
  saved_at        timestamptz not null,           -- first save; never moved later
  note            text not null default '' check (char_length(note) <= 2000),
  note_updated_at timestamptz,
  archived_at     timestamptz,
  source          text not null check (source in ('scan', 'guest_import')),
  created_at      timestamptz not null default now(),
  primary key (saver_id, subject_id),
  check (saver_id <> subject_id)
);

create table public.contributions (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid not null references public.profiles (user_id) on delete cascade,
  recipient_id    uuid not null references public.profiles (user_id) on delete cascade,
  action_id       uuid not null references public.profile_actions (id) on delete cascade,
  kind            public.action_kind not null,
  prompt_snapshot text not null,                  -- original item context, preserved if the prompt is edited
  body            text not null default '' check (char_length(body) <= 1500),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 100),
  sent_at         timestamptz not null default now(),
  edited_at       timestamptz,
  check (sender_id <> recipient_id),
  check (kind = 'join_me' or char_length(btrim(body)) > 0),
  unique (sender_id, idempotency_key)
);
-- Confirmed rule: one answer per sender per stable question item.
create unique index contributions_one_answer_per_question
  on public.contributions (sender_id, action_id) where kind = 'question';
create index contributions_recipient on public.contributions (recipient_id, sent_at desc);

-- ---------------------------------------------------------------------------
-- Privileges and row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.profile_actions enable row level security;
alter table public.saved_people    enable row level security;
alter table public.contributions   enable row level security;

revoke all on public.profiles, public.profile_actions, public.saved_people, public.contributions
  from anon, authenticated;
grant select on public.profiles, public.profile_actions, public.saved_people, public.contributions
  to authenticated;

create policy "Owners read their own profile"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Owners read their own actions"
  on public.profile_actions for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Savers read their own saved people"
  on public.saved_people for select to authenticated
  using (saver_id = (select auth.uid()));

create policy "Participants read their contributions"
  on public.contributions for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Functions (the only write paths)
-- ---------------------------------------------------------------------------

create or replace function public.require_uid()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  return uid;
end;
$$;

-- Creates the starter profile and default actions on first sign-in. Idempotent and never
-- overwrites existing content. Identity data comes from the auth record, not the client.
create or replace function public.ensure_starter_profile()
returns table (public_id text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := public.require_uid();
  meta jsonb;
  nm   text;
  pic  text;
  was_created boolean := false;
begin
  select coalesce(u.raw_user_meta_data, '{}'::jsonb) into meta from auth.users u where u.id = uid;
  nm := btrim(coalesce(
          nullif(meta ->> 'name', ''),
          nullif(meta ->> 'full_name', ''),
          nullif(btrim(concat_ws(' ', meta ->> 'given_name', meta ->> 'family_name')), ''),
          ''));
  pic := coalesce(nullif(meta ->> 'picture', ''), nullif(meta ->> 'avatar_url', ''));
  if pic is not null and pic !~ '^https://' then pic := null; end if;

  insert into public.profiles (user_id, display_name, avatar_url)
  values (uid, left(nm, 80), pic)
  on conflict (user_id) do nothing;
  was_created := found;

  if was_created then
    insert into public.profile_actions (owner_id, kind, prompt) values
      (uid, 'join_me',  'Coffee and a catch-up?'),
      (uid, 'question', 'What would you like to know about my work?'),
      (uid, 'feedback', 'A fresh perspective on a project or idea?');
  end if;

  return query select p.public_id, was_created from public.profiles p where p.user_id = uid;
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
  where p.public_id = p_public_id;
$$;

create or replace function public.update_my_profile(p_display_name text, p_headline text, p_linkedin_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_uid();
begin
  update public.profiles
     set display_name = left(btrim(coalesce(p_display_name, '')), 80),
         headline     = nullif(btrim(coalesce(p_headline, '')), ''),
         linkedin_url = nullif(btrim(coalesce(p_linkedin_url, '')), ''),
         updated_at   = now()
   where user_id = uid;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

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
begin
  select p.user_id into subject from public.profiles p where p.public_id = p_public_id;
  if subject is null then return query select 'not_found'::text, null::timestamptz; return; end if;
  if subject = uid then return query select 'self'::text, null::timestamptz; return; end if;

  insert into public.saved_people (saver_id, subject_id, saved_at, source)
  values (uid, subject, now(), 'scan')
  on conflict on constraint saved_people_pkey do nothing;

  return query
    select case when found then 'saved' else 'already_saved' end, s.saved_at
    from public.saved_people s where s.saver_id = uid and s.subject_id = subject;
end;
$$;

-- Imports browser-local guest saves. Safe to retry: never duplicates, keeps the earliest
-- timestamp, and never silently overwrites a different existing note (returns note_conflict).
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

    select p.user_id into subject from public.profiles p where p.public_id = pid;
    if subject is null then
      return query select pid, 'not_found'::text, null::timestamptz, null::text, null::timestamptz;
      continue;
    end if;
    if subject = uid then
      return query select pid, 'self'::text, null::timestamptz, null::text, null::timestamptz;
      continue;
    end if;

    insert into public.saved_people (saver_id, subject_id, saved_at, note, note_updated_at, source)
    values (uid, subject, ts, coalesce(incoming_note, ''),
            case when incoming_note is null then null else now() end, 'guest_import')
    on conflict on constraint saved_people_pkey do nothing;

    if found then
      return query select pid, 'imported'::text, ts, null::text, null::timestamptz;
      continue;
    end if;

    -- Already saved in the account: merge under a row lock so concurrent retries serialise.
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

-- Saver's private note with optimistic concurrency: the caller states which version it edited.
create or replace function public.set_saved_note(p_public_id text, p_note text, p_expected_updated_at timestamptz)
returns table (status text, note text, note_updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_uid();
  row public.saved_people%rowtype;
begin
  if char_length(coalesce(p_note, '')) > 2000 then
    raise exception 'Note too long' using errcode = '22001';
  end if;
  select s.* into row from public.saved_people s
    join public.profiles p on p.user_id = s.subject_id
   where s.saver_id = uid and p.public_id = p_public_id
   for update of s;
  if not found then
    return query select 'not_found'::text, null::text, null::timestamptz; return;
  end if;
  if row.note_updated_at is distinct from p_expected_updated_at then
    return query select 'conflict'::text, row.note, row.note_updated_at; return;
  end if;
  update public.saved_people s
     set note = coalesce(p_note, ''), note_updated_at = now()
   where s.saver_id = row.saver_id and s.subject_id = row.subject_id
  returning 'saved'::text, s.note, s.note_updated_at into status, note, note_updated_at;
  return next;
end;
$$;

create or replace function public.my_saved_people()
returns table (public_id text, display_name text, headline text, avatar_url text, linkedin_url text,
               saved_at timestamptz, note text, note_updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.public_id, p.display_name, p.headline, p.avatar_url, p.linkedin_url,
         s.saved_at, s.note, s.note_updated_at
    from public.saved_people s
    join public.profiles p on p.user_id = s.subject_id
   where s.saver_id = auth.uid() and s.archived_at is null
   order by s.saved_at desc;
$$;

-- Sends one contribution. Retries with the same idempotency key return the original row;
-- a second answer to the same question returns the existing answer instead of creating one.
create or replace function public.submit_contribution(p_action_id uuid, p_body text, p_idempotency_key text)
returns table (status text, id uuid, action_id uuid, kind public.action_kind, prompt_snapshot text,
               body text, sent_at timestamptz, edited_at timestamptz)
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
    return query select 'not_found'::text, null::uuid, null::uuid, null::public.action_kind, null::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;
  if act.owner_id = uid then
    return query select 'self'::text, null::uuid, null::uuid, null::public.action_kind, null::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;
  if char_length(clean) > 1500 or (act.kind <> 'join_me' and clean = '') then
    return query select 'invalid'::text, null::uuid, null::uuid, null::public.action_kind, null::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  insert into public.contributions (sender_id, recipient_id, action_id, kind, prompt_snapshot, body, idempotency_key)
  values (uid, act.owner_id, act.id, act.kind, act.prompt, clean, p_idempotency_key)
  on conflict do nothing
  returning contributions.id into new_id;

  if new_id is not null then
    return query select 'sent'::text, c.id, c.action_id, c.kind, c.prompt_snapshot, c.body, c.sent_at, c.edited_at
                   from public.contributions c where c.id = new_id;
  else
    -- Same retry, or an existing answer to this question.
    return query select 'existing'::text, c.id, c.action_id, c.kind, c.prompt_snapshot, c.body, c.sent_at, c.edited_at
                   from public.contributions c
                  where c.sender_id = uid
                    and (c.idempotency_key = p_idempotency_key
                         or (c.kind = 'question' and c.action_id = act.id))
                  order by (c.idempotency_key = p_idempotency_key) desc
                  limit 1;
  end if;
end;
$$;

-- The signed-in visitor's own contributions to one profile (for completion badges).
create or replace function public.my_contributions_to(p_public_id text)
returns table (id uuid, action_id uuid, kind public.action_kind, prompt_snapshot text, body text,
               sent_at timestamptz, edited_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.action_id, c.kind, c.prompt_snapshot, c.body, c.sent_at, c.edited_at
    from public.contributions c
    join public.profiles p on p.user_id = c.recipient_id
   where c.sender_id = auth.uid() and p.public_id = p_public_id
   order by c.sent_at;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: nothing is callable unless granted here.
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.get_public_profile(text)                          to anon, authenticated;
grant execute on function public.ensure_starter_profile()                          to authenticated;
grant execute on function public.update_my_profile(text, text, text)               to authenticated;
grant execute on function public.save_profile(text)                                to authenticated;
grant execute on function public.import_guest_saves(jsonb)                         to authenticated;
grant execute on function public.set_saved_note(text, text, timestamptz)           to authenticated;
grant execute on function public.my_saved_people()                                 to authenticated;
grant execute on function public.submit_contribution(uuid, text, text)             to authenticated;
grant execute on function public.my_contributions_to(text)                         to authenticated;
-- require_uid and new_public_id are internal (called from definer functions / defaults).
