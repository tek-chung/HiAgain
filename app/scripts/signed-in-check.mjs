// Signed-in journeys against the test-only Supabase stub (see e2e-signed-in.sh).
// Verifies through the browser AND directly in the database.
import { chromium } from "playwright";
import pg from "pg";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL;
const STUB = process.env.STUB_URL;
pg.types.setTypeParser(1184, (v) => new Date(v.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00")));
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const ALEX = "00000000-0000-4000-8000-0000000000a1", JAMIE = "00000000-0000-4000-8000-0000000000b1", SAM = "00000000-0000-4000-8000-0000000000c1";
const pid = async (uid) => (await q("select public_id from public.profiles where user_id = $1", [uid]))[0].public_id;
const alexId = await pid(ALEX), jamieId = await pid(JAMIE);

async function waitValue(locator, expected, ms = 8000) {
  const end = Date.now() + ms; let v;
  while (Date.now() < end) { v = await locator.inputValue().catch(() => undefined); if (v === expected) return; await new Promise((r) => setTimeout(r, 100)); }
  assert.equal(v, expected);
}
async function signInOnStub(page, name) {
  await page.waitForURL(/\/auth\/v1\/authorize/);
  await page.getByRole("link", { name: `Sign in as ${name}` }).click();
}

const browser = await chromium.launch();
const steps = [];
const step = async (name, fn) => { try { await fn(); steps.push(["ok  ", name]); } catch (e) { steps.push(["FAIL", `${name}: ${e.message.split("\n")[0]}`]); if (globalThis.__page) { await globalThis.__page.screenshot({ path: "/tmp/shots/fail.png", fullPage: true }); } throw e; } };

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  globalThis.__page = page;
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  let guestAlexTime;

  await step("guest scans Alex and Jamie; saves are local only", async () => {
    await page.goto(`${BASE}/p/${alexId}`);
    await page.getByText("Saved on this browser. Sign in any time").waitFor();
    guestAlexTime = await page.locator(".saved-context p").first().textContent();
    await page.locator("summary", { hasText: "Notes" }).click();
    await page.getByRole("textbox", { name: "Private notes" }).fill("Met at the product meetup");
    await page.getByRole("button", { name: "Save note" }).click();
    await page.getByText("Saved.", { exact: true }).waitFor();
    await page.goto(`${BASE}/p/${jamieId}`);
    await page.locator(".saved-context").waitFor();
    await page.locator("summary", { hasText: "Notes" }).click();
    await page.getByRole("textbox", { name: "Private notes" }).fill("Talk about onboarding");
    await page.getByRole("button", { name: "Save note" }).click();
    await page.getByText("Saved.", { exact: true }).waitFor();
    assert.equal((await q("select count(*)::int n from public.saved_people where saver_id = $1", [SAM]))[0].n, 1, "server untouched by guest saves");
  });

  await step("cancelled sign-in keeps the draft", async () => {
    await page.goto(`${BASE}/p/${alexId}`);
    await page.getByRole("button", { name: /Answer a question/ }).click();
    await page.getByPlaceholder("Write your answer").fill("How do you run customer interviews?");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Sign in with LinkedIn and send" }).click();
    await page.waitForURL(/\/auth\/v1\/authorize/);
    await page.getByRole("link", { name: "Cancel" }).click();
    await page.getByText("Sign-in was cancelled. Your draft is still here.").waitFor();
    await waitValue(page.getByPlaceholder("Write your answer"), "How do you run customer interviews?");
  });

  await step("sign in from an action resumes and sends the draft in the right account", async () => {
    await page.getByRole("button", { name: "Sign in with LinkedIn and send" }).click();
    await signInOnStub(page, "Sam Patel");
    await page.waitForURL(`${BASE}/p/${alexId}`);
    await page.locator(".badge", { hasText: "Answered" }).waitFor();
    await page.getByText("How do you run customer interviews?").waitFor();
    const rows = await q("select sender_id, body, kind from public.contributions");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sender_id, SAM);
    assert.equal(rows[0].kind, "question");
  });

  await step("reload keeps one answer; a second answer is impossible", async () => {
    await page.reload();
    await page.locator(".badge", { hasText: "Answered" }).waitFor();
    assert.equal((await q("select count(*)::int n from public.contributions"))[0].n, 1);
  });

  await step("import guest saves: earliest time kept, empty note filled, conflict offered", async () => {
    await page.goto(`${BASE}/people`);
    await page.getByText("You saved 2 people on this browser").waitFor();
    await page.getByText("Add them to People for Sam Patel").waitFor();
    await page.getByRole("button", { name: "Add to my account" }).click();
    await page.getByText(/1 with different notes to check below/).waitFor();
    await page.getByText("already has a different note in your account").waitFor();
    const alex = (await q("select saved_at, note, source from public.saved_people where saver_id = $1 and subject_id = $2", [SAM, ALEX]))[0];
    assert.equal(alex.note, "Met at the product meetup");
    const shown = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(alex.saved_at);
    assert.equal(`Saved ${shown} · this browser`, guestAlexTime, "account keeps the original guest save time");
    assert.equal((await q("select note from public.saved_people where saver_id = $1 and subject_id = $2", [SAM, JAMIE]))[0].note, "Designer from the climate meetup", "existing note not overwritten");
  });

  await step("resolve conflict with Keep both", async () => {
    await page.getByRole("button", { name: "Keep both" }).click();
    await page.getByText("already has a different note in your account").waitFor({ state: "detached" });
    assert.equal((await q("select note from public.saved_people where saver_id = $1 and subject_id = $2", [SAM, JAMIE]))[0].note,
      "Designer from the climate meetup\n\nTalk about onboarding");
    const local = await page.evaluate(() => new Promise((r) => { const o = indexedDB.open("hi-again"); o.onsuccess = () => { const g = o.result.transaction("guestSaves").objectStore("guestSaves").count(); g.onsuccess = () => r(g.result); }; }));
    assert.equal(local, 0, "local guest saves released only after acknowledgement");
    await page.reload();
    assert.equal(await page.locator(".person").count(), 2);
  });

  await step("sign out clears this account's drafts; switching account isolates data", async () => {
    // leave an unsent draft as Sam
    await page.goto(`${BASE}/p/${alexId}`);
    await page.getByRole("button", { name: /Ask for feedback/ }).click();
    await page.getByPlaceholder("What would you like feedback on?").fill("Sam's private unsent draft");
    await page.waitForTimeout(500);
    await page.goto(`${BASE}/me`);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(`${BASE}/`);
    const drafts = await page.evaluate(() => new Promise((r) => { const o = indexedDB.open("hi-again"); o.onsuccess = () => { const g = o.result.transaction("drafts").objectStore("drafts").getAll(); g.onsuccess = () => r(g.result); }; }));
    assert.equal(drafts.filter((d) => d.scope === SAM).length, 0, "Sam's drafts removed");
    await page.goto(`${BASE}/sign-in?next=/people`);
    await page.getByRole("button", { name: "Continue with LinkedIn" }).click();
    await signInOnStub(page, "Jamie Chen");
    await page.waitForURL(`${BASE}/people`);
    await page.getByRole("heading", { name: "People" }).waitFor();
    await page.waitForTimeout(500);
    // Sam saved Alex and Jamie; none of that may appear for Jamie. (Jamie may see the anonymous guest who scanned her.)
    assert.equal(await page.locator(".person", { hasText: "Alex Morgan" }).count(), 0, "none of Sam's saves");
    assert.equal(await page.getByText("Designer from the climate meetup").count(), 0, "none of Sam's notes");
    await page.goto(`${BASE}/p/${alexId}`);
    await page.getByRole("button", { name: /Ask for feedback/ }).click();
    await waitValue(page.getByPlaceholder("What would you like feedback on?"), "");
    assert.equal(await page.locator(".badge").count(), 0, "Jamie sees no completion badges from Sam");
  });

  await step("Jamie answers directly; contributions are participant-only", async () => {
    await page.getByRole("button", { name: /Answer a question/ }).click();
    await page.getByPlaceholder("Write your answer").fill("Your hiring process");
    await page.getByRole("button", { name: "Send answer" }).click();
    await page.locator(".badge", { hasText: "Answered" }).waitFor();
    const c = await db.connect();
    try {
      await c.query("begin"); await c.query("set local role authenticated");
      await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: JAMIE })]);
      assert.equal((await c.query("select count(*)::int n from public.contributions")).rows[0].n, 1, "Jamie reads only her own contribution");
      await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ALEX })]);
      assert.equal((await c.query("select count(*)::int n from public.contributions")).rows[0].n, 2, "Alex (recipient) reads both");
      await c.query("rollback");
    } finally { c.release(); }
  });

  await step("owner sees own profile as a preview and is never saved", async () => {
    await page.goto(`${BASE}/me`);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(`${BASE}/`);
    await page.goto(`${BASE}/sign-in?next=/me`);
    await page.getByRole("button", { name: "Continue with LinkedIn" }).click();
    await signInOnStub(page, "Alex Morgan");
    await page.waitForURL(`${BASE}/me`);
    await page.locator(".qr svg").waitFor();
    const before = (await q("select count(*)::int n from public.saved_people where saver_id = $1 or subject_id = $1", [ALEX]))[0].n;
    await page.getByRole("link", { name: "See what people see" }).click();
    await page.getByText("This is your profile").waitFor();
    await page.waitForTimeout(500);
    assert.equal((await q("select count(*)::int n from public.saved_people where saver_id = $1 or subject_id = $1", [ALEX]))[0].n, before, "own visit adds nothing");
    assert.equal(await page.getByTestId("scan-notice").count(), 0, "no scan notice on your own profile");
  });

  await step("inline profile edit with LinkedIn validation", async () => {
    await page.goto(`${BASE}/me`);
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.getByLabel("LinkedIn profile link (optional)").fill("https://evil.example/in/alex");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByText("That doesn't look like a LinkedIn link.").waitFor();
    await page.getByLabel("LinkedIn profile link (optional)").fill("uk.linkedin.com/in/alex-morgan-demo?trk=abc");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByRole("button", { name: "Edit profile" }).waitFor();
    assert.equal((await q("select linkedin_url from public.profiles where user_id = $1", [ALEX]))[0].linkedin_url, "https://www.linkedin.com/in/alex-morgan-demo");
  });

  await step("interrupted import keeps local saves; retry succeeds without duplicates", async () => {
    // Kai has no connection to Alex, so the pair starts empty.
    const KAI = "00000000-0000-4000-8000-0000000000d3";
    const kaiId = (await q("select public_id from public.profiles where user_id = $1", [KAI]))[0].public_id;
    const pair = async () => (await q("select count(*)::int n from public.saved_people where saver_id = $1 and subject_id = $2", [ALEX, KAI]))[0].n;
    const ctx2 = await browser.newContext({ viewport: { width: 320, height: 700 } });
    const p2 = await ctx2.newPage();
    await p2.goto(`${BASE}/p/${kaiId}`);
    await p2.getByText("Saved on this browser. Sign in any time").waitFor();
    await fetch(`${STUB}/__test/fail?fn=import_guest_saves`);
    await p2.goto(`${BASE}/sign-in?next=/me`);
    await p2.getByRole("button", { name: "Continue with LinkedIn" }).click();
    await signInOnStub(p2, "Alex Morgan");
    await p2.waitForURL(`${BASE}/me`);
    await p2.getByRole("button", { name: "Add to my account" }).click();
    await p2.getByText(/Couldn't reach Hi Again. Nothing was lost/).waitFor();
    assert.equal(await pair(), 0);
    const local = await p2.evaluate(() => new Promise((r) => { const o = indexedDB.open("hi-again"); o.onsuccess = () => { const g = o.result.transaction("guestSaves").objectStore("guestSaves").count(); g.onsuccess = () => r(g.result); }; }));
    assert.equal(local, 1, "local save kept after the failure");
    await p2.getByRole("button", { name: "Try again" }).click();
    await p2.getByText(/Added 1 person/).waitFor();
    assert.equal(await pair(), 1);
    await p2.screenshot({ path: "/tmp/shots/import-done-320.png", fullPage: true });
    await ctx2.close();
  });

  await step("anonymous direct API calls are denied", async () => {
    const r = await fetch(`${STUB}/rest/v1/rpc/my_saved_people`, { method: "POST", headers: { authorization: "Bearer sb_publishable_test_only" }, body: "{}" });
    assert.equal(r.status, 403);
    const t = await fetch(`${STUB}/rest/v1/saved_people?select=note`, { headers: { authorization: "Bearer sb_publishable_test_only" } });
    assert.equal(t.status, 403);
  });

  assert.deepEqual(errors, [], "no page errors");
} finally {
  for (const [s, n] of steps) console.log(`${s} ${n}`);
  await browser.close();
  await db.end();
}
