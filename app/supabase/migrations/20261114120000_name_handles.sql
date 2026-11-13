-- Hi Again — name-based profile links, e.g. hiagain.link/tek-chung (Tek, 14 November 2026).
-- The link always comes from the person's LinkedIn name; it can't be chosen by hand. People with the
-- same name are numbered (tek-chung, tek-chung-2, …). If the LinkedIn name changes, the link follows
-- at the next sign-in and every earlier link keeps redirecting, so printed QR codes never break.
-- Old /p/<id> links keep working too.

-- Every handle anyone has ever had: reserved for that person (no one else can take it).
create table public.profile_handles (
  handle     text primary key check (handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(handle) <= 60),
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now()
);
create index profile_handles_user on public.profile_handles (user_id);
alter table public.profile_handles enable row level security;
revoke all on public.profile_handles from anon, authenticated;

alter table public.profiles add column handle text unique
  check (handle is null or (handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(handle) <= 60));

-- Words that are app pages (or may become ones), never handles.
create or replace function public.is_reserved_handle(h text)
returns boolean language sql immutable set search_path = '' as $$
  select h = any (array['me','people','activity','scan','sign-in','signin','sign-out','auth','api','calendar','p','in',
    'admin','settings','about','help','privacy','terms','login','logout','signup','register','www','static','public',
    'app','support','blog','hiagain','hi-again','account','profile','profiles','search','explore','home','new','edit',
    'delete','null','undefined','robots','sitemap','favicon','manifest','icon','next','assets','images','member']);
$$;

-- "Tek Kan Chung" → "tek-kan-chung"; "Zoë O'Brien-Søndergård" → "zoe-obrien-sondergard".
-- Empty for names with no Latin letters (the caller then uses "member-2", "member-3", …).
create or replace function public.slugify_name(name text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from left(trim(both '-' from regexp_replace(
           replace(replace(replace(replace(replace(translate(lower(coalesce(name, '')),
             'àáâãäåāăąçćčĉċďđèéêëēĕėęěĝğġģĥħìíîïĩīĭįıĵķĺļľŀłñńņňŉòóôõöøōŏőŕŗřśŝşšșţťŧțùúûüũūŭůűųŵýÿŷźżž', 'aaaaaaaaacccccddeeeeeeeeegggghhiiiiiiiiijklllllnnnnnooooooooorrrsssssttttuuuuuuuuuuwyyyzzz'), 'ß', 'ss'), 'æ', 'ae'), 'œ', 'oe'), '''', ''), '’', ''),
           '[^a-z0-9]+', '-', 'g')), 50));
$$;

-- Gives the person a handle matching their LinkedIn name, keeping their current one when it already
-- matches (including a numbered version). Earlier handles stay theirs and keep redirecting.
create or replace function public.assign_handle(p_user uuid, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := nullif(public.slugify_name(p_name), '');
  cur  text;
  cand text;
  n    int := 1;
begin
  if base is null then base := 'member'; end if;
  select handle into cur from public.profiles where user_id = p_user;
  if cur is not null and (cur = base or cur ~ ('^' || base || '-[0-9]+$')) then
    return cur;
  end if;
  loop
    if n = 1 and public.is_reserved_handle(base) then n := 2; end if;
    cand := case when n = 1 then base else base || '-' || n end;
    -- Free, or already this person's from before.
    if not exists (select 1 from public.profile_handles where handle = cand and user_id <> p_user) then
      insert into public.profile_handles (handle, user_id) values (cand, p_user) on conflict (handle) do nothing;
      if exists (select 1 from public.profile_handles where handle = cand and user_id = p_user) then
        update public.profiles set handle = cand, updated_at = now() where user_id = p_user;
        return cand;
      end if;
      -- Taken by someone else at the same moment: try the next number.
    end if;
    n := n + 1;
    if n > 100000 then raise exception 'No free handle for %', base; end if;
  end loop;
end;
$$;
revoke execute on function public.assign_handle(uuid, text), public.slugify_name(text), public.is_reserved_handle(text)
  from public, anon, authenticated;

-- Existing profiles get handles from their LinkedIn name (oldest accounts first get the plain names).
do $$
declare r record;
begin
  for r in select p.user_id,
                  coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''), p.display_name) as nm
             from public.profiles p join auth.users u on u.id = p.user_id
            where p.handle is null order by p.created_at, p.user_id loop
    perform public.assign_handle(r.user_id, r.nm);
  end loop;
end $$;

-- Sign-in: create the starter profile if needed, and keep the handle in step with the LinkedIn name.
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

  perform public.assign_handle(uid, nm);

  return query select p.public_id, was_created from public.profiles p where p.user_id = uid;
end;
$$;

-- Resolves a typed or scanned handle to the profile's public ID and its current handle (different
-- when the person's LinkedIn name has changed since, so the page can redirect).
create or replace function public.resolve_handle(p_handle text)
returns table (public_id text, current_handle text)
language sql stable security definer set search_path = '' as $$
  select p.public_id, p.handle
    from public.profile_handles h join public.profiles p on p.user_id = h.user_id
   where h.handle = lower(p_handle)
     and (auth.uid() is null or not public.is_blocked(auth.uid(), p.user_id));
$$;
revoke execute on function public.resolve_handle(text) from public;
grant execute on function public.resolve_handle(text) to anon, authenticated;

-- The handle is public (it is the profile's address), so the public profile includes it.
create or replace function public.get_public_profile(p_public_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'publicId',    p.public_id,
    'handle',      p.handle,
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
    and (auth.uid() is null or not public.is_blocked(auth.uid(), p.user_id));
$$;
