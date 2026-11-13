-- Retention (Tek, 13 November 2026): anonymous guest visits are kept for 12 months after the
-- guest's most recent visit; saves, notes and contributions stay until the person deletes their
-- account. Expired guest visits are hidden immediately and removed by the purge below.

create or replace function public.purge_expired_guest_encounters()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  delete from public.guest_encounters where last_at < now() - interval '12 months';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.purge_expired_guest_encounters() from public, anon, authenticated;

-- Never show an expired visit, even before it is purged.
create or replace function public.my_guest_encounters()
returns table (id uuid, alias text, first_at timestamptz, note text, note_updated_at timestamptz, archived_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.id, g.alias, g.first_at, g.note, g.note_updated_at, g.archived_at
    from public.guest_encounters g
   where g.owner_id = auth.uid() and g.last_at >= now() - interval '12 months'
   order by g.first_at desc;
$$;

-- Each new guest visit also removes that owner's expired visits, so retention holds without a scheduler.
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
  delete from public.guest_encounters where owner_id = owner and last_at < now() - interval '12 months';
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

revoke execute on function public.my_guest_encounters(), public.record_guest_scan(text, text) from public;
grant execute on function public.my_guest_encounters()          to authenticated;
grant execute on function public.record_guest_scan(text, text)  to anon;

-- If pg_cron is enabled (Supabase: Database → Extensions), purge daily as well.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge-expired-guest-encounters', '17 3 * * *', 'select public.purge_expired_guest_encounters()');
  end if;
end $$;
