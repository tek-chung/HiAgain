// Browser check of the guest journey in development-fixture mode (no Supabase needed).
// Usage: npm run build && npm run start (in another terminal), then: npm run check:browser
// Env: BASE_URL (default http://localhost:3000), SHOTS_DIR (optional, saves screenshots).
import { chromium } from "playwright";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeQrVideo } from "./fake-camera.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
async function waitValue(locator, expected, ms = 5000) {
  const end = Date.now() + ms;
  let v;
  while (Date.now() < end) {
    v = await locator.inputValue().catch(() => undefined);
    if (v === expected) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(v, expected);
}

const browser = await chromium.launch();

async function run(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}-${width}.png`, fullPage: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // 1. My QR (fixture owner): real QR decodes to the profile URL
  await page.goto(`${BASE}/me`);
  const qr = page.locator(".qr");
  await qr.waitFor();
  const png = PNG.sync.read(await qr.screenshot());
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(code, "QR decodes");
  assert.equal(code.data, `${BASE}/p/DevAlexM0rgn`);
  await shot("my-qr");

  // 2. Guest scan: automatic save with honest wording
  await page.goto(`${BASE}/p/DevJamieChen`);
  await page.getByText("Saved on this browser. Sign in any time").waitFor();
  const stamp1 = await page.locator(".saved-context p").first().textContent();
  assert.match(stamp1, /^Saved \d{1,2} \w{3} \d{4}, \d{2}:\d{2} · this browser$/);

  // 3. Optional note persists across refresh, timestamp unchanged; repeat scan is not "new"
  await page.locator("summary", { hasText: "Notes" }).click();
  await page.getByRole("textbox", { name: "Private notes" }).fill("Met at the product meetup");
  await page.getByRole("button", { name: "Save note" }).click();
  await page.getByText("Saved.", { exact: true }).waitFor();
  await page.reload();
  await page.locator(".saved-context").waitFor();
  assert.equal(await page.locator(".saved-context p").first().textContent(), stamp1, "timestamp kept on repeat scan");
  await waitValue(page.getByRole("textbox", { name: "Private notes" }), "Met at the product meetup");
  assert.equal(await page.getByText("Saved on this browser. Sign in any time").count(), 0, "repeat scan not announced as new");
  await shot("profile-saved");

  // 4. Second person; People lists both once, grouped under Today, no per-row timestamps
  await page.goto(`${BASE}/p/DevSamPatel1`);
  await page.locator(".saved-context").waitFor();
  await page.goto(`${BASE}/p/DevJamieChen`);
  await page.locator(".saved-context").waitFor();
  await page.goto(`${BASE}/people`);
  await page.locator(".person").first().waitFor();
  assert.equal(await page.locator(".person").count(), 2, "no duplicates");
  assert.deepEqual(await page.locator(".group-label").allTextContents(), ["Today"]);
  assert.equal(await page.locator(".person").getByText(/\d{2}:\d{2}/).count(), 0, "no row timestamps");
  await shot("people");

  // 5. An unknown profile is handled honestly
  await page.goto(`${BASE}/p/NoSuchProf1e`);
  await page.getByText("Profile not available").waitFor();

  // 6. Draft continuity: compose, refresh, still there; sign-in attempt keeps it
  await page.goto(`${BASE}/p/DevAlexM0rgn`);
  await page.getByRole("button", { name: /Answer a question/ }).click();
  const box = page.getByPlaceholder("Write your answer");
  await box.fill("I'd love to hear how you run customer interviews.");
  await page.getByText("9 words · 49/1500").waitFor();
  await page.waitForTimeout(500); // debounce
  await page.reload();
  await page.getByRole("button", { name: /Answer a question/ }).click();
  await waitValue(page.getByPlaceholder("Write your answer"), "I'd love to hear how you run customer interviews.");
  await page.getByRole("button", { name: /Sign in to send/ }).click();
  await page.getByText("Sign-in isn't configured").waitFor();
  await waitValue(page.getByPlaceholder("Write your answer"), "I'd love to hear how you run customer interviews.");
  await shot("draft");

  // 7. Cancelled sign-in returns with the draft and an honest message
  const actionId = "00000000-0000-4000-8000-0000000000a2";
  await page.goto(`${BASE}/p/DevAlexM0rgn?resume=${actionId}&signin=cancelled`);
  await page.getByText("Sign-in was cancelled. Your draft is still here.").waitFor();
  await waitValue(page.getByPlaceholder("Write your answer"), "I'd love to hear how you run customer interviews.");
  await page.waitForURL(`${BASE}/p/DevAlexM0rgn`);

  // 8. Over-limit text is blocked with a visible counter
  await page.getByPlaceholder("Write your answer").fill("x".repeat(1501));
  await page.locator(".counter.over").waitFor();
  assert.ok(await page.getByRole("button", { name: /Sign in to send/ }).isDisabled());

  // 9. Simulated storage failure: no false success, retry offered
  await page.evaluate(() => sessionStorage.setItem("hiagain:simulateStorageFailure", "1"));
  await page.goto(`${BASE}/p/DevSamPatel1`);
  await page.getByText(/^Not saved\./).waitFor();
  assert.equal(await page.getByText(/Saved on this browser/).count(), 0);
  await page.getByRole("button", { name: "Try again" }).waitFor();
  await shot("storage-failure");
  await page.evaluate(() => sessionStorage.removeItem("hiagain:simulateStorageFailure"));
  await page.getByRole("button", { name: "Try again" }).click();
  await page.locator(".saved-context").waitFor();

  // 10. Open-redirect protection on the sign-in page
  await page.goto(`${BASE}/sign-in?next=https://evil.example`);
  await page.getByRole("button", { name: "Continue with LinkedIn" }).waitFor();

  // 11. Layout: no horizontal overflow; scan button top-right; tap targets ≥ 44px
  for (const path of ["/me", "/people", "/p/DevAlexM0rgn", "/scan"]) {
    await page.goto(`${BASE}${path}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${path} overflows by ${overflow}px at ${width}`);
  }
  const scan = await page.getByRole("link", { name: "Scan a QR code" }).boundingBox();
  assert.ok(scan.x + scan.width > width - 60 && scan.y < 60, "scan button top-right");
  assert.ok(scan.width >= 44 && scan.height >= 44);
  await page.getByLabel("Profile link").fill("https://example.com/not-a-profile");
  await page.getByRole("button", { name: "Open profile" }).click();
  await page.getByText("That isn't a Hi Again profile code or link.").waitFor();
  // A profile link from another address opens the profile here; it never navigates off-site.
  await page.getByLabel("Profile link").fill("https://other.example/p/DevAlexM0rgn");
  await page.getByRole("button", { name: "Open profile" }).click();
  await page.waitForURL(`${BASE}/p/DevAlexM0rgn`);

  assert.deepEqual(errors, [], "no page errors");
  await ctx.close();
}

