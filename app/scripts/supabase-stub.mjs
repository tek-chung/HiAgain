// TEST-ONLY stand-in for the parts of Supabase's HTTP API this app uses, backed by a real
// local Postgres database that has the real migrations applied. It lets the signed-in
// browser journeys run end-to-end without a Supabase project or LinkedIn credentials.
//
// It is NOT a security boundary and must never be deployed. Tokens are unsigned; the
// "LinkedIn" page lets you pick a fictional account. Access control under test is the
// database's own RLS/grants: every request runs as the anon/authenticated role with
// request.jwt.claims set, exactly as PostgREST does.
//
// Usage: DATABASE_URL=postgres://... node scripts/supabase-stub.mjs   (listens on :54321)
import http from "node:http";
import { createHash, createSign, generateKeyPairSync, randomBytes } from "node:crypto";
import pg from "pg";

const PORT = Number(process.env.STUB_PORT ?? 54321);
// Match PostgREST: timestamps keep microsecond precision as ISO strings (JS Dates would drop it).
const isoTs = (v) => v.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
pg.types.setTypeParser(1184, isoTs); // timestamptz
pg.types.setTypeParser(1114, isoTs); // timestamp
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const codes = new Map(); // auth code -> user id
const failNext = new Set(); // rpc names that should fail once (simulated network/server failure)

// ---- Google stand-in state ----
const SCOPE_LIST = "https://www.googleapis.com/auth/calendar.calendarlist.readonly";
const SCOPE_EVENTS = "https://www.googleapis.com/auth/calendar.events.readonly";
const gCodes = new Map();   // code -> { scopes, challenge }
const gAccess = new Map();  // access token -> { scopes }
const gRefresh = new Map(); // refresh token -> { scopes, revoked }
const gRevoked = [];
let gFailRefresh = false;
const gCalendars = [
  { id: "primary@example.test", summary: "robin@example.test", primary: true },
  { id: "team-events@example.test", summary: "Team events" },
];
let gEvents = {}; // calendarId -> Google-format events
const files = new Map(); // "bucket/path" -> { type, body } (object rows live in storage.objects, under RLS)

// Asymmetric (ES256) access tokens with a JWKS endpoint, like current Supabase projects, so the app's
// local token verification (auth.getClaims) is exercised. Test keys are generated per run.
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const KID = "stub-" + randomBytes(4).toString("hex");
const JWK = { ...publicKey.export({ format: "jwk" }), kid: KID, alg: "ES256", use: "sig", key_ops: ["verify"] };
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function makeJwt(sub) {
  const head = b64url({ alg: "ES256", typ: "JWT", kid: KID });
  const body = b64url({ sub, role: "authenticated", aud: "authenticated", iss: `http://localhost:${PORT}/auth/v1`,
    exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), session_id: randomBytes(8).toString("hex") });
  const sig = createSign("SHA256").update(`${head}.${body}`).sign({ key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${head}.${body}.${sig}`;
}
function subFromAuth(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
  if (!m) return null;
  const parts = m[1].split(".");
  if (parts.length !== 3) return null; // publishable key => anon
  try {
    if (JSON.parse(Buffer.from(parts[0], "base64url").toString()).kid !== KID) return null;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString()).sub ?? null;
  } catch { return null; }
}

// Optional simulated network latency per request (e.g. STUB_LATENCY_MS=80 for US↔UK), and counters.
const LATENCY = Number(process.env.STUB_LATENCY_MS ?? 0);
const stats = new Map();

async function asRole(sub, fn) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${sub ? "authenticated" : "anon"}`);
    await c.query("select set_config('request.jwt.claims', $1, true)", [sub ? JSON.stringify({ sub, role: "authenticated" }) : ""]);
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

async function userJson(id) {
  const { rows } = await pool.query("select id, email, raw_user_meta_data from auth.users where id = $1", [id]);
  if (!rows[0]) return null;
  return { id, aud: "authenticated", role: "authenticated", email: rows[0].email, user_metadata: rows[0].raw_user_meta_data ?? {}, app_metadata: { provider: "linkedin_oidc" }, created_at: new Date().toISOString() };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
}
const readBody = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => r(d)); });

