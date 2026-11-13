-- Fictional accounts for the signed-in end-to-end check (test database only).
insert into auth.users (id, raw_user_meta_data, email) values
  ('00000000-0000-4000-8000-0000000000a1', '{"name":"Alex Morgan"}', 'alex@example.test'),
  ('00000000-0000-4000-8000-0000000000b1', '{"name":"Jamie Chen"}',  'jamie@example.test'),
  ('00000000-0000-4000-8000-0000000000c1', '{"name":"Sam Patel"}',   'sam@example.test');

-- Alex and Jamie already have profiles. Sam already has an account that saved Jamie with a note.
do $$
declare u uuid;
begin
  foreach u in array array['00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000b1','00000000-0000-4000-8000-0000000000c1']::uuid[] loop
    perform set_config('request.jwt.claims', json_build_object('sub', u)::text, true);
    perform public.ensure_starter_profile();
  end loop;
end $$;
update public.profiles set headline = 'Product builder · London', linkedin_url = 'https://www.linkedin.com/in/alex-morgan-demo'
 where user_id = '00000000-0000-4000-8000-0000000000a1';
update public.profiles set headline = 'Product designer · London' where user_id = '00000000-0000-4000-8000-0000000000b1';
insert into public.saved_people (saver_id, subject_id, saved_at, note, note_updated_at, source)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1',
        now() - interval '3 days', 'Designer from the climate meetup', now() - interval '3 days', 'scan');

-- Extra fictional people for the calendar journeys.
insert into auth.users (id, raw_user_meta_data, email) values
  ('00000000-0000-4000-8000-0000000000f1', '{"name":"Robin Taylor"}', 'robin@example.test'),
  ('00000000-0000-4000-8000-0000000000d1', '{"name":"Priya Shah"}',   'priya@example.test'),
  ('00000000-0000-4000-8000-0000000000d2', '{"name":"Morgan Lee"}',   'morgan@example.test'),
  ('00000000-0000-4000-8000-0000000000d3', '{"name":"Kai Brown"}',    'kai@example.test');
do $$
declare u uuid;
begin
  foreach u in array array['00000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000d2','00000000-0000-4000-8000-0000000000d3']::uuid[] loop
    perform set_config('request.jwt.claims', json_build_object('sub', u)::text, true);
    perform public.ensure_starter_profile();
  end loop;
end $$;

-- A fictional account that will delete itself in the deletion journey (profile created at first sign-in).
insert into auth.users (id, raw_user_meta_data, email) values
  ('00000000-0000-4000-8000-0000000000d4', '{"name":"Dana Fox"}', 'dana@example.test');
