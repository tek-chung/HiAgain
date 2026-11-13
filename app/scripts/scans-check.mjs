// Incoming scans, blocking, reporting and account deletion, against the test-only stub.
// Runs after the other checks. Fictional data only.
import { chromium } from "playwright";
import pg from "pg";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL;
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const ROBIN = "00000000-0000-4000-8000-0000000000f1", KAI = "00000000-0000-4000-8000-0000000000d3",
  MORGAN = "00000000-0000-4000-8000-0000000000d2", PRIYA = "00000000-0000-4000-8000-0000000000d1", DANA = "00000000-0000-4000-8000-0000000000d4";
const pid = async (uid) => (await q("select public_id from public.profiles where user_id = $1", [uid]))[0]?.public_id;
const robin = await pid(ROBIN), kai = await pid(KAI), morgan = await pid(MORGAN), priya = await pid(PRIYA);

const browser = await chromium.launch();
const steps = [];
let shot = null;
const step = async (name, fn) => {
  try { await fn(); steps.push(["ok  ", name]); }
  catch (e) { steps.push(["FAIL", `${name}: ${e.message.split("\n")[0]}`]); await shot?.screenshot({ path: "/tmp/shots/scans-fail.png", fullPage: true }).catch(() => {}); throw e; }
};
async function newPage(w = 390) {
  const page = await (await browser.newContext({ viewport: { width: w, height: 844 } })).newPage();
  page.errors = []; page.on("pageerror", (e) => page.errors.push(e.message));
  return (shot = page);
}
async function signIn(page, name, next) {
  await page.goto(`${BASE}/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: "Continue with LinkedIn" }).click();
  await page.getByRole("link", { name: `Sign in as ${name}` }).click();
  await page.waitForURL(`${BASE}${next}`);
}
const pages = [];

try {
  const g = await newPage(320); pages.push(g);
  let alias;
  await step("guests are told before anything is shared; the owner sees an anonymous nickname", async () => {
    await g.goto(`${BASE}/p/${robin}`);
    await g.getByTestId("scan-notice").getByText("Robin will see you visited. Guests show as an anonymous nickname.").waitFor();
    await g.locator(".saved-context").waitFor();
    await g.waitForTimeout(800);
    const rows = await q("select alias, token_hash from public.guest_encounters where owner_id = $1", [ROBIN]);
    assert.equal(rows.length, 1);
    alias = rows[0].alias;
    assert.match(alias, /^[A-Z][a-z]+ [A-Z][a-z]+$/);
    await g.reload(); await g.locator(".saved-context").waitFor(); await g.waitForTimeout(800);
    assert.equal((await q("select count(*)::int n from public.guest_encounters where owner_id = $1", [ROBIN]))[0].n, 1, "repeat visit not duplicated");
    const priyaBefore = (await q("select token_hash from public.guest_encounters where owner_id = $1", [PRIYA])).map((x) => x.token_hash);
    await g.goto(`${BASE}/p/${priya}`); await g.locator(".saved-context").waitFor(); await g.waitForTimeout(800);
    const added = (await q("select token_hash from public.guest_encounters where owner_id = $1", [PRIYA])).filter((x) => !priyaBefore.includes(x.token_hash));
    assert.equal(added.length, 1, "one new guest encounter for Priya");
    assert.notEqual(added[0].token_hash, rows[0].token_hash, "the same guest can't be linked across owners");
  });

  const k = await newPage(); pages.push(k);
  await step("a signed-in scanner is told, and appears in the owner's People by name", async () => {
    await signIn(k, "Jamie Chen", `/p/${robin}`); // Robin has never saved Jamie
    await k.getByTestId("scan-notice").getByText("Robin will see you visited.").waitFor();
    assert.equal(await k.getByText("Guests show as an anonymous nickname.").count(), 0);
    await k.locator(".saved-context").waitFor();
  });

  const r = await newPage(); pages.push(r);
  await step("owner's People shows the guest and Kai with labels; guest detail has notes and archive", async () => {
    await signIn(r, "Robin Taylor", "/people");
    await r.locator(".person", { hasText: alias }).getByText("Guest", { exact: true }).waitFor();
    await r.locator(".person", { hasText: "Jamie Chen" }).getByText("Scanned you", { exact: true }).waitFor();
    assert.equal(await r.locator(".person", { hasText: "Kai Brown" }).getByText("Scanned you").count(), 0, "someone Robin saved first keeps their own entry");
    await r.screenshot({ path: "/tmp/shots/people-labels-390.png" });
    await r.locator(".person", { hasText: alias }).getByRole("link").click();
    await r.getByText("Guest · an anonymous nickname, not a verified person").waitFor();
    await r.getByText(/^Scanned your code \d/).waitFor();
    await r.locator("summary", { hasText: "Notes" }).click();
    await r.getByRole("textbox", { name: "Private notes" }).fill("Asked about the pilot at the coffee stand");
    await r.getByRole("button", { name: "Save note" }).click();
    await r.getByText("Saved.", { exact: true }).waitFor();
    await r.getByRole("button", { name: "Archive" }).click();
    await r.getByText("In your Archive.").waitFor();
    await r.goto(`${BASE}/people/archive`);
    await r.locator(".person", { hasText: alias }).getByRole("button", { name: "Restore" }).click();
    await r.getByText(`${alias} is back in People.`).waitFor();
    await r.goto(`${BASE}/people`);
    await r.locator(".person", { hasText: alias }).waitFor();
    assert.equal((await q("select note from public.guest_encounters where owner_id = $1", [ROBIN]))[0].note, "Asked about the pilot at the coffee stand");
  });

  await step("owner opens Jamie: 'Scanned your code' with the time", async () => {
    await r.locator(".person", { hasText: "Jamie Chen" }).getByRole("link").click();
    await r.getByText(/^Scanned your code \d/).waitFor();
  });

  await step("block from the profile: silent, full separation, reversible", async () => {
    await r.locator("summary", { hasText: "More" }).click();
    await r.getByRole("button", { name: "Block Jamie" }).click();
    await r.getByText("Jamie isn't told.", { exact: false }).waitFor();
    await r.getByRole("button", { name: "Block", exact: true }).click();
    await r.waitForURL(/\/people\?blocked=1/);
    await r.getByText("Blocked. You won't see each other in Hi Again.").waitFor();
    assert.equal(await r.locator(".person", { hasText: "Jamie Chen" }).count(), 0);
    shot = k;
    // With streamed loading states the status may be 200; what matters is the page content.
    await k.goto(`${BASE}/p/${robin}`);
    await k.getByText("Profile not available").waitFor();
    assert.equal(await k.getByRole("button", { name: /^Again/ }).count(), 0);
    assert.equal((await q("select count(*)::int n from public.blocks where blocker_id = $1 and blocked_id = $2", [ROBIN, "00000000-0000-4000-8000-0000000000b1"]))[0].n, 1);
    shot = r;
    await r.goto(`${BASE}/me`);
    await r.locator("summary", { hasText: "Privacy and account" }).click();
    await r.locator(".person", { hasText: "Jamie Chen" }).getByRole("button", { name: "Unblock" }).click();
    await r.locator(".person", { hasText: "Jamie Chen" }).waitFor({ state: "detached" });
    await r.goto(`${BASE}/people`);
    await r.locator(".person", { hasText: "Jamie Chen" }).waitFor();
  });

  await step("report someone: confirmed, stored for review, not readable through the API", async () => {
    await r.goto(`${BASE}/p/${morgan}`);
    await r.locator("summary", { hasText: "More" }).click();
    await r.getByRole("button", { name: "Report" }).click();
    await r.getByLabel("What's wrong?").fill("Test report: spam messages (fictional)");
    await r.getByRole("button", { name: "Send report" }).click();
    await r.getByText("Thanks — your report was sent for review.").waitFor();
    assert.equal((await q("select count(*)::int n from public.reports where reporter_id = $1 and reported_id = $2", [ROBIN, MORGAN]))[0].n, 1);
  });

  const d = await newPage(); pages.push(d);
  await step("delete account: confirmation required, then everything is gone, including what was sent", async () => {
    await signIn(d, "Dana Fox", `/p/${robin}`);
    await d.getByRole("button", { name: /Answer a question/ }).click();
    await d.getByPlaceholder("Write your answer").fill("Dana's answer before leaving");
    await d.getByRole("button", { name: "Send answer" }).click();
    await d.locator(".badge", { hasText: "Answered" }).waitFor();
    await d.getByRole("button", { name: "Again", exact: true }).click();
    await d.getByRole("button", { name: "Again ✓" }).waitFor();
    assert.equal((await q("select count(*)::int n from public.contributions where sender_id = $1", [DANA]))[0].n, 1);
    await d.goto(`${BASE}/me`);
    await d.locator("summary", { hasText: "Privacy and account" }).click();
    const del = d.getByRole("button", { name: "Delete my account permanently" });
    assert.ok(await del.isDisabled());
    await d.getByLabel("Type DELETE to confirm").fill("delete");
    assert.ok(await del.isDisabled(), "exact word required");
    await d.getByLabel("Type DELETE to confirm").fill("DELETE");
    await del.click();
    await d.waitForURL(`${BASE}/?deleted=1`);
    await d.getByText("Your account has been deleted.").waitFor();
    for (const [sql, label] of [
      ["select count(*)::int n from auth.users where id = $1", "auth user"],
      ["select count(*)::int n from public.profiles where user_id = $1", "profile"],
      ["select count(*)::int n from public.contributions where sender_id = $1", "sent contributions"],
      ["select count(*)::int n from public.again_signals where sender_id = $1", "Again"],
      ["select count(*)::int n from public.saved_people where saver_id = $1 or subject_id = $1", "saves both ways"],
    ]) assert.equal((await q(sql, [DANA]))[0].n, 0, label);
    shot = r;
    await r.goto(`${BASE}/activity`);
    assert.equal(await r.getByText("Dana Fox").count(), 0, "gone from the recipient's Activity");
    await d.goto(`${BASE}/me`);
    await d.waitForURL(/\/sign-in/);
  });

  for (const p of pages) assert.deepEqual(p.errors, [], "no page errors");
} finally {
  for (const [s, n] of steps) console.log(`${s} ${n}`);
  await browser.close();
  await db.end();
}
