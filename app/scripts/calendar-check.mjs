// Google Calendar journeys against the test-only stub (see e2e-signed-in.sh). Fictional data only.
import { chromium } from "playwright";
import pg from "pg";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL, STUB = process.env.STUB_URL;
pg.types.setTypeParser(1184, (v) => new Date(v.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00")));
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const ROBIN = "00000000-0000-4000-8000-0000000000f1";
const pid = async (uid) => (await q("select public_id from public.profiles where user_id = $1", [uid]))[0].public_id;
const priya = await pid("00000000-0000-4000-8000-0000000000d1");
const morgan = await pid("00000000-0000-4000-8000-0000000000d2");
const kai = await pid("00000000-0000-4000-8000-0000000000d3");
const alex = await pid("00000000-0000-4000-8000-0000000000a1");
const ctxOf = async (subjectPid) => (await q(
  "select s.context_label, s.context_source from public.saved_people s join public.profiles p on p.user_id = s.subject_id where s.saver_id = $1 and p.public_id = $2",
  [ROBIN, subjectPid]))[0];

const iso = (ms) => new Date(Date.now() + ms).toISOString();
const H = 3600_000, D = 24 * H;
const event = (id, summary, startMs, endMs, extra = {}) => ({ id, status: "confirmed", summary, start: { dateTime: iso(startMs) }, end: { dateTime: iso(endMs) }, ...extra });
const setEvents = (byCal) => fetch(`${STUB}/__test/google/events`, { method: "POST", body: JSON.stringify(byCal) });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const steps = [];
const step = async (name, fn) => {
  try { await fn(); steps.push(["ok  ", name]); }
  catch (e) { steps.push(["FAIL", `${name}: ${e.message.split("\n")[0]}`]); await page.screenshot({ path: "/tmp/shots/calendar-fail.png", fullPage: true }).catch(() => {}); throw e; }
};
const connect = async (opts = {}) => {
  await page.goto(`${BASE}/me`);
  await page.getByRole("link", { name: /(Connect|Reconnect) Google Calendar/ }).first().click();
  await page.waitForURL(/\/google\/auth/);
  if (opts.cancel) return page.getByRole("link", { name: "Cancel" }).click();
  if (opts.untickEvents) await page.getByLabel("calendar.events.readonly").uncheck();
  await page.getByRole("button", { name: "Allow" }).click();
};

try {
  await step("sign in; Calendar is a separate optional card beside a working QR", async () => {
    await page.goto(`${BASE}/sign-in?next=/me`);
    await page.getByRole("button", { name: "Continue with LinkedIn" }).click();
    await page.getByRole("link", { name: "Sign in as Robin Taylor" }).click();
    await page.waitForURL(`${BASE}/me`);
    await page.locator(".qr svg").waitFor();
    await page.getByRole("link", { name: "Connect Google Calendar" }).waitFor();
  });

  await step("decline keeps everything else working", async () => {
    await connect({ cancel: true });
    await page.waitForURL(/calendar=declined/);
    await page.getByText("Calendar isn't connected. Everything else works").waitFor();
    await page.locator(".qr svg").waitFor();
    assert.equal((await q("select count(*)::int n from public.calendar_connections where user_id = $1", [ROBIN]))[0].n, 0);
  });

  await step("partial grant (events unticked) stores no token and explains", async () => {
    await connect({ untickEvents: true });
    await page.getByText("needs permission to view events").waitFor();
    const row = (await q("select status, refresh_token_enc from public.calendar_connections where user_id = $1", [ROBIN]))[0];
    assert.equal(row.status, "partial");
    assert.equal(row.refresh_token_enc, null);
    assert.ok((await (await fetch(`${STUB}/__test/google/revoked`)).json()).length >= 1, "partial grant revoked at Google");
  });

  await step("full grant: connected, token encrypted, main calendar selected", async () => {
    await connect();
    await page.getByText("Google Calendar connected.").waitFor();
    await page.getByText("Connected as robin@example.test").waitFor();
    await page.getByRole("checkbox", { name: /robin@example.test \(main\)/ }).waitFor();
    assert.ok(await page.getByRole("checkbox", { name: /robin@example.test \(main\)/ }).isChecked());
    const row = (await q("select status, refresh_token_enc, selected_calendar_ids from public.calendar_connections where user_id = $1", [ROBIN]))[0];
    assert.equal(row.status, "connected");
    assert.match(row.refresh_token_enc, /^v1\./);
    assert.ok(!row.refresh_token_enc.includes("grt-"), "refresh token not stored in clear");
    assert.deepEqual(row.selected_calendar_ids, ["primary@example.test"]);
  });

  await step("choose calendars", async () => {
    await page.getByRole("checkbox", { name: "Team events" }).check();
    await page.waitForTimeout(500);
    assert.deepEqual((await q("select selected_calendar_ids from public.calendar_connections where user_id = $1", [ROBIN]))[0].selected_calendar_ids,
      ["primary@example.test", "team-events@example.test"]);
  });

  await step("one matching event becomes private 'Likely met at' context", async () => {
    await setEvents({ "primary@example.test": [event("e1", "Product Meetup London", -1 * H, 2 * H), event("e0", "Dentist", -30 * H, -29 * H)] });
    await page.goto(`${BASE}/p/${priya}`);
    await page.getByText("Likely met at").waitFor();
    await page.getByText("Product Meetup London").waitFor();
    assert.deepEqual(await ctxOf(priya), { context_label: "Product Meetup London", context_source: "calendar_auto" });
  });

  await step("correct it inline, remove it, undo", async () => {
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Where did you meet?").fill("Coffee queue at the meetup");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Met at").waitFor();
    assert.deepEqual(await ctxOf(priya), { context_label: "Coffee queue at the meetup", context_source: "manual" });
    await page.getByRole("button", { name: "Remove" }).click();
    await page.getByText("Removed.").waitFor();
    assert.equal((await ctxOf(priya)).context_label, null);
    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByText("Coffee queue at the meetup").waitFor();
    assert.deepEqual(await ctxOf(priya), { context_label: "Coffee queue at the meetup", context_source: "manual" }, "undo restores");
    await page.getByRole("button", { name: "Remove" }).click();
    await page.getByText("Removed.").waitFor();
    await page.reload();
    await page.getByRole("button", { name: "+ Add where you met" }).waitFor();
    assert.equal((await ctxOf(priya)).context_label, null, "a removed context is not re-inferred on reload");
  });

  await step("overlapping events: the person chooses", async () => {
    await setEvents({
      "primary@example.test": [event("e1", "Product Meetup London", -1 * H, 2 * H)],
      "team-events@example.test": [event("t1", "Design systems talk", -0.5 * H, 0.5 * H)],
    });
    await page.goto(`${BASE}/p/${morgan}`);
    await page.getByText("Where did you meet? Your calendar had a few things on.").waitFor();
    await page.getByRole("button", { name: "Design systems talk" }).click();
    await page.getByText("Met at").waitFor();
    assert.deepEqual(await ctxOf(morgan), { context_label: "Design systems talk", context_source: "calendar_chosen" });
  });

  await step("no matching event: manual fallback", async () => {
    await setEvents({});
    await page.goto(`${BASE}/p/${alex}`);
    await page.getByRole("button", { name: "+ Add where you met" }).click();
    await page.getByLabel("Where did you meet?").fill("Founders breakfast");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Founders breakfast").waitFor();
  });

  await step("Join me ideas: two shown, private excluded, dismiss + undo, confirm before use", async () => {
    await setEvents({
      "primary@example.test": [
        event("u1", "Product Meetup London", 6 * D, 6 * D + 2 * H, { location: "Shoreditch" }),
        event("u2", "1:1 with manager", 1 * D, 1 * D + H, { visibility: "private" }),
        event("u3", "AI Founders Night", 9 * D, 9 * D + 3 * H),
      ],
      "team-events@example.test": [event("u4", "Design Systems London", 12 * D, 12 * D + 2 * H)],
    });
    await page.goto(`${BASE}/me`);
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.getByRole("link", { name: "Choose from calendar ideas ↓" }).waitFor();
    await page.getByText("Product Meetup London").waitFor();
    assert.equal(await page.getByText("1:1 with manager").count(), 0, "private events never suggested");
    assert.equal(await page.locator("#calendar-ideas .card").count(), 2, "two at first");
    await page.getByRole("button", { name: "Show 1 more ↓" }).click();
    assert.equal(await page.locator("#calendar-ideas .card").count(), 3);
    await page.getByRole("button", { name: "Dismiss AI Founders Night" }).click();
    await page.getByText("Idea dismissed.").waitFor();
    assert.equal(await page.getByText("AI Founders Night").count(), 0);
    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByText("AI Founders Night").waitFor();
    await page.locator("#calendar-ideas .card", { hasText: "Product Meetup London" }).getByRole("button", { name: "Review for Join me" }).click();
    const use = page.getByRole("button", { name: "Use for Join me" });
    assert.ok(await use.isDisabled(), "needs confirmation that the event is public");
    await page.getByLabel("Public wording").fill("Join me at Product Meetup London next week?");
    await page.getByLabel("This event is public and open to guests").check();
    await use.click();
    await page.getByText("Added to Join me. Save changes to put it on your profile.").waitFor();
    // Nothing public yet
    let pub = await (await fetch(`${STUB}/rest/v1/rpc/get_public_profile`, { method: "POST", body: JSON.stringify({ p_public_id: await pid(ROBIN) }) })).json();
    assert.equal(pub.actions.find((a) => a.kind === "join_me").prompt, "Coffee and a catch-up?");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByRole("button", { name: "Edit profile" }).waitFor();
    pub = await (await fetch(`${STUB}/rest/v1/rpc/get_public_profile`, { method: "POST", body: JSON.stringify({ p_public_id: await pid(ROBIN) }) })).json();
    assert.equal(pub.actions.find((a) => a.kind === "join_me").prompt, "Join me at Product Meetup London next week?");
    assert.ok(!JSON.stringify(pub).includes("Shoreditch") && !JSON.stringify(pub).includes("Design systems talk"), "no raw calendar data public");
  });

  await step("expired access: reconnect prompt, everything else unaffected, selection kept", async () => {
    await fetch(`${STUB}/__test/google/fail-refresh?on=1`);
    await setEvents({ "primary@example.test": [event("e9", "Climate Tech Social", -1 * H, 1 * H)] });
    await page.goto(`${BASE}/p/${kai}`);
    await page.getByText("Calendar needs reconnecting").waitFor();
    assert.equal((await q("select status from public.calendar_connections where user_id = $1", [ROBIN]))[0].status, "needs_reconnect");
    await page.goto(`${BASE}/people`);
    assert.ok((await page.locator(".person").count()) >= 4, "People unaffected");
    await page.goto(`${BASE}/me`);
    await page.locator(".qr svg").waitFor();
    await page.getByText("access has expired or was removed").waitFor();
    await fetch(`${STUB}/__test/google/fail-refresh?on=0`);
    await connect();
    await page.getByText("Google Calendar connected.").waitFor();
    assert.deepEqual((await q("select selected_calendar_ids from public.calendar_connections where user_id = $1", [ROBIN]))[0].selected_calendar_ids,
      ["primary@example.test", "team-events@example.test"], "selection kept on reconnect");
    await page.goto(`${BASE}/p/${kai}`);
    await page.getByText("Climate Tech Social").waitFor();
    assert.equal((await ctxOf(kai)).context_source, "calendar_auto");
  });

  await step("disconnect revokes, forgets the token and removes only inferred context", async () => {
    await page.goto(`${BASE}/me`);
    await page.getByRole("button", { name: "Disconnect Google Calendar" }).click();
    await page.getByRole("link", { name: "Connect Google Calendar" }).waitFor();
    assert.equal((await q("select count(*)::int n from public.calendar_connections where user_id = $1", [ROBIN]))[0].n, 0);
    assert.equal((await ctxOf(kai)).context_label, null, "inferred context removed");
    assert.equal((await ctxOf(morgan)).context_label, "Design systems talk", "chosen context kept");
    const revoked = await (await fetch(`${STUB}/__test/google/revoked`)).json();
    assert.ok(revoked.some((t) => t.startsWith("grt-")), "refresh token revoked at Google");
  });

  await step("account isolation: other accounts can't see Robin's calendar state or context", async () => {
    const c = await db.connect();
    try {
      await c.query("begin"); await c.query("set local role authenticated");
      await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: "00000000-0000-4000-8000-0000000000d2" })]);
      assert.equal((await c.query("select count(*)::int n from public.saved_people where context_label is not null")).rows[0].n, 0);
      assert.equal((await c.query("select count(*)::int n from public.calendar_connections")).rows[0].n, 0);
      await c.query("rollback");
    } finally { c.release(); }
  });

  assert.deepEqual(errors, [], "no page errors");
} finally {
  for (const [s, n] of steps) console.log(`${s} ${n}`);
  await browser.close();
  await db.end();
}
