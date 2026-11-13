#!/usr/bin/env bash
# Signed-in end-to-end check: real migrations in a throwaway local Postgres, the test-only
# Supabase stub, a production build of the app, and Playwright driving the journeys.
# Needs local Postgres superuser access (PGHOST/PGUSER as needed) and Playwright's Chromium.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="hiagain_e2e_$$"
APP_PORT=${APP_PORT:-3200}
STUB_PORT=${STUB_PORT:-54321}
PIDS=()
cleanup() { for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done; dropdb --if-exists "$DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

for port in "$APP_PORT" "$STUB_PORT"; do
  if curl -s -o /dev/null "http://localhost:$port/"; then echo "Port $port is already in use; stop that process first."; exit 1; fi
done
createdb "$DB"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$DB")
"${PSQL[@]}" -f supabase/tests/auth_stub.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f scripts/e2e-seed.sql

export DATABASE_URL="postgres:///$DB?host=${PGHOST:-/var/run/postgresql}"
STUB_PORT=$STUB_PORT STUB_LATENCY_MS=${STUB_LATENCY_MS:-0} node scripts/supabase-stub.mjs > /tmp/hiagain-stub.log 2>&1 & PIDS+=($!)

export NEXT_DIST_DIR=.next-e2e NEXT_TELEMETRY_DISABLED=1
export NEXT_PUBLIC_SUPABASE_URL="http://localhost:$STUB_PORT" NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_test_only"
export NEXT_PUBLIC_SITE_URL="http://localhost:$APP_PORT"
# Test-only Google endpoints served by the stub. Real deployments leave these unset.
export GOOGLE_CLIENT_ID=test-client GOOGLE_CLIENT_SECRET=test-secret
export CALENDAR_TOKEN_KEY="$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')"
export GOOGLE_AUTH_URL="http://localhost:$STUB_PORT/google/auth" GOOGLE_TOKEN_URL="http://localhost:$STUB_PORT/google/token"
export GOOGLE_REVOKE_URL="http://localhost:$STUB_PORT/google/revoke" GOOGLE_CALENDAR_API="http://localhost:$STUB_PORT/google/calendar"
node node_modules/next/dist/bin/next build > /tmp/hiagain-e2e-build.log 2>&1 || { tail -30 /tmp/hiagain-e2e-build.log; exit 1; }
node node_modules/next/dist/bin/next start -p "$APP_PORT" > /tmp/hiagain-e2e-app.log 2>&1 & PIDS+=($!)
for i in $(seq 1 30); do curl -sf "http://localhost:$APP_PORT/" >/dev/null && break; sleep 1; done

export BASE_URL="http://localhost:$APP_PORT" STUB_URL="http://localhost:$STUB_PORT"
# CHECKS lets you run a subset, e.g. CHECKS="perf-check" STUB_LATENCY_MS=80 for a timing run.
for c in ${CHECKS:-auth-errors-check signed-in-check calendar-check activity-check again-check scans-check avatar-check}; do
  node "scripts/$c.mjs"
done