// In-app camera scanning, with Chromium's fake camera showing a real QR code.
async function cameraCheck() {
  const results = [];
  for (const [label, text, expectNav, opts] of [
    ["other QR", "https://example.com/not-hi-again", false, {}],
    ["Hi Again QR", `${BASE}/p/DevJamieChen`, true, {}],
    // A phone held at arm's length: a small code in a high-definition frame.
    ["small QR in HD frame", `${BASE}/p/DevJamieChen`, true, { width: 1280, height: 720, qrSize: 150 }],
    // The whole square viewfinder counts: a code in its corner, not just the middle.
    ["QR in the corner of the square viewfinder", `${BASE}/p/DevJamieChen`, true, { width: 1280, height: 720, qrSize: 200, at: "square-edge" }],
    // Portrait phone camera (taller than wide), code near the square's edge.
    ["portrait camera, QR near the edge", `${BASE}/p/DevJamieChen`, true, { width: 720, height: 1280, qrSize: 200, at: "square-edge" }],
    // A code made on another address of the app (e.g. a Vercel preview) still opens here.
    ["QR from another Hi Again address", "https://hi-again-git-main-tek.vercel.app/p/DevJamieChen", true, {}],
  ]) {
    const file = join(tmpdir(), `hiagain-qr-${label.replace(/\W+/g, "-")}.y4m`);
    await writeQrVideo(text, file, opts);
    const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${file}`] });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ["camera"] });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/scan`);
    if (expectNav) {
      await page.waitForURL(`${BASE}/p/DevJamieChen`, { timeout: 15000 });
      await page.getByRole("heading", { name: "Jamie Chen" }).waitFor();
    } else {
      await page.getByText("That QR code isn't a Hi Again profile.").waitFor({ timeout: 15000 });
      const v = await page.evaluate(() => { const el = document.querySelector("video.scanner"); const r = el.getBoundingClientRect();
        return { w: el.videoWidth, playing: !el.paused && el.readyState >= 2, height: r.height, attached: Boolean(el.srcObject) }; });
      assert.ok(v.attached && v.playing && v.w > 0 && v.height > 100, `camera feed visible on screen: ${JSON.stringify(v)}`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/scan-camera-390.png` });
      assert.equal(page.url(), `${BASE}/scan`, "a non-Hi Again code doesn't navigate");
    }
    assert.deepEqual(errors, [], "no page errors");
    results.push(label);
    await b.close();
  }
  return results;
}

let failed = 0;
try {
  const r = await cameraCheck();
  console.log(`ok   camera scanning (${r.join(", ")})`);
} catch (e) {
  failed++;
  console.log(`FAIL camera scanning: ${e.message}`);
}
for (const width of [320, 390]) {
  try {
    await run(width);
    console.log(`ok   guest journey at ${width}px`);
  } catch (e) {
    failed++;
    console.log(`FAIL guest journey at ${width}px: ${e.message}\n${(e.stack ?? "").split("\n").find((l) => l.includes("browser-check")) ?? ""}`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
