#!/usr/bin/env bash
# Applies the migrations to a throwaway local Postgres database (with a stand-in auth schema)
# and runs the access-control tests, including a concurrent-import check.
# Requires psql access to a local Postgres 15+ as a superuser: set PGHOST/PGUSER etc. as needed.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="hiagain_test_$$"
cleanup() { dropdb --if-exists "$DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

createdb "$DB"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$DB")
"${PSQL[@]}" -f supabase/tests/auth_stub.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
# rls_test.sql first (creates the shared fixtures), then the others in name order.
{ echo supabase/tests/rls_test.sql; ls supabase/tests/*_test.sql | grep -v "/rls_test.sql$" | sort; } | while read -r t; do "${PSQL[@]}" -f "$t"; done

# Concurrency: 8 parallel imports of the same batch for one account must leave exactly one row per person.
"${PSQL[@]}" <<'SQL'
insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-4000-8000-0000000000d1', '{"name":"Concurrent Tester"}');
SQL
SUBJECTS=$("${PSQL[@]}" -At -c "select string_agg(format('{\"public_id\":\"%s\",\"saved_at\":\"2026-11-12T10:00:00Z\",\"note\":\"n\"}', public_id), ',') from public.profiles")
run_import() {
  "${PSQL[@]}" -At <<SQL >/dev/null
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1"}', true);
select public.ensure_starter_profile();
select count(*) from public.import_guest_saves('[$SUBJECTS]'::jsonb);
commit;
SQL
}
pids=(); for i in $(seq 1 8); do run_import & pids+=($!); done
fail=0; for p in "${pids[@]}"; do wait "$p" || fail=1; done
[ "$fail" = 0 ] || { echo "concurrent import: a worker failed"; exit 1; }
COUNT=$("${PSQL[@]}" -At -c "select count(*) from public.saved_people where saver_id = '00000000-0000-4000-8000-0000000000d1'")
EXPECTED=$("${PSQL[@]}" -At -c "select count(*) from public.profiles where user_id <> '00000000-0000-4000-8000-0000000000d1'")
[ "$COUNT" = "$EXPECTED" ] || { echo "concurrent import: expected $EXPECTED rows, got $COUNT"; exit 1; }
PROFILES=$("${PSQL[@]}" -At -c "select count(*) from public.profiles where user_id = '00000000-0000-4000-8000-0000000000d1'")
[ "$PROFILES" = 1 ] || { echo "concurrent starter profile: got $PROFILES"; exit 1; }
echo "concurrency: 8 parallel imports -> $COUNT rows (expected $EXPECTED), 1 starter profile"
# Again: 20 pairs press Again at the same moment from both sides -> exactly one match per pair.
"${PSQL[@]}" <<'SQL'
insert into auth.users (id, raw_user_meta_data)
select ('00000000-0000-4000-9000-' || lpad(to_hex(g), 12, '0'))::uuid, '{"name":"Pair tester"}' from generate_series(1, 40) g;
do $$ declare g int; begin
  for g in 1..40 loop
    perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-9000-' || lpad(to_hex(g), 12, '0'))::text, true);
    perform public.ensure_starter_profile();
  end loop;
end $$;
SQL
press() { # $1 = presser index, $2 = target index
  local target; target=$("${PSQL[@]}" -At -c "select public_id from public.profiles where user_id = '00000000-0000-4000-9000-$(printf %012x "$2")'")
  "${PSQL[@]}" -At >/dev/null <<SQL
begin; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-9000-$(printf %012x "$1")"}', true);
select state from public.set_again('$target', true);
commit;
SQL
}
pids=(); for i in $(seq 1 2 39); do press "$i" $((i+1)) & pids+=($!); press $((i+1)) "$i" & pids+=($!); done
fail=0; for p in "${pids[@]}"; do wait "$p" || fail=1; done
[ "$fail" = 0 ] || { echo "concurrent Again: a worker failed"; exit 1; }
MATCHES=$("${PSQL[@]}" -At -c "select count(*) from public.again_matches where user_a::text like '00000000-0000-4000-9000-%'")
[ "$MATCHES" = 20 ] || { echo "concurrent Again: expected 20 matches, got $MATCHES"; exit 1; }
echo "concurrency: 20 pairs pressing Again simultaneously -> $MATCHES matches (expected 20)"
echo "test-db: PASS"
