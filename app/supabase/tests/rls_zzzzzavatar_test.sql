-- Avatar storage policies and URL validation.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
do $$ begin
  insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-4000-8000-00000000000a/p1.jpg');
  begin
    insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-4000-8000-00000000000b/evil.jpg');
    assert false, 'cannot upload into someone else''s folder';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('avatars', 'p-root.jpg');
    assert false, 'cannot upload outside a folder';
  exception when insufficient_privilege then null; end;
  assert public.update_my_avatar('https://proj.supabase.co/storage/v1/object/public/avatars/00000000-0000-4000-8000-00000000000a/p1.jpg') = 'saved';
  assert public.update_my_avatar('https://proj.supabase.co/storage/v1/object/public/avatars/00000000-0000-4000-8000-00000000000b/x.jpg') = 'invalid', 'not someone else''s photo';
  assert public.update_my_avatar('https://tracker.example/pixel.gif') = 'invalid', 'no external images';
  assert public.update_my_avatar('https://proj.supabase.co/storage/v1/object/public/avatars/00000000-0000-4000-8000-00000000000a/../b/x.jpg') = 'invalid';
  assert (public.get_public_profile((select public_id from ids where who = 'a')) ->> 'avatarUrl') like '%/avatars/00000000-0000-4000-8000-00000000000a/p1.jpg';
  assert public.update_my_avatar(null) = 'saved';
  assert (public.get_public_profile((select public_id from ids where who = 'a')) ->> 'avatarUrl') is null, 'photo removed';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
do $$ begin
  assert (select count(*) from storage.objects where bucket_id = 'avatars') = 0, 'cannot list others'' files';
  delete from storage.objects where name like '00000000-0000-4000-8000-00000000000a/%';
end $$;
commit;
do $$ begin
  assert (select count(*) from storage.objects where name = '00000000-0000-4000-8000-00000000000a/p1.jpg') = 1, 'cannot delete others'' files';
end $$;
\o
\echo 'rls_zzzzzavatar_test.sql: all assertions passed'
