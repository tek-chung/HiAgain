// Activity, sender editing, People Archive and swipes, against the test-only stub. Runs after
// signed-in-check.mjs (Sam and Jamie have each answered Alex's question). Fictional data only.
import { chromium } from "playwright";
import pg from "pg";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL;
pg.types.setTypeParser(1184, (v) => new Date(v.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00")));
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const ALEX = "00000000-0000-4000-8000-0000000000a1", SAM = "00000000-0000-4000-8000-0000000000c1";
const pid = async (uid) => (await q("select public_id from public.profiles where user_id = $1", [uid]))[0].public_id;
const alexId = await pid(ALEX);
const jamieId = await pid("00000000-0000-4000-8000-0000000000b1");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await ctx.route("https://www.linkedin.com/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "LinkedIn (intercepted in test)" }));
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const steps = [];
const step = async (name, fn) => {
  try { await fn(); steps.push(["ok  ", name]); }
  catch (e) { steps.push(["FAIL", `${name}: ${e.message.split("\n")[0]}`]); await page.screenshot({ path: "/tmp/shots/activity-fail.png", fullPage: true }).catch(() => {}); throw e; }
};
const signIn = async (name, next) => {
  await page.goto(`${BASE}/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: "Continue with LinkedIn" }).click();
  await page.getByRole("link", { name: `Sign in as ${name}` }).click();
  await page.waitForURL(`${BASE}${next}`);
};
const signOut = async () => {
  await page.goto(`${BASE}/me`);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(`${BASE}/`);
};
const badge = async () => {
  const b = page.locator(".nav-badge");
  return (await b.count()) ? Number(await b.textContent()) : 0;
};
async function drag(locator, dx, dy = 0) {
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + (dx * i) / 8, y + (dy * i) / 8);
  await page.mouse.up();
}

try {
  let unreadStart;
  await step("recipient sees an unread badge on Activity, positioned on the icon", async () => {
    await signIn("Alex Morgan", "/activity");
    unreadStart = await badge();
    const expected = (await q("select count(*)::int n from public.contributions where recipient_id = $1", [ALEX]))[0].n;
    assert.equal(unreadStart, expected, "badge counts all received, none read yet");
    const icon = await page.locator(".nav-icon").boundingBox(), b = await page.locator(".nav-badge").boundingBox();
    const label = await page.getByRole("link", { name: /Activity/ }).boundingBox();
    assert.ok(b.x > icon.x + icon.width / 2 && b.y < icon.y + icon.height / 2, "badge at the icon's upper right");
    assert.ok(Math.abs(icon.x + icon.width / 2 - (label.x + label.width / 2)) < 3, "icon and label centred");
    await page.getByText("Sam Patel · Answered your question").waitFor();
  });

  await step("opening an item marks only that version read", async () => {
    await page.getByText("Sam Patel · Answered your question").click();
    await page.getByText("How do you run customer interviews?").first().waitFor();
    await page.waitForFunction((n) => (Number(document.querySelector(".nav-badge")?.textContent ?? 0)) === n, unreadStart - 1);
  });

  await step("Mark all as read clears the badge and keeps the history", async () => {
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await page.locator(".nav-badge").waitFor({ state: "detached" });
    await page.reload();
    assert.equal(await page.locator(".unread-dot").count(), 0);
    assert.ok((await page.locator(".activity-item").count()) >= 2, "history kept");
    await signOut();
  });

  await step("sender edits in place from the profile view; participants and sent time unchanged", async () => {
    const before = (await q("select id, sent_at, recipient_id from public.contributions where sender_id = $1 and kind = 'question'", [SAM]))[0];
    await signIn("Sam Patel", `/p/${alexId}`);
    await page.getByRole("button", { name: /Answer a question/ }).click();
    await page.getByRole("button", { name: "✎ Edit answer" }).click();
    await page.getByLabel("Edit answer").fill("How do you run customer interviews, and how often?");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByText(/Edited \d/).waitFor();
    const after = (await q("select id, sent_at, recipient_id, version, body from public.contributions where id = $1", [before.id]))[0];
    assert.equal(after.body, "How do you run customer interviews, and how often?");
    assert.equal(after.version, 2);
    assert.equal(after.sent_at.getTime(), before.sent_at.getTime());
    assert.equal(after.recipient_id, before.recipient_id);
    assert.equal((await q("select count(*)::int n from public.contributions where sender_id = $1 and kind = 'question'", [SAM]))[0].n, 1, "still one answer");
  });

  await step("Activity → Sent shows it and allows editing there too; Join me has no edit", async () => {
    await page.goto(`${BASE}/activity`);
    assert.equal(await badge(), 0, "own submissions never count as unread");
    await page.getByRole("tab", { name: "Sent" }).click();
    await page.getByText("To Alex Morgan · Answered").click();
    await page.getByRole("button", { name: "✎ Edit answer" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.getByText("How do you run customer interviews, and how often?").first().waitFor();
  });

  await step("an edit is unread again for the recipient", async () => {
    await signOut();
    await signIn("Alex Morgan", "/activity");
    assert.equal(await badge(), 1);
    await page.locator(".activity-item", { hasText: "Sam Patel" }).locator(".unread-dot").waitFor();
    await signOut();
  });

  await step("People: archive with the button, then Undo", async () => {
    await signIn("Sam Patel", "/people");
    const row = page.getByTestId(`row-${jamieId}`);
    const before = (await q("select saved_at, note from public.saved_people where saver_id = $1 and subject_id = (select user_id from public.profiles where public_id = $2)", [SAM, jamieId]))[0];
    await row.getByRole("button", { name: /^Archive / }).click();
    await page.getByText("Jamie Chen archived.").waitFor();
    assert.equal(await page.getByTestId(`row-${jamieId}`).count(), 0);
    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByTestId(`row-${jamieId}`).waitFor();
    const after = (await q("select saved_at, note, archived_at from public.saved_people where saver_id = $1 and subject_id = (select user_id from public.profiles where public_id = $2)", [SAM, jamieId]))[0];
    assert.equal(after.archived_at, null);
    assert.equal(after.saved_at.getTime(), before.saved_at.getTime());
    assert.equal(after.note, before.note);
  });

  await step("swipe right archives; vertical drag doesn't; Archive → Restore puts it back in its date group", async () => {
    const row = page.getByTestId(`row-${jamieId}`);
    const groupBefore = await page.locator("section[aria-label]", { has: row }).getAttribute("aria-label");
    await drag(row, 15, 120); // mostly vertical: a scroll, not an archive
    await page.waitForTimeout(300);
    assert.equal(await page.getByTestId(`row-${jamieId}`).count(), 1, "vertical drag ignored");
    await drag(row, 140);
    await page.getByText("Jamie Chen archived.").waitFor();
    await page.getByRole("link", { name: "Archive" }).click();
    await page.getByText("Jamie Chen").waitFor();
    await page.getByRole("button", { name: "Restore" }).click();
    await page.getByText("Jamie Chen is back in People.").waitFor();
    await page.goto(`${BASE}/people`);
    assert.equal(await page.locator("section[aria-label]", { has: page.getByTestId(`row-${jamieId}`) }).getAttribute("aria-label"), groupBefore);
  });

  await step("swipe left opens LinkedIn when there is a link, explains when there isn't", async () => {
    const popup = ctx.waitForEvent("page");
    await drag(page.getByTestId(`row-${alexId}`), -140);
    const p = await popup;
    await p.waitForLoadState();
    assert.match(p.url(), /linkedin\.com\/in\/alex-morgan-demo/);
    await p.close();
    await drag(page.getByTestId(`row-${jamieId}`), -140);
    await page.getByText("Jamie Chen hasn't added a LinkedIn link.").waitFor();
    assert.equal(await page.getByTestId(`row-${jamieId}`).count(), 1, "nothing archived");
  });

  await step("archived person: profile shows Restore; repeat visit keeps them archived", async () => {
    await page.getByTestId(`row-${jamieId}`).getByRole("button", { name: /^Archive / }).click();
    await page.goto(`${BASE}/p/${jamieId}`);
    await page.getByText("In your Archive.").waitFor();
    await page.locator("summary", { hasText: "Notes" }).waitFor();
    assert.match(await page.getByRole("textbox", { name: "Private notes" }).inputValue(), /Designer from the climate meetup/, "notes kept while archived");
    await page.getByRole("button", { name: "Restore" }).click();
    await page.getByText("In your Archive.").waitFor({ state: "detached" });
    await signOut();
  });

  await step("guest archive travels with the import", async () => {
    const g = await browser.newContext({ viewport: { width: 320, height: 700 } });
    const gp = await g.newPage();
    await gp.goto(`${BASE}/p/${await pid("00000000-0000-4000-8000-0000000000d3")}`);
    await gp.locator(".saved-context").waitFor();
    await gp.goto(`${BASE}/people`);
    await gp.getByRole("button", { name: "Archive Kai Brown" }).click();
    await gp.getByText("Kai Brown archived.").waitFor();
    await gp.goto(`${BASE}/sign-in?next=/people`);
    await gp.getByRole("button", { name: "Continue with LinkedIn" }).click();
    await gp.getByRole("link", { name: "Sign in as Priya Shah" }).click();
    await gp.waitForURL(`${BASE}/people`);
    await gp.getByRole("button", { name: "Add to my account" }).click();
    await gp.getByText(/Added 1 person/).waitFor();
    const row = (await q("select archived_at from public.saved_people where saver_id = '00000000-0000-4000-8000-0000000000d1' and subject_id = '00000000-0000-4000-8000-0000000000d3'"))[0];
    assert.ok(row.archived_at, "arrives archived");
    await gp.screenshot({ path: "/tmp/shots/people-import-320.png", fullPage: true });
    await g.close();
  });

  assert.deepEqual(errors, [], "no page errors");
} finally {
  for (const [s, n] of steps) console.log(`${s} ${n}`);
  await browser.close();
  await db.end();
}