// Like PostgREST: set-returning functions give arrays, others a single value.
const returnsSet = new Map();
async function isSetReturning(name) {
  if (!returnsSet.has(name)) {
    const { rows } = await pool.query("select proretset from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace", [name]);
    returnsSet.set(name, Boolean(rows[0]?.proretset));
  }
  return returnsSet.get(name);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/__test/stats") {
    const body = Object.fromEntries(stats);
    if (url.searchParams.get("reset")) stats.clear();
    return send(res, 200, body);
  }
  if (!url.pathname.startsWith("/__") && !url.pathname.startsWith("/google/")) {
    const key = `${req.method} ${url.pathname.replace(/\/storage\/v1\/object\/.*/, "/storage")}`;
    stats.set(key, (stats.get(key) ?? 0) + 1);
    if (LATENCY) await new Promise((r) => setTimeout(r, LATENCY));
  }
  try {
    if (req.method === "OPTIONS") return send(res, 204);

    // ---- test controls ----
    if (url.pathname === "/__test/fail") { failNext.add(url.searchParams.get("fn")); return send(res, 200, { ok: true }); }


    // ---- Google OAuth + Calendar stand-in (test only) ----
    if (url.pathname === "/__test/google/events" && req.method === "POST") { gEvents = JSON.parse(await readBody(req)); return send(res, 200, { ok: true }); }
    if (url.pathname === "/__test/google/fail-refresh") { gFailRefresh = url.searchParams.get("on") === "1"; return send(res, 200, { ok: true }); }
    if (url.pathname === "/__test/google/revoked") return send(res, 200, gRevoked);
    if (url.pathname === "/google/auth") {
      const p = url.searchParams;
      const hidden = ["redirect_uri", "state", "code_challenge"].map((k) => `<input type="hidden" name="${k}" value="${(p.get(k) ?? "").replace(/"/g, "&quot;")}">`).join("");
      const boxes = (p.get("scope") ?? "").split(" ").map((sc) => `<label><input type="checkbox" name="scope" value="${sc}" checked> ${sc.split("/").pop()}</label><br>`).join("");
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(`<!doctype html><title>Stub Google</title><h1>Stub Google consent (test only)</h1><form action="/google/approve">${hidden}${boxes}<button>Allow</button></form><a href="${p.get("redirect_uri")}?error=access_denied&state=${encodeURIComponent(p.get("state") ?? "")}">Cancel</a>`);
    }
    if (url.pathname === "/google/approve") {
      const code = "gc-" + randomBytes(8).toString("hex");
      const scopes = url.searchParams.getAll("scope");
      gCodes.set(code, { scopes, challenge: url.searchParams.get("code_challenge") });
      const r = new URL(url.searchParams.get("redirect_uri"));
      r.searchParams.set("code", code); r.searchParams.set("state", url.searchParams.get("state")); r.searchParams.set("scope", scopes.join(" "));
      res.writeHead(302, { location: r.toString() }); return res.end();
    }
    if (url.pathname === "/google/token" && req.method === "POST") {
      const b = Object.fromEntries(new URLSearchParams(await readBody(req)));
      if (b.client_id !== "test-client" || b.client_secret !== "test-secret") return send(res, 401, { error: "invalid_client" });
      if (b.grant_type === "authorization_code") {
        const c = gCodes.get(b.code); gCodes.delete(b.code);
        if (!c || createHash("sha256").update(b.code_verifier ?? "").digest("base64url") !== c.challenge) return send(res, 400, { error: "invalid_grant" });
        const access = "gat-" + randomBytes(8).toString("hex"), refresh = "grt-" + randomBytes(8).toString("hex");
        gAccess.set(access, { scopes: c.scopes }); gRefresh.set(refresh, { scopes: c.scopes, revoked: false });
        return send(res, 200, { access_token: access, refresh_token: refresh, expires_in: 3599, token_type: "Bearer", scope: c.scopes.join(" ") });
      }
      if (b.grant_type === "refresh_token") {
        const r = gRefresh.get(b.refresh_token);
        if (!r || r.revoked || gFailRefresh) return send(res, 400, { error: "invalid_grant", error_description: "Token has been expired or revoked." });
        const access = "gat-" + randomBytes(8).toString("hex"); gAccess.set(access, { scopes: r.scopes });
        return send(res, 200, { access_token: access, expires_in: 3599, token_type: "Bearer", scope: r.scopes.join(" ") });
      }
      return send(res, 400, { error: "unsupported_grant_type" });
    }
    if (url.pathname === "/google/revoke" && req.method === "POST") {
      const t = new URLSearchParams(await readBody(req)).get("token");
      if (gRefresh.has(t)) gRefresh.get(t).revoked = true;
      gRevoked.push(t); return send(res, 200, {});
    }
    if (url.pathname.startsWith("/google/calendar/")) {
      const tok = gAccess.get((req.headers.authorization ?? "").replace(/^Bearer /, ""));
      if (!tok) return send(res, 401, { error: { code: 401 } });
      if (url.pathname === "/google/calendar/users/me/calendarList") {
        if (!tok.scopes.includes(SCOPE_LIST)) return send(res, 403, { error: { code: 403 } });
        return send(res, 200, { items: gCalendars });
      }
      const m = /^\/google\/calendar\/calendars\/([^/]+)\/events$/.exec(url.pathname);
      if (m) {
        if (!tok.scopes.includes(SCOPE_EVENTS)) return send(res, 403, { error: { code: 403 } });
        const id = decodeURIComponent(m[1]) === "primary" ? "primary@example.test" : decodeURIComponent(m[1]);
        const from = new Date(url.searchParams.get("timeMin")).getTime(), to = new Date(url.searchParams.get("timeMax")).getTime();
        const items = (gEvents[id] ?? []).filter((e) => {
          const s = new Date(e.start.dateTime ?? e.start.date).getTime(), en = new Date(e.end.dateTime ?? e.end.date).getTime();
          return en > from && s < to;
        });
        return send(res, 200, { items });
      }
    }


    // ---- Storage stand-in: metadata in storage.objects (policies enforced), bytes in memory ----
    const pub = /^\/storage\/v1\/object\/public\/([a-z]+)\/(.+)$/.exec(url.pathname);
    if (pub && req.method === "GET") {
      const f = files.get(`${pub[1]}/${decodeURIComponent(pub[2])}`);
      const bucket = (await pool.query("select public from storage.buckets where id = $1", [pub[1]])).rows[0];
      if (!f || !bucket?.public) return send(res, 404, { message: "not found" });
      res.writeHead(200, { "content-type": f.type, "content-length": f.body.length, "access-control-allow-origin": "*" });
      return res.end(f.body);
    }
    const lst = /^\/storage\/v1\/object\/list\/([a-z]+)$/.exec(url.pathname);
    if (lst && req.method === "POST") {
      const sub = subFromAuth(req);
      const { prefix = "" } = JSON.parse((await readBody(req)) || "{}");
      const rows = await asRole(sub, async (c) => (await c.query(
        "select id, name, created_at from storage.objects where bucket_id = $1 and name like $2 order by name", [lst[1], `${prefix.replace(/\/$/, "")}/%`])).rows);
      return send(res, 200, rows.map((r) => ({ id: r.id, name: r.name.split("/").pop(), created_at: r.created_at, metadata: {} })));
    }
    const del = /^\/storage\/v1\/object\/([a-z]+)$/.exec(url.pathname);
    if (del && req.method === "DELETE") {
      const sub = subFromAuth(req);
      const { prefixes = [] } = JSON.parse((await readBody(req)) || "{}");
      const rows = await asRole(sub, async (c) => (await c.query(
        "delete from storage.objects where bucket_id = $1 and name = any($2) returning name", [del[1], prefixes])).rows);
      for (const r of rows) files.delete(`${del[1]}/${r.name}`);
      return send(res, 200, rows.map((r) => ({ name: r.name })));
    }
    const up = /^\/storage\/v1\/object\/([a-z]+)\/(.+)$/.exec(url.pathname);
    if (up && (req.method === "POST" || req.method === "PUT")) {
      const sub = subFromAuth(req);
      const chunks = []; for await (const ch of req) chunks.push(ch);
      const body = Buffer.concat(chunks);
      const name = decodeURIComponent(up[2]);
      const bucket = (await pool.query("select * from storage.buckets where id = $1", [up[1]])).rows[0];
      const type = req.headers["content-type"] ?? "application/octet-stream";
      if (!bucket) return send(res, 404, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
      if (bucket.file_size_limit && body.length > Number(bucket.file_size_limit)) return send(res, 413, { statusCode: "413", error: "Payload too large", message: "too large" });
      if (bucket.allowed_mime_types && !bucket.allowed_mime_types.includes(type)) return send(res, 415, { statusCode: "415", error: "invalid_mime_type", message: "mime type not allowed" });
      try {
        const row = await asRole(sub, async (c) => (await c.query(
          "insert into storage.objects (bucket_id, name) values ($1, $2) returning id", [up[1], name])).rows[0]);
        files.set(`${up[1]}/${name}`, { type, body });
        return send(res, 200, { Id: row.id, Key: `${up[1]}/${name}` });
      } catch (e) {
        return send(res, e.code === "42501" ? 403 : 400, { statusCode: e.code === "42501" ? "403" : "400", error: "Unauthorized", message: e.message });
      }
    }

    // ---- auth ----
    if (url.pathname === "/auth/v1/authorize") {
      const { rows } = await pool.query("select id, raw_user_meta_data->>'name' as name from auth.users where email like '%@example.test' order by email");
      const redirect = url.searchParams.get("redirect_to");
      const links = rows.map((u) => `<li><a href="/__login?user=${u.id}&redirect_to=${encodeURIComponent(redirect)}">Sign in as ${u.name}</a></li>`).join("");
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(`<!doctype html><title>Stub LinkedIn</title><h1>Stub LinkedIn (test only)</h1><ul>${links}</ul><a href="${redirect}${redirect.includes("?") ? "&" : "?"}error=access_denied&error_description=cancelled">Cancel</a>`);
    }
    if (url.pathname === "/__login") {
      const code = randomBytes(12).toString("hex");
      codes.set(code, url.searchParams.get("user"));
      const r = new URL(url.searchParams.get("redirect_to"));
      r.searchParams.set("code", code);
      res.writeHead(302, { location: r.toString() });
      return res.end();
    }
    if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "pkce") {
      const body = JSON.parse((await readBody(req)) || "{}");
      const uid = codes.get(body.auth_code);
      if (!uid || !body.code_verifier) return send(res, 400, { error: "invalid_grant", error_description: "bad code" });
      codes.delete(body.auth_code);
      const user = await userJson(uid);
      return send(res, 200, { access_token: makeJwt(uid), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: randomBytes(16).toString("hex"), user });
    }
    if (url.pathname === "/auth/v1/.well-known/jwks.json") return send(res, 200, { keys: [JWK] });
    if (url.pathname === "/auth/v1/user") {
      const sub = subFromAuth(req);
      const user = sub && (await userJson(sub));
      return user ? send(res, 200, user) : send(res, 401, { code: 401, msg: "invalid JWT" });
    }
    if (url.pathname === "/auth/v1/logout") return send(res, 204);

    // ---- REST ----
    const sub = subFromAuth(req);
    const rpc = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url.pathname);
    if (rpc) {
      const name = rpc[1];
      if (failNext.has(name)) { failNext.delete(name); return send(res, 503, { message: "simulated failure" }); }
      const args = JSON.parse((await readBody(req)) || "{}");
      const keys = Object.keys(args);
      // Like PostgREST: arrays of scalars become Postgres arrays; other objects/arrays are JSON.
      const params = keys.map((k) => {
        const v = args[k];
        if (Array.isArray(v) && v.every((x) => x === null || typeof x !== "object")) return v;
        return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
      });
      const call = `public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})`;
      const setFn = await isSetReturning(name);
      const rows = await asRole(sub, async (c) => (await c.query(setFn ? `select * from ${call}` : `select ${call} as v`, params)).rows);
      return send(res, 200, setFn ? rows : rows[0]?.v ?? null);
    }
    const table = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname);
    if (table && req.method === "GET") {
      const cols = (url.searchParams.get("select") ?? "*").split(",").map((s) => s.trim()).filter((s) => /^[a-z_*]+$/.test(s));
      const rows = await asRole(sub, async (c) => (await c.query(`select ${cols.join(", ")} from public.${table[1]}`)).rows);
      return send(res, 200, rows);
    }
    return send(res, 404, { message: "not implemented in stub" });
  } catch (e) {
    if (process.env.STUB_DEBUG) console.error(req.method, url.pathname, e.code, e.message);
    const status = e.code === "42501" ? 403 : e.code === "28000" ? 401 : 400;
    return send(res, status, { code: e.code, message: e.message });
  }
}).listen(PORT, () => console.log(`supabase-stub listening on :${PORT}`));
