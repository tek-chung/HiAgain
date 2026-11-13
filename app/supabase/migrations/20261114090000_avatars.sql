-- Hi Again — profile photo upload (Supabase Storage). Photos are public, like the rest of the
-- public profile (Tek, 13 November 2026: photo is a public field). Each person can write only
-- inside their own folder: avatars/<user id>/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Avatar owners can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Avatar owners can replace"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Avatar owners can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Avatar owners can list their folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Allow local development URLs (http://localhost) alongside HTTPS.
alter table public.profiles drop constraint profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or avatar_url ~ '^https://' or avatar_url ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?/');

-- Sets (or clears) the caller's photo. Only a public URL inside the caller's own avatars folder is
-- accepted, so a profile can't point at an arbitrary external (e.g. tracking) image.
create or replace function public.update_my_avatar(p_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := public.require_uid();
begin
  if p_url is not null and (
       p_url !~ ('^(https://[^/]+|http://(localhost|127\.0\.0\.1)(:[0-9]+)?)/storage/v1/object/public/avatars/'
                 || uid::text || '/[A-Za-z0-9._-]{1,100}$')) then
    return 'invalid';
  end if;
  update public.profiles set avatar_url = p_url, updated_at = now() where user_id = uid;
  return 'saved';
end;
$$;
revoke execute on function public.update_my_avatar(text) from public, anon;
grant execute on function public.update_my_avatar(text) to authenticated;
