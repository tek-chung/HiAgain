-- Hi Again — Again: private interest in meeting again, revealed only when mutual.
-- Decisions (Tek, 13 November 2026): withdraw any time before a match; after a match either
-- person can end it, which removes it for both without notification; one-sided Again never expires.

-- A one-sided signal. Only its sender can ever read it.
create table public.again_signals (
  sender_id    uuid not null references public.profiles (user_id) on delete cascade,
  recipient_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (sender_id, recipient_id),
  check (sender_id <> recipient_id)
);
alter table public.again_signals enable row level security;
revoke all on public.again_signals from anon, authenticated;
grant select on public.again_signals to authenticated;
create policy "Senders read only their own signals"
  on public.again_signals for select to authenticated
  using (sender_id = (select auth.uid()));

-- A mutual match: one row per unordered pair (user_a < user_b).
create table public.again_matches (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references public.profiles (user_id) on delete cascade,
  user_b     uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
alter table public.again_matches enable row level security;
revoke all on public.again_matches from anon, authenticated;
grant select on public.again_matches to authenticated;
create policy "Participants read their matches"
  on public.again_matches for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

-- Private per-user read receipts for match events in Activity.
create table public.match_reads (
  user_id  uuid not null references public.profiles (user_id) on delete cascade,
  match_id uuid not null references public.again_matches (id) on delete cascade,
  read_at  timestamptz not null default now(),
  primary key (user_id, match_id)
);
alter table public.match_reads enable row level security;
revoke all on public.match_reads from anon, authenticated;
grant select on public.match_reads to authenticated;
create policy "Readers see their own match receipts"
  on public.match_reads for select to authenticated
  using (user_id = (select auth.uid()));

-- Serialises every Again change for one unordered pair, so simultaneous reciprocal taps
-- can neither miss the match nor create two.
create or replace function public.lock_pair(a uuid, b uuid)
returns void
language sql
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended(least(a, b)::text || ':' || greatest(a, b)::text, 0));
$$;

-- The caller's own view of Again with someone: none | sent | matched. Never reveals a
-- one-sided incoming signal.
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
  if other is null or other = uid then
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

-- Turn Again on or off. Turning it on creates the match in the same transaction if the other
-- person already said Again. Turning it off withdraws a one-sided signal; a match is ended
-- with end_match() instead.
create or replace function public.set_again(p_public_id text, p_on boolean)
returns table (state text, matched_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid(); other uuid; m timestamptz;
begin
  select p.user_id into other from public.profiles p where p.public_id = p_public_id;
  if other is null then raise exception 'Profile not found' using errcode = 'P0002'; end if;
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

-- Ends a match for both people, quietly. Both signals go too, so a later match needs both
-- people to say Again afresh.
create or replace function public.end_match(p_public_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid(); other uuid;
begin
  select p.user_id into other from public.profiles p where p.public_id = p_public_id;
  if other is null or other = uid then return 'not_found'; end if;
  perform public.lock_pair(uid, other);
  delete from public.again_matches where user_a = least(uid, other) and user_b = greatest(uid, other);
  if not found then return 'not_found'; end if;
  delete from public.again_signals
   where (sender_id = uid and recipient_id = other) or (sender_id = other and recipient_id = uid);
  return 'ended';
end;
$$;

-- Matches for Activity, with the other person's public fields only.
create or replace function public.my_matches()
returns table (id uuid, matched_at timestamptz, unread boolean,
               other_public_id text, other_display_name text, other_avatar_url text, other_linkedin_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.created_at, r.match_id is null,
         p.public_id, p.display_name, p.avatar_url, p.linkedin_url
    from public.again_matches m
    join public.profiles p on p.user_id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
    left join public.match_reads r on r.user_id = auth.uid() and r.match_id = m.id
   where auth.uid() in (m.user_a, m.user_b)
   order by m.created_at desc;
$$;

create or replace function public.mark_matches_read(p_ids uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid(); n int;
begin
  insert into public.match_reads (user_id, match_id)
  select uid, m.id from public.again_matches m
   where m.id = any (coalesce(p_ids, '{}')) and uid in (m.user_a, m.user_b)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Unread now counts received contributions (per version) and unread mutual matches.
-- One-sided incoming Again is never counted.
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
           where c.recipient_id = auth.uid() and coalesce(r.version_read, 0) < c.version)
       + (select count(*)::int
            from public.again_matches m
            left join public.match_reads r on r.user_id = auth.uid() and r.match_id = m.id
           where auth.uid() in (m.user_a, m.user_b) and r.match_id is null);
$$;

revoke execute on function public.lock_pair(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.my_again_state(text), public.set_again(text, boolean), public.end_match(text),
  public.my_matches(), public.mark_matches_read(uuid[]), public.unread_activity_count() from public, anon;
grant execute on function public.my_again_state(text)       to authenticated;
grant execute on function public.set_again(text, boolean)   to authenticated;
grant execute on function public.end_match(text)            to authenticated;
grant execute on function public.my_matches()               to authenticated;
grant execute on function public.mark_matches_read(uuid[])  to authenticated;
grant execute on function public.unread_activity_count()    to authenticated;
