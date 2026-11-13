// Photo upload journeys against the test-only stub (Storage policies enforced by the database).
// Runs last: it ends by deleting Robin's account. Fictional data only.
import { chromium } from "playwright";
import pg from "pg";
import { PNG } from "pngjs";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL, STUB = process.env.STUB_URL;
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const ROBIN = "00000000-0000-4000-8000-0000000000f1";
const robinId = (await q("select public_id from public.profiles where user_id = $1", [ROBIN]))[0].public_id;
const objects = async () => (await q("select name from storage.objects where bucket_id = 'avatars' and name like $1", [`${ROBIN}/%`])).map((r) => r.name);

function png(w, h, rgb) {
  const p = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) { p.data[i * 4] = rgb[0]; p.data[i * 4 + 1] = rgb[1]; p.data[i * 4 + 2] = rgb[2]; p.data[i * 4 + 3] = 255; }
  return PNG.sync.write(p);
}
function jpegSize(buf) {
  assert.equal(buf[0], 0xff); assert.equal(buf[1], 0xd8, "is a JPEG");
  let i = 2;
  while (i < buf.length) {
    const marker = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error("no SOF");
}

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const steps = [];
const step = async (name, fn) => {
  try { await fn(); steps.push(["ok  ", name]); }
  catch (e) { steps.push(["FAIL", `${name}: ${e.message.split("\n")[0]}`]); await page.screenshot({ path: "/tmp/shots/avatar-fail.png", fullPage: true }).catch(() => {}); throw e; }
};

try {
  let firstUrl;
  await step("add a photo: cropped to a 512px square JPEG in your own folder, shown publicly", async () => {
    await page.goto(`${BASE}/sign-in?next=/me`);
    await page.getByRole("button", { name: "Continue with LinkedIn" }).click();
    await page.getByRole("link", { name: "Sign in as Robin Taylor" }).click();
    await page.waitForURL(`${BASE}/me`);
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.getByLabel("Choose a photo").setInputFiles({ name: "wide.png", mimeType: "image/png", buffer: png(800, 500, [40, 120, 90]) });
    await page.getByText("Photo updated.").waitFor();
    assert.equal((await objects()).length, 1);
    firstUrl = (await q("select avatar_url from public.profiles where user_id = $1", [ROBIN]))[0].avatar_url;
    assert.match(firstUrl, new RegExp(`/storage/v1/object/public/avatars/${ROBIN}/\\d+\\.jpg$`));
    const img = Buffer.from(await (await fetch(firstUrl)).arrayBuffer());
    assert.deepEqual(jpegSize(img), { w: 512, h: 512 });
    assert.ok(img.length < 1024 * 1024);
    const anon = await (await browser.newContext()).newPage();
    await anon.goto(`${BASE}/p/${robinId}`);
    assert.equal(await anon.locator(".avatar img").getAttribute("src"), firstUrl, "public profile shows the photo");
    await anon.context().close();
  });

  await step("change photo: the old file is removed", async () => {
    await page.waitForTimeout(20); // distinct timestamped name
    await page.getByLabel("Choose a photo").setInputFiles({ name: "tall.png", mimeType: "image/png", buffer: png(300, 900, [200, 80, 60]) });
    await page.getByText("Photo updated.").waitFor();
    const files = await objects();
    assert.equal(files.length, 1, "only the new photo remains");
    assert.notEqual((await q("select avatar_url from public.profiles where user_id = $1", [ROBIN]))[0].avatar_url, firstUrl);
    assert.equal((await fetch(firstUrl)).status, 404, "old photo gone");
  });

  await step("a non-image is refused with a clear message", async () => {
    await page.getByLabel("Choose a photo").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await page.getByText("Choose a photo (JPEG, PNG or WebP).").waitFor();
    assert.equal((await objects()).length, 1);
  });

  await step("Storage rules stop writing into someone else's folder", async () => {
    // Direct API call as anonymous: refused by the database policy.
    const r = await fetch(`${STUB}/storage/v1/object/avatars/00000000-0000-4000-8000-0000000000a1/x.jpg`, {
      method: "POST", headers: { "content-type": "image/jpeg", authorization: "Bearer sb_publishable_test_only" }, body: Buffer.from([0xff, 0xd8]),
    });
    assert.equal(r.status, 403);
    const bad = await fetch(`${STUB}/rest/v1/rpc/update_my_avatar`, { method: "POST", headers: { authorization: "Bearer sb_publishable_test_only" }, body: JSON.stringify({ p_url: "https://tracker.example/p.gif" }) });
    assert.equal(bad.status, 403, "anonymous can't set avatars");
  });

  await step("remove photo: back to initials, file deleted", async () => {
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await page.getByText("Photo removed.").waitFor();
    assert.equal((await q("select avatar_url from public.profiles where user_id = $1", [ROBIN]))[0].avatar_url, null);
    assert.equal((await objects()).length, 0);
  });

  await step("deleting the account also deletes uploaded photos", async () => {
    await page.getByLabel("Choose a photo").setInputFiles({ name: "again.png", mimeType: "image/png", buffer: png(600, 600, [10, 10, 200]) });
    await page.getByText("Photo updated.").waitFor();
    assert.equal((await objects()).length, 1);
    await page.getByRole("button", { name: "Cancel" }).first().click();
    await page.locator("summary", { hasText: "Privacy and account" }).click();
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page.getByRole("button", { name: "Delete my account permanently" }).click();
    await page.waitForURL(`${BASE}/?deleted=1`);
    assert.equal((await objects()).length, 0, "photos removed");
    assert.equal((await q("select count(*)::int n from auth.users where id = $1", [ROBIN]))[0].n, 0);
  });

  assert.deepEqual(errors, [], "no page errors");
} finally {
  for (const [s, n] of steps) console.log(`${s} ${n}`);
  await browser.close();
  await db.end();
}
