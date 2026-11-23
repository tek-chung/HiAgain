-- Hi Again — growth loop (23 November 2026, accepted by Tek):
--   * Event mode: an organiser's event QR; attendees who join have the people they meet there
--     tagged "Met at <event>"; the organiser sees counts only.
--   * Again review: the caller's recently met people with their own Again state (never incoming).
--   * Next-day email digest (supersedes "no email for the pilot"): counts only, opt-out, run by a
--     server cron that must present a secret. Dormant until that secret is set.
--   * "Did you meet?" follow-up on mutual matches, and privacy-light daily funnel counts.
-- Every new table cascades from profiles, so account deletion still removes everything.

-- ---------------------------------------------------------------------------
-- New app pages must never be shadowed by a profile address.
-- ---------------------------------------------------------------------------
create or replace function public.is_reserved_handle(h text)
returns boolean language sql immutable set search_path = '' as $$
  select h = any (array['me','people','activity','scan','sign-in','signin','sign-out','auth','api','calendar','p','in',
    'admin','settings','about','help','privacy','terms','login','logout','signup','register','www','static','public',
    'app','support','blog','hiagain','hi-again','account','profile','profiles','search','explore','home','new','edit',
    'delete','null','undefined','robots','sitemap','favicon','manifest','icon','next','assets','images','member',
    'e','event','events','review','offline','sw']);
$$;
revoke execute on function public.is_reserved_handle(text) from public, anon, authenticated;

-- Anyone already holding one of the newly reserved words moves to a numbered address.
do $$
declare r record;
begin
  for r in select p.user_id,
                  coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''), p.display_name) as nm
             from public.profiles p join auth.users u on u.id = p.user_id
            where p.handle = any (array['e','event','events','review','offline','sw']) loop
    update public.profiles set handle = null where user_id = r.user_id;
    perform public.assign_handle(r.user_id, r.nm);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique default public.new_public_id() check (code ~ '^[A-Za-z0-9_-]{12}$'),
  organiser_id uuid not null references public.profiles (user_id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 120),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '3 days')
);
create index events_organiser on public.events (organiser_id, created_at desc);

