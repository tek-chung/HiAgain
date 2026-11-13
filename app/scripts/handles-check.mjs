// Name-based profile addresses against the test-only stub. Runs early (restores Alex's name at the end).
import { chromium } from "playwright";
import pg from "pg";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL;
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const ALEX = "00000000-0000-4000-8000-0000000000a1", MORGAN = "00000000-0000-4000-8000-0000000000d2";
const alexPid = (await q("select public_id from public.profiles where user_id = $1", [ALEX]))[0].public_id;

const browser = await chromium.launch();
const steps = [];
let shot = null;
const step = async (name, fn) => {
  try { await fn(); steps.push(["ok  ", name]); }
  catch (e) { steps.push(["FAIL", `${name}: ${e.message.split("\n")[0]}`]); await shot?.screenshot({ path: "/tmp/shots/handles-fail.png", fullPage: true }).catch(() => {}); throw e; }
};
async function newPage() {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.errors = []; p.on("pageerror", (e) => p.errors.push(e.message));
  return (shot = p);
}
async function signIn(page, name, next) {
  await page.goto(`${BASE}/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: "Continue with LinkedIn" }).click();
  await page.getByRole("link", { name: `Sign in as ${name}` }).click();
  await page.waitForURL(`${BASE}${next}`);
}
const pages = [];

try {
  const a = await newPage(); pages.push(a);
  await step("My QR shows and encodes hiagain-style name address", async () => {
    await signIn(a, "Alex Morgan", "/me");
    await a.getByText(`${BASE}/alex-morgan`).waitFor();
    const png = PNG.sync.read(await a.locator(".qr").screenshot());
    assert.equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data, `${BASE}/alex-morgan`);
    assert.equal(await a.getByRole("link", { name: "See what people see" }).getAttribute("href"), "/alex-morgan");
  });

  const g = await newPage(); pages.push(g);
  await step("a visitor opens the name address: profile shown and saved; /p/ address still works", async () => {
    await g.goto(`${BASE}/alex-morgan`);
    await g.getByRole("heading", { name: "Alex Morgan" }).waitFor();
    await g.getByText("Saved on this browser. Sign in any time").waitFor();
    await g.goto(`${BASE}/p/${alexPid}`);
    await g.getByRole("heading", { name: "Alex Morgan" }).waitFor();
    assert.equal(new URL(g.url()).pathname, `/p/${alexPid}`, "older links keep working");
    await g.goto(`${BASE}/no-such-person`);
    await g.getByText("Profile not available").waitFor();
  });

  await step("a guest's draft survives sign-in on the name address and is sent", async () => {
    await g.goto(`${BASE}/alex-morgan`);
    await g.getByRole("button", { name: /Ask for feedback/ }).click();
    await g.getByPlaceholder("What would you like feedback on?").fill("Feedback on my pitch deck, via a name link");
    await g.waitForTimeout(400);
    await g.getByRole("button", { name: "Sign in with LinkedIn and send" }).click();
    await g.getByRole("link", { name: "Sign in as Morgan Lee" }).click();
    await g.waitForURL(`${BASE}/alex-morgan`);
    await g.locator(".badge", { hasText: "Request sent" }).waitFor();
    assert.equal((await q("select count(*)::int n from public.contributions where sender_id = $1 and body = $2", [MORGAN, "Feedback on my pitch deck, via a name link"]))[0].n, 1);
  });

  await step("LinkedIn name change: new address at next sign-in; the old one redirects", async () => {
    await q("update auth.users set raw_user_meta_data = raw_user_meta_data || '{\"name\":\"Alex Morgan-Reid\"}' where id = $1", [ALEX]);
    shot = a;
    await a.getByRole("button", { name: "Sign out" }).click();
    await a.waitForURL(`${BASE}/`);
    await signIn(a, "Alex Morgan-Reid", "/me");
    await a.getByText(`${BASE}/alex-morgan-reid`).waitFor();
    shot = g;
    await g.goto(`${BASE}/alex-morgan?ref=qr`);
    await g.waitForURL(`${BASE}/alex-morgan-reid?ref=qr`);
    await g.getByRole("heading", { name: "Alex Morgan" }).waitFor();
    // Changing back reuses the earlier address.
    await q("update auth.users set raw_user_meta_data = raw_user_meta_data || '{\"name\":\"Alex Morgan\"}' where id = $1", [ALEX]);
    shot = a;
    await a.getByRole("button", { name: "Sign out" }).click();
    await a.waitForURL(`${BASE}/`);
    await signIn(a, "Alex Morgan", "/me");
    await a.getByText(`${BASE}/alex-morgan`).waitFor();
    assert.equal((await q("select handle from public.profiles where user_id = $1", [ALEX]))[0].handle, "alex-morgan");
  });

  await step("app pages are never profiles", async () => {
    shot = g;
    await g.goto(`${BASE}/people`);
    await g.getByRole("heading", { name: "People" }).waitFor();
  });

  for (const p of pages) assert.deepEqual(p.errors, [], "no page errors");
} finally {
  for (const [s, n] of steps) console.log(`${s} ${n}`);
  await browser.close();
  await db.end();
}
