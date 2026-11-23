// Growth-loop journeys against the test-only stub: LinkedIn link prompt, guest nudge, events,
// Again review, "Did you meet?", the digest email, its opt-out, funnel counts and the offline QR.
// Fictional data only. Runs last.
import { chromium } from "playwright";
import pg from "pg";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL, STUB = process.env.STUB_URL;
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const GWEN = "00000000-0000-4000-8000-0000000000e1", HUGO = "00000000-0000-4000-8000-0000000000e2", IRIS = "00000000-0000-4000-8000-0000000000e3";
const pid = async (uid) => (await q("select public_id from public.profiles where user_id = $1", [uid]))[0]?.public_id;
const funnel = async (kind) => Number((await q("select coalesce(sum(n), 0)::int n from public.funnel_counts where kind = $1", [kind]))[0].n);

const browser = await chromium.launch();
const steps = [];
let shotPage = null;
const step = async (name, fn) => {
  try { await fn(); steps.push(["ok  ", name]); }
  catch (e) { steps.push(["FAIL", `${name}: ${e.message.split("\n")[0]}`]); await shotPage?.screenshot({ path: "/tmp/shots/growth-fail.png", fullPage: true }).catch(() => {}); throw e; }
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
const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const pages = [];
try {
  const h = await newPage(); pages.push(h);
  let hugo;
  await step("a new account sees 'Add your LinkedIn link' under the QR; pasting saves it in place", async () => {
    await signIn(h, "Hugo Hart", "/me");
    hugo = await pid(HUGO);
    const prompt = h.getByTestId("linkedin-prompt");
    await prompt.getByRole("heading", { name: "Add your LinkedIn link" }).waitFor();
    await h.screenshot({ path: "/tmp/shots/growth-linkedin-prompt-390.png", fullPage: true });
    await h.evaluate(() => navigator.clipboard.writeText("https://example.com/not-linkedin"));
    await prompt.getByRole("button", { name: "Paste" }).click();
    await prompt.getByText("That isn't a LinkedIn profile link.").waitFor();
    await h.evaluate(() => navigator.clipboard.writeText("https://uk.linkedin.com/in/hugo-hart-demo?trk=share"));
    await prompt.getByRole("button", { name: "Paste" }).click();
    await h.getByTestId("linkedin-prompt").waitFor({ state: "detached" });
    assert.equal((await q("select linkedin_url from public.profiles where user_id = $1", [HUGO]))[0].linkedin_url, "https://www.linkedin.com/in/hugo-hart-demo");
    await h.getByRole("link", { name: "Hugo Hart on LinkedIn (opens LinkedIn)" }).waitFor();
    assert.equal(await funnel("linkedin_prompt_saved"), 1);
  });

  const i = await newPage(); pages.push(i);
  await step("a guest who scans Hugo is told Hugo can't see them, and signing in gives Hugo their name", async () => {
    await i.goto(`${BASE}/p/${hugo}`);
    await i.getByText("Saved on this browser. Sign in any time").waitFor();
    const nudge = i.getByTestId("guest-nudge");
    await nudge.getByRole("heading", { name: "Hugo can't see who you are" }).waitFor();
    await i.screenshot({ path: "/tmp/shots/growth-guest-nudge-390.png", fullPage: true });
    await nudge.getByRole("button", { name: "Sign in so Hugo has you too" }).click();
    await i.getByRole("link", { name: "Sign in as Iris Ito" }).click();
    await i.waitForURL(`${BASE}/p/${hugo}`);
    await i.getByText("Saved to your People.").waitFor();
    assert.equal(await i.getByTestId("guest-nudge").count(), 0, "no nudge once signed in");
    const rows = await q("select saver_id, source from public.saved_people where (saver_id = $1 and subject_id = $2) or (saver_id = $2 and subject_id = $1) order by source", [IRIS, HUGO]);
    assert.deepEqual(rows.map((r) => r.source), ["incoming_scan", "scan"], "Hugo has Iris by name now");
    assert.ok((await funnel("guest_nudge_shown")) >= 1);
    assert.equal(await funnel("guest_nudge_click"), 1);
  });

  const g = await newPage(); pages.push(g);
  let code;
  await step("an organiser creates an event QR and sees totals only", async () => {
    await signIn(g, "Gwen Host", "/me");
    await g.getByRole("link", { name: "Running an event? Get an event QR" }).click();
    await g.waitForURL(`${BASE}/events`);
    const start = new Date(Date.now() - 30 * 60_000), end = new Date(Date.now() + 2 * 3_600_000);
    await g.getByLabel("Event name").fill("Growth Test Meetup");
    await g.getByLabel("Date").fill(ymd(start));
    await g.getByLabel("Starts").fill(hhmm(start));
    await g.getByLabel("Ends").fill(hhmm(end));
    await g.getByRole("button", { name: "Create event QR" }).click();
    await g.waitForURL(/\/e\/[A-Za-z0-9_-]{12}$/);
    code = g.url().split("/e/")[1];
    await g.getByText("Scan to join Growth Test Meetup").waitFor();
    await g.locator(".qr svg").waitFor();
    const stats = g.getByTestId("event-stats");
    assert.match(await stats.innerText(), /1\s*joined/);
    assert.equal(await funnel("event_qr_shown"), 1);
  });

  await step("a guest opening the event is asked to join with LinkedIn; the in-app scanner accepts the door QR", async () => {
    const x = await newPage(); pages.push(x);
    await x.goto(`${BASE}/e/${code}`);
    await x.getByTestId("event-guest").getByRole("button", { name: "Join with LinkedIn" }).waitFor();
    await x.goto(`${BASE}/scan`);
    await x.getByLabel("Profile link").fill(`${BASE}/e/${code}`);
    await x.getByRole("button", { name: "Open profile" }).click();
    await x.waitForURL(`${BASE}/e/${code}`);
  });

  await step("attendees join by opening the event; people they already met there are tagged both ways", async () => {
    shotPage = h;
    await h.goto(`${BASE}/e/${code}`);
    await h.getByTestId("event-joined").getByText("You're in").waitFor();
    shotPage = i;
    await i.goto(`${BASE}/e/${code}`);
    await i.getByTestId("event-joined").waitFor();
    const rows = await q("select context_label, context_source from public.saved_people where (saver_id = $1 and subject_id = $2) or (saver_id = $2 and subject_id = $1)", [IRIS, HUGO]);
    assert.equal(rows.length, 2);
    for (const r of rows) assert.deepEqual([r.context_label, r.context_source], ["Growth Test Meetup", "event"]);
    await i.goto(`${BASE}/p/${hugo}`);
    await i.getByText("Growth Test Meetup").first().waitFor();
  });

  await step("People invites a review; the review groups by event and Again stays private until mutual", async () => {
    await i.goto(`${BASE}/people`);
    await i.getByTestId("review-cta").click();
    await i.waitForURL(`${BASE}/review`);
    await i.getByRole("heading", { name: "Met at Growth Test Meetup" }).waitFor();
    await i.getByRole("button", { name: "Again with Hugo Hart" }).click();
    await i.getByRole("button", { name: "Again sent to Hugo Hart. Tap to undo" }).waitFor();
    assert.equal((await q("select count(*)::int n from public.again_signals where sender_id = $1 and recipient_id = $2", [IRIS, HUGO]))[0].n, 1);
    shotPage = h;
    await h.goto(`${BASE}/review`);
    await h.getByRole("button", { name: "Again with Iris Ito" }).waitFor(); // Iris's choice isn't revealed
    await h.getByRole("button", { name: "Again with Iris Ito" }).click();
    await h.getByRole("link", { name: "It's mutual" }).waitFor();
    assert.ok((await funnel("review_opened")) >= 2);
    await h.screenshot({ path: "/tmp/shots/growth-review-390.png", fullPage: true });
  });

  await step("the organiser's totals update, with mutual Agains hidden for a small event", async () => {
    shotPage = g;
    await g.reload();
    const t = await g.getByTestId("event-stats").innerText();
    assert.match(t, /3\s*joined/); assert.match(t, /1\s*connections/); assert.match(t, /–\s*mutual Agains/);
    await g.getByText("Mutual Agains show once 5 people have joined").waitFor();
    await g.screenshot({ path: "/tmp/shots/growth-event-organiser-390.png", fullPage: true });
  });

  await step("a few days after a match, each person is asked privately whether they met", async () => {
    shotPage = h;
    await q("update public.again_matches set created_at = now() - interval '4 days' where user_a = least($1::uuid, $2::uuid) and user_b = greatest($1::uuid, $2::uuid)", [HUGO, IRIS]);
    await h.goto(`${BASE}/p/${await pid(IRIS)}`);
    const o = h.getByTestId("match-outcome");
    await o.getByText("Did you meet up?").waitFor();
    await o.getByRole("radio", { name: "We met" }).click();
    await o.getByText(/Only you can see your answer/).waitFor();
    assert.equal((await q("select outcome from public.match_outcomes where user_id = $1", [HUGO]))[0].outcome, "met");
    await h.getByText("Iris hasn't added a LinkedIn link yet.", { exact: false }).waitFor();
  });

  await step("the morning digest: secret required, counts only, once a day, and the opt-out is respected", async () => {
    const unauth = await fetch(`${BASE}/api/cron/digest`);
    assert.equal(unauth.status, 401);
    // Iris met Hugo "yesterday"; Hugo too, but Hugo turns the email off first.
    await q(`update public.saved_people set saved_at = ((date_trunc('day', now() at time zone 'Europe/London') - interval '9 hours') at time zone 'Europe/London')
             where saver_id in ($1, $2) and subject_id in ($1, $2)`, [IRIS, HUGO]);
    shotPage = h;
    await h.goto(`${BASE}/me#notifications`);
    const box = h.getByRole("checkbox", { name: /email me to choose who to meet again/ });
    await box.waitFor();
    assert.equal(await box.isChecked(), true);
    await box.uncheck();
    for (let n = 0; n < 20 && (await q("select digest_email from public.notification_settings where user_id = $1", [HUGO]))[0]?.digest_email !== false; n++) await h.waitForTimeout(100);
    assert.equal((await q("select digest_email from public.notification_settings where user_id = $1", [HUGO]))[0].digest_email, false);

    const ok = await fetch(`${BASE}/api/cron/digest`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    const body = await ok.json();
    assert.equal(ok.status, 200, JSON.stringify(body));
    const sent = await (await fetch(`${STUB}/resend/sent`)).json();
    const toIris = sent.filter((e) => e.to[0] === "iris@example.test");
    assert.equal(toIris.length, 1, "Iris gets one");
    assert.equal(toIris[0].subject, "Who from Growth Test Meetup would you like to meet again?");
    assert.match(toIris[0].text, /You met 1 person at Growth Test Meetup yesterday/);
    assert.doesNotMatch(toIris[0].text + toIris[0].html, /Hugo/, "no names in the email");
    assert.equal(sent.filter((e) => e.to[0] === "hugo@example.test").length, 0, "opted out");
    const again = await (await fetch(`${BASE}/api/cron/digest`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json();
    assert.equal(again.sent, 0, "not twice in a day");
  });

  await step("My QR keeps working offline: the saved QR shows instead of an error", async () => {
    shotPage = h;
    await h.goto(`${BASE}/me`);
    await h.locator(".qr svg").waitFor();
    await h.evaluate(async () => { await navigator.serviceWorker.ready; });
    await h.reload(); // now controlled by the service worker
    await h.evaluate(async () => { await navigator.serviceWorker.ready; });
    await h.context().setOffline(true);
    await h.goto(`${BASE}/people`).catch(() => {});
    await h.getByRole("heading", { name: "Hugo Hart" }).waitFor();
    await h.locator(".qr svg").waitFor();
    await h.getByText("Let people scan this to save you").waitFor();
    await h.screenshot({ path: "/tmp/shots/growth-offline-390.png", fullPage: true });
    await h.context().setOffline(false);
  });

  for (const pg of pages) assert.deepEqual(pg.errors, [], "no page errors");
} finally {
  for (const [s, n] of steps) console.log(`${s} ${n}`);
  await browser.close();
  await db.end();
}