create table public.event_attendees (
  event_id  uuid not null references public.events (id) on delete cascade,
  user_id   uuid not null references public.profiles (user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_attendees_user on public.event_attendees (user_id, joined_at desc);

alter table public.events          enable row level security;
alter table public.event_attendees enable row level security;
revoke all on public.events, public.event_attendees from anon, authenticated;
grant select on public.events, public.event_attendees to authenticated;
create policy "Organisers and attendees read their events"
  on public.events for select to authenticated
  using (organiser_id = (select auth.uid())
         or exists (select 1 from public.event_attendees a where a.event_id = events.id and a.user_id = (select auth.uid())));
-- Attendance is private to each attendee: organisers see counts, never the list.
create policy "Attendees read their own attendance"
  on public.event_attendees for select to authenticated
  using (user_id = (select auth.uid()));

-- Saves made at an event carry it as context ("Met at <event>").
alter table public.saved_people
  add column event_id uuid references public.events (id) on delete set null;
alter table public.saved_people drop constraint saved_people_context_source_check;
alter table public.saved_people add constraint saved_people_context_source_check
  check (context_source in ('calendar_auto', 'calendar_chosen', 'manual', 'event'));
create index saved_people_event on public.saved_people (event_id) where event_id is not null;

-- An event counts as "on" from two hours before it starts until two hours after it ends.
create or replace function public.event_is_on(e public.events)
returns boolean language sql stable set search_path = '' as $$
  select now() between e.starts_at - interval '2 hours' and e.ends_at + interval '2 hours';
$$;

-- Tags the save in both directions between two people with the event they are both at, unless the
-- person already has context there or removed it. Internal.
create or replace function public.tag_event_context(a uuid, b uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare e public.events%rowtype;
begin
  select ev.* into e
    from public.events ev
    join public.event_attendees x on x.event_id = ev.id and x.user_id = a
    join public.event_attendees y on y.event_id = ev.id and y.user_id = b
   where public.event_is_on(ev)
   order by ev.starts_at desc
   limit 1;
  if not found then return; end if;
  update public.saved_people s
     set event_id = e.id,
         context_label = case when s.context_label is null and not s.context_dismissed then e.name else s.context_label end,
         context_source = case when s.context_label is null and not s.context_dismissed then 'event' else s.context_source end,
         context_event_start = case when s.context_label is null and not s.context_dismissed then e.starts_at else s.context_event_start end,
         context_updated_at = case when s.context_label is null and not s.context_dismissed then now() else s.context_updated_at end
   where ((s.saver_id = a and s.subject_id = b) or (s.saver_id = b and s.subject_id = a))
     and s.event_id is null
     and s.saved_at >= e.starts_at - interval '2 hours';
end;
$$;

create or replace function public.create_event(p_name text, p_starts_at timestamptz, p_ends_at timestamptz)
returns table (status text, code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_uid();
  clean text := btrim(coalesce(p_name, ''));
  new_id uuid;
  new_code text;
begin
  if char_length(clean) < 1 or char_length(clean) > 120 or p_starts_at is null or p_ends_at is null
     or p_ends_at <= p_starts_at or p_ends_at > p_starts_at + interval '3 days'
     or p_starts_at < now() - interval '1 day' or p_starts_at > now() + interval '366 days' then
    return query select 'invalid'::text, null::text; return;
  end if;
  if (select count(*) from public.events where organiser_id = uid and created_at > now() - interval '1 day') >= 20 then
    return query select 'limit'::text, null::text; return;
  end if;
  insert into public.events (organiser_id, name, starts_at, ends_at)
  values (uid, clean, p_starts_at, p_ends_at)
  returning id, events.code into new_id, new_code;
  insert into public.event_attendees (event_id, user_id) values (new_id, uid);
  return query select 'created'::text, new_code;
end;
$$;

-- What anyone with the event link sees: name, times, organiser's name and how many have joined.
create or replace function public.get_public_event(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code',          e.code,
    'name',          e.name,
    'startsAt',      e.starts_at,
    'endsAt',        e.ends_at,
    'organiserName', p.display_name,
    'attendeeCount', (select count(*) from public.event_attendees a where a.event_id = e.id),
    'isOn',          public.event_is_on(e),
    'hasEnded',      now() > e.ends_at + interval '2 hours',
    'isOrganiser',   coalesce(auth.uid() = e.organiser_id, false),
    'joined',        coalesce(exists (select 1 from public.event_attendees a where a.event_id = e.id and a.user_id = auth.uid()), false))
  from public.events e
  join public.profiles p on p.user_id = e.organiser_id
  where e.code = p_code
    and (auth.uid() is null or not public.is_blocked(auth.uid(), e.organiser_id));
$$;

-- Joining tags the people you've already saved there today, both ways.
create or replace function public.join_event(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_uid();
  e public.events%rowtype;
  other uuid;
begin
  select * into e from public.events where code = p_code;
  if not found or public.is_blocked(uid, e.organiser_id) then return 'not_found'; end if;
  if now() > e.ends_at + interval '2 hours' then return 'ended'; end if;
  insert into public.event_attendees (event_id, user_id) values (e.id, uid) on conflict do nothing;
  if not found then return 'already'; end if;
  if public.event_is_on(e) then
    for other in
      select a.user_id from public.event_attendees a
       where a.event_id = e.id and a.user_id <> uid
         and exists (select 1 from public.saved_people s
                      where (s.saver_id = uid and s.subject_id = a.user_id) or (s.saver_id = a.user_id and s.subject_id = uid))
    loop
      perform public.tag_event_context(uid, other);
    end loop;
  end if;
  return 'joined';
end;
$$;

create or replace function public.leave_event(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid(); eid uuid; org uuid;
begin
  select id, organiser_id into eid, org from public.events where code = p_code;
  if eid is null then return 'not_found'; end if;
  if org = uid then return 'organiser'; end if;
  delete from public.event_attendees where event_id = eid and user_id = uid;
  return 'left';
end;
$$;

create or replace function public.my_events()
returns table (code text, name text, starts_at timestamptz, ends_at timestamptz, is_organiser boolean, attendee_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select e.code, e.name, e.starts_at, e.ends_at, e.organiser_id = auth.uid(),
         (select count(*) from public.event_attendees x where x.event_id = e.id)
    from public.events e
    join public.event_attendees a on a.event_id = e.id and a.user_id = auth.uid()
   order by e.starts_at desc
   limit 50;
$$;

-- Organiser-only counts. Mutual Agains are shown only once at least 5 people have joined, so a
-- tiny event can't hint at who matched with whom.
create or replace function public.event_stats(p_code text)
returns table (attendees bigint, connections bigint, mutual_agains bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid(); e public.events%rowtype; n bigint;
begin
  select * into e from public.events where code = p_code and organiser_id = uid;
  if not found then return; end if;
  select count(*) into n from public.event_attendees where event_id = e.id;
  return query select
    n,
    (select count(distinct (least(s.saver_id, s.subject_id), greatest(s.saver_id, s.subject_id)))
       from public.saved_people s where s.event_id = e.id),
    case when n < 5 then null else
      (select count(*) from public.again_matches m
        where m.created_at >= e.starts_at - interval '2 hours'
          and exists (select 1 from public.event_attendees a where a.event_id = e.id and a.user_id = m.user_a)
          and exists (select 1 from public.event_attendees b where b.event_id = e.id and b.user_id = m.user_b)
          and exists (select 1 from public.saved_people s where s.event_id = e.id
                       and ((s.saver_id = m.user_a and s.subject_id = m.user_b) or (s.saver_id = m.user_b and s.subject_id = m.user_a))))
    end;
end;
$$;

-- save_profile: unchanged rules, plus event tagging when both people are at the same event.
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

  perform public.tag_event_context(uid, subject);

  return query
    select case when saved then 'saved' else 'already_saved' end, s.saved_at
    from public.saved_people s where s.saver_id = uid and s.subject_id = subject;
end;
$$;

-- set_saved_context: also accepts 'event' so removing event context can be undone.
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
  if clean is not null and p_source not in ('calendar_auto', 'calendar_chosen', 'manual', 'event') then
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
         context_dismissed   = (clean is null)
   where s.saver_id = uid and s.subject_id = subject;
  return query select 'saved'::text, clean, case when clean is null then null else p_source end,
                      case when clean is null then null else p_event_start end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Again review: people the caller saved recently, with only the caller's own Again state.
-- ---------------------------------------------------------------------------
create or replace function public.my_recent_people(p_days int default 7)
returns table (public_id text, display_name text, headline text, avatar_url text, linkedin_url text,
               saved_at timestamptz, context_label text, source text, again_state text, matched_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.public_id, p.display_name, p.headline, p.avatar_url, p.linkedin_url,
         s.saved_at, s.context_label, s.source,
         case when m.id is not null then 'matched'
              when g.sender_id is not null then 'sent'
              else 'none' end,
         m.created_at
    from public.saved_people s
    join public.profiles p on p.user_id = s.subject_id
    left join public.again_matches m on m.user_a = least(s.saver_id, s.subject_id) and m.user_b = greatest(s.saver_id, s.subject_id)
    left join public.again_signals g on g.sender_id = s.saver_id and g.recipient_id = s.subject_id
   where s.saver_id = auth.uid() and s.archived_at is null
     and not public.is_blocked(auth.uid(), s.subject_id)
     and s.saved_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 7), 1), 30))
   order by s.saved_at desc
   limit 200;
$$;

-- ---------------------------------------------------------------------------
-- "Did you meet?" — each person's own answer about a mutual match.
-- ---------------------------------------------------------------------------
create table public.match_outcomes (
  match_id    uuid not null references public.again_matches (id) on delete cascade,
  user_id     uuid not null references public.profiles (user_id) on delete cascade,
  outcome     text not null check (outcome in ('met', 'planned', 'not_yet', 'no')),
  answered_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
alter table public.match_outcomes enable row level security;
revoke all on public.match_outcomes from anon, authenticated;
grant select on public.match_outcomes to authenticated;
create policy "People read their own match answers"
  on public.match_outcomes for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.set_match_outcome(p_public_id text, p_outcome text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid(); other uuid; mid uuid;
begin
  if p_outcome is null or p_outcome not in ('met', 'planned', 'not_yet', 'no') then return 'invalid'; end if;
  select p.user_id into other from public.profiles p where p.public_id = p_public_id;
  select id into mid from public.again_matches where user_a = least(uid, other) and user_b = greatest(uid, other);
  if mid is null then return 'not_found'; end if;
  insert into public.match_outcomes (match_id, user_id, outcome) values (mid, uid, p_outcome)
  on conflict (match_id, user_id) do update set outcome = excluded.outcome, answered_at = now();
  return 'saved';
end;
$$;

create or replace function public.my_match_outcome(p_public_id text)
returns table (matched_at timestamptz, outcome text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.created_at, o.outcome
    from public.profiles p
    join public.again_matches m on m.user_a = least(auth.uid(), p.user_id) and m.user_b = greatest(auth.uid(), p.user_id)
    left join public.match_outcomes o on o.match_id = m.id and o.user_id = auth.uid()
   where p.public_id = p_public_id and not public.is_blocked(auth.uid(), p.user_id);
$$;

-- ---------------------------------------------------------------------------
-- Next-day email digest
-- ---------------------------------------------------------------------------
create table public.notification_settings (
  user_id      uuid primary key references public.profiles (user_id) on delete cascade,
  digest_email boolean not null default true,
  updated_at   timestamptz not null default now()
);
create table public.digest_log (
  user_id     uuid not null references public.profiles (user_id) on delete cascade,
  digest_date date not null,
  sent_at     timestamptz not null default now(),
  primary key (user_id, digest_date)
);
-- Server secrets, stored only as SHA-256 hashes. Nobody can read this table through the API.
create table public.app_secrets (
  name       text primary key,
  value_hash bytea not null,
  updated_at timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
alter table public.digest_log            enable row level security;
alter table public.app_secrets           enable row level security;
revoke all on public.notification_settings, public.digest_log, public.app_secrets from anon, authenticated;
grant select on public.notification_settings to authenticated;
create policy "Owners read their own notification settings"
  on public.notification_settings for select to authenticated
  using (user_id = (select auth.uid()));

-- Run once in the Supabase SQL Editor: select public.set_app_secret('digest', '<the same value as CRON_SECRET>');
create or replace function public.set_app_secret(p_name text, p_value text)
returns void language sql security definer set search_path = '' as $$
  insert into public.app_secrets (name, value_hash) values (p_name, pg_catalog.sha256(convert_to(p_value, 'UTF8')))
  on conflict (name) do update set value_hash = excluded.value_hash, updated_at = now();
$$;

create or replace function public.check_app_secret(p_name text, p_value text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(char_length(p_value) >= 32 and exists (
    select 1 from public.app_secrets
     where name = p_name and value_hash = pg_catalog.sha256(convert_to(p_value, 'UTF8'))), false);
$$;

create or replace function public.set_digest_email(p_on boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid();
begin
  insert into public.notification_settings (user_id, digest_email) values (uid, coalesce(p_on, true))
  on conflict (user_id) do update set digest_email = excluded.digest_email, updated_at = now();
  return coalesce(p_on, true);
end;
$$;

-- Who should get yesterday's digest (London time). Counts only: never names, and never a
-- one-sided Again. Callable only with the digest secret.
create or replace function public.digest_due(p_key text)
returns table (user_id uuid, email text, first_name text, people_count bigint, event_name text, new_matches bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare d date := (now() at time zone 'Europe/London')::date - 1;
begin
  if not public.check_app_secret('digest', p_key) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return query
  with people as (
    select s.saver_id as uid, count(*) as n,
           mode() within group (order by s.context_label) filter (where s.context_source = 'event') as ev
      from public.saved_people s
     where (s.saved_at at time zone 'Europe/London')::date = d
       and s.archived_at is null
       and not public.is_blocked(s.saver_id, s.subject_id)
     group by s.saver_id
  ), matches as (
    select x.uid, count(*) as n
      from (select m.user_a as uid, m.id from public.again_matches m where (m.created_at at time zone 'Europe/London')::date = d
            union all
            select m.user_b, m.id from public.again_matches m where (m.created_at at time zone 'Europe/London')::date = d) x
     where not exists (select 1 from public.match_reads r where r.user_id = x.uid and r.match_id = x.id)
     group by x.uid
  )
  select pr.user_id, u.email::text,
         nullif(split_part(btrim(pr.display_name), ' ', 1), ''),
         coalesce(pe.n, 0), pe.ev, coalesce(ma.n, 0)
    from public.profiles pr
    join auth.users u on u.id = pr.user_id
    left join people pe on pe.uid = pr.user_id
    left join matches ma on ma.uid = pr.user_id
    left join public.notification_settings ns on ns.user_id = pr.user_id
   where (pe.n > 0 or ma.n > 0)
     and coalesce(ns.digest_email, true)
     and u.email is not null and u.email <> ''
     and not exists (select 1 from public.digest_log l where l.user_id = pr.user_id and l.digest_date = d)
   limit 2000;
end;
$$;

create or replace function public.digest_mark_sent(p_key text, p_user_ids uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare d date := (now() at time zone 'Europe/London')::date - 1; n int;
begin
  if not public.check_app_secret('digest', p_key) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  insert into public.digest_log (user_id, digest_date)
  select x, d from unnest(coalesce(p_user_ids, '{}')) x
   where exists (select 1 from public.profiles p where p.user_id = x)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Funnel: daily counts of a few in-browser steps, with no user or device identifiers at all.
-- Everything else is counted from existing tables by funnel_report().
-- ---------------------------------------------------------------------------
create table public.funnel_counts (
  day  date not null,
  kind text not null,
  n    bigint not null default 0,
  primary key (day, kind)
);
alter table public.funnel_counts enable row level security;
revoke all on public.funnel_counts from anon, authenticated;

create or replace function public.log_funnel(p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind not in ('guest_nudge_shown', 'guest_nudge_click', 'linkedin_prompt_saved', 'review_opened',
                    'match_copy_message', 'match_open_linkedin', 'event_qr_shown', 'install_click') then
    return;
  end if;
  insert into public.funnel_counts (day, kind, n) values ((now() at time zone 'Europe/London')::date, p_kind, 1)
  on conflict (day, kind) do update set n = public.funnel_counts.n + 1;
end;
$$;

-- For Tek in the Supabase SQL Editor: select * from public.funnel_report(30);
create or replace function public.funnel_report(p_days int default 30)
returns table (step text, value bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with w as (select now() - make_interval(days => greatest(coalesce(p_days, 30), 1)) as since)
  select * from (values
    ('01 accounts created',                 (select count(*) from public.profiles, w where created_at >= w.since)),
    ('02 accounts with a LinkedIn link',    (select count(*) from public.profiles where linkedin_url is not null)),
    ('03 guest scans (unique per owner)',   (select count(*) from public.guest_encounters, w where first_at >= w.since)),
    ('04 guest nudge shown',                (select coalesce(sum(n), 0) from public.funnel_counts, w where day >= w.since::date and kind = 'guest_nudge_shown')),
    ('05 guest nudge tapped',               (select coalesce(sum(n), 0) from public.funnel_counts, w where day >= w.since::date and kind = 'guest_nudge_click')),
    ('06 guest saves imported',             (select count(*) from public.saved_people, w where created_at >= w.since and source = 'guest_import')),
    ('07 signed-in scans',                  (select count(*) from public.saved_people, w where created_at >= w.since and source = 'scan')),
    ('08 contributions sent',               (select count(*) from public.contributions, w where sent_at >= w.since)),
    ('09 events created',                   (select count(*) from public.events, w where created_at >= w.since)),
    ('10 event joins',                      (select count(*) from public.event_attendees, w where joined_at >= w.since)),
    ('11 saves tagged with an event',       (select count(*) from public.saved_people, w where created_at >= w.since and event_id is not null)),
    ('12 review screen opened',             (select coalesce(sum(n), 0) from public.funnel_counts, w where day >= w.since::date and kind = 'review_opened')),
    ('13 digests sent',                     (select count(*) from public.digest_log, w where sent_at >= w.since)),
    ('14 one-sided Agains still standing',  (select count(*) from public.again_signals, w where created_at >= w.since)),
    ('15 mutual matches',                   (select count(*) from public.again_matches, w where created_at >= w.since)),
    ('16 match message copied',             (select coalesce(sum(n), 0) from public.funnel_counts, w where day >= w.since::date and kind = 'match_copy_message')),
    ('17 match LinkedIn opened',            (select coalesce(sum(n), 0) from public.funnel_counts, w where day >= w.since::date and kind = 'match_open_linkedin')),
    ('18 matches where someone said met',   (select count(distinct o.match_id) from public.match_outcomes o join public.again_matches m on m.id = o.match_id, w
                                               where m.created_at >= w.since and o.outcome = 'met')),
    ('19 matches where someone said planned',(select count(distinct o.match_id) from public.match_outcomes o join public.again_matches m on m.id = o.match_id, w
                                               where m.created_at >= w.since and o.outcome = 'planned'))
  ) as t(step, value)
  order by step;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on function
  public.event_is_on(public.events), public.tag_event_context(uuid, uuid), public.create_event(text, timestamptz, timestamptz),
  public.get_public_event(text), public.join_event(text), public.leave_event(text), public.my_events(), public.event_stats(text),
  public.save_profile(text), public.set_saved_context(text, text, text, timestamptz, boolean), public.my_recent_people(int),
  public.set_match_outcome(text, text), public.my_match_outcome(text), public.set_app_secret(text, text),
  public.check_app_secret(text, text), public.set_digest_email(boolean), public.digest_due(text),
  public.digest_mark_sent(text, uuid[]), public.log_funnel(text), public.funnel_report(int)
  from public, anon, authenticated;

grant execute on function public.get_public_event(text)                                  to anon, authenticated;
grant execute on function public.log_funnel(text)                                        to anon, authenticated;
-- The digest cron has no user session; these two refuse to run without the digest secret.
grant execute on function public.digest_due(text), public.digest_mark_sent(text, uuid[]) to anon;
grant execute on function
  public.create_event(text, timestamptz, timestamptz), public.join_event(text), public.leave_event(text),
  public.my_events(), public.event_stats(text), public.save_profile(text),
  public.set_saved_context(text, text, text, timestamptz, boolean), public.my_recent_people(int),
  public.set_match_outcome(text, text), public.my_match_outcome(text), public.set_digest_email(boolean)
  to authenticated;
