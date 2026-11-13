// Again journeys against the test-only stub. Fictional data only. Runs after the other checks.
import { chromium } from "playwright";
import pg from "pg";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL;
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const PRIYA = "00000000-0000-4000-8000-0000000000d1", MORGAN = "00000000-0000-4000-8000-0000000000d2", KAI = "00000000-0000-4000-8000-0000000000d3";
const pid = async (uid) => (await q("select public_id from public.profiles where user_id = $1", [uid]))[0].public_id;
const priya = await pid(PRIYA), morgan = await pid(MORGAN);
const signals = async () => (await q("select sender_id, recipient_id from public.again_signals where $1 in (sender_id, recipient_id) or $2 in (sender_id, recipient_id)", [PRIYA, MORGAN]));
const matches = async () => (await q("select id from public.again_matches where least($1::uuid,$2::uuid) = user_a and greatest($1::uuid,$2::uuid) = user_b", [PRIYA, MORGAN]));

const browser = await chromium.launch();
const steps = [];
let shotPage = null;
const step = async (name, fn) => {
  try { await fn(); steps.push(["ok  ", name]); }
  catch (e) { steps.push(["FAIL", `${name}: ${e.message.split("\n")[0]}`]); await shotPage?.screenshot({ path: "/tmp/shots/again-fail.png", fullPage: true }).catch(() => {}); throw e; }
};
async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  const page = await ctx.newPage();
  page.errors = []; page.on("pageerror", (e) => page.errors.push(e.message));
  shotPage = page;
  return page;
}
async function signIn(page, name, next) {
  await page.goto(`${BASE}/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: "Continue with LinkedIn" }).click();
  await page.getByRole("link", { name: `Sign in as ${name}` }).click();
  await page.waitForURL(`${BASE}${next}`);
}
const badge = async (page) => { const b = page.locator(".nav-badge"); return (await b.count()) ? Number(await b.textContent()) : 0; };

try {
  const m = await newPage();
  await step("guest taps Again, signs in, and the intent completes in the right account", async () => {
    await m.goto(`${BASE}/p/${priya}`);
    await m.getByText("Sign in with LinkedIn — it's only revealed when mutual.").waitFor();
    await m.getByRole("button", { name: "Again", exact: true }).click();
    await m.getByRole("link", { name: "Sign in as Morgan Lee" }).click();
    await m.getByRole("button", { name: "Again ✓" }).waitFor();
    await m.getByText("Only you can see your interest. Tap to undo.").waitFor();
    assert.deepEqual(await signals(), [{ sender_id: MORGAN, recipient_id: PRIYA }]);
    await m.waitForURL(`${BASE}/p/${priya}`);
  });

  await step("a crafted ?resume=again link can't express interest for a signed-in visitor", async () => {
    const k = await newPage();
    await signIn(k, "Kai Brown", `/p/${priya}?resume=again`);
    await k.getByRole("button", { name: "Again", exact: true }).waitFor();
    await k.waitForTimeout(1500);
    assert.equal((await q("select count(*)::int n from public.again_signals where sender_id = $1", [KAI]))[0].n, 0);
    await k.context().close();
    shotPage = m;
  });

  const p = await newPage();
  await step("before it's mutual, Priya sees nothing: plain Again, no badge, no Activity entry", async () => {
    await signIn(p, "Priya Shah", `/p/${morgan}`);
    await p.getByRole("button", { name: "Again", exact: true }).waitFor();
    await p.getByText("Want to meet again? Only revealed when mutual.").waitFor();
    const html = await (await p.request.get(`${BASE}/p/${morgan}`)).text();
    assert.ok(!/Again ✓|mutual\./.test(html.replace("Only revealed when mutual.", "")), "server HTML reveals nothing");
    await p.goto(`${BASE}/activity`);
    assert.equal(await p.getByText("It's mutual").count(), 0);
  });

  await step("withdraw before a match removes the signal; saying Again again restores it", async () => {
    shotPage = m;
    await m.getByRole("button", { name: "Again ✓" }).click();
    await m.getByRole("button", { name: "Again", exact: true }).waitFor();
    assert.deepEqual(await signals(), []);
    await m.getByRole("button", { name: "Again", exact: true }).click();
    await m.getByRole("button", { name: "Again ✓" }).waitFor();
  });

  let morganUnread;
  await step("Priya reciprocates: it's mutual, with Coffee/Walk/Call and a copyable message", async () => {
    shotPage = p;
    await m.goto(`${BASE}/activity`);
    morganUnread = await badge(m);
    await p.goto(`${BASE}/p/${morgan}`);
    await p.getByRole("button", { name: "Again", exact: true }).click();
    await p.getByRole("heading", { name: "It's mutual." }).waitFor();
    assert.equal((await matches()).length, 1);
    await p.getByRole("radio", { name: "Walk" }).click();
    assert.equal(await p.getByLabel("Message to send Morgan").inputValue(), "Fancy a walk and a catch-up?");
    await p.getByLabel("Message to send Morgan").fill("Fancy a walk along the canal next week?");
    await p.getByRole("button", { name: "Copy message" }).click();
    await p.getByText(/^Copied\./).waitFor();
    assert.equal(await p.evaluate(() => navigator.clipboard.readText()), "Fancy a walk along the canal next week?");
    await p.getByText("Hi Again doesn't send this or book anything").waitFor();
    await p.screenshot({ path: "/tmp/shots/again-mutual-390.png", fullPage: true });
  });

  await step("Morgan gets one unread mutual event; opening it marks it read", async () => {
    shotPage = m;
    await m.reload();
    assert.equal(await badge(m), morganUnread + 1);
    await m.getByText("Priya Shah · It's mutual").click();
    await m.getByRole("link", { name: "Make the next step" }).waitFor();
    await m.waitForFunction((n) => Number(document.querySelector(".nav-badge")?.textContent ?? 0) === n, morganUnread);
    await m.getByRole("link", { name: "Make the next step" }).click();
    await m.getByRole("heading", { name: "It's mutual." }).waitFor();
  });

  await step("either can end the match: it disappears for both, quietly", async () => {
    await p.goto(`${BASE}/activity`);
    const priyaUnread = await badge(p);
    await m.getByRole("button", { name: "End match" }).click();
    await m.getByText("It disappears for both of you, and Priya isn't notified.").waitFor();
    await m.getByRole("button", { name: "End match" }).click();
    await m.getByText("Match ended.").waitFor();
    assert.equal((await matches()).length, 0);
    assert.deepEqual(await signals(), []);
    shotPage = p;
    await p.reload();
    assert.equal(await p.getByText("It's mutual").count(), 0, "gone from Priya's Activity");
    assert.ok((await badge(p)) <= priyaUnread, "no new notification for Priya");
    await p.goto(`${BASE}/p/${morgan}`);
    await p.getByRole("button", { name: "Again", exact: true }).waitFor();
  });

  for (const pg of [m, p]) assert.deepEqual(pg.errors, [], "no page errors");
} finally {
  for (const [s, n] of steps) console.log(`${s} ${n}`);
  await browser.close();
  await db.end();
}
