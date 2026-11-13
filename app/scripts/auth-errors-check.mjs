// Sign-in failure handling against the test-only stub. Runs first.
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL, STUB = process.env.STUB_URL;
const ALEX = "00000000-0000-4000-8000-0000000000a1";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const steps = [];
const step = async (name, fn) => {
  try { await fn(); steps.push(["ok  ", name]); }
  catch (e) { steps.push(["FAIL", `${name}: ${e.message.split("\n")[0]}`]); await page.screenshot({ path: "/tmp/shots/auth-fail.png", fullPage: true }).catch(() => {}); throw e; }
};

try {
  await step("LinkedIn credential error is explained, not a silent bounce", async () => {
    await page.goto(`${BASE}/auth/callback?error=server_error&error_description=${encodeURIComponent("Unable to exchange external code: 4/0AQ")}&next=/me`);
    await page.waitForURL(/\/sign-in\?/);
    await page.getByText("LinkedIn rejected the app credentials.").waitFor();
    await page.getByText(/Technical detail: provider — Unable to exchange external code/).waitFor();
    await page.getByRole("button", { name: "Continue with LinkedIn" }).waitFor();
  });

  await step("a broken code exchange is explained", async () => {
    await page.goto(`${BASE}/auth/callback?code=not-a-real-code&next=/me`);
    await page.waitForURL(/\/sign-in\?/);
    await page.getByText("Sign-in finished on a different web address").waitFor();
  });

  await step("Supabase returning to the home page (Site URL fallback) still completes sign-in", async () => {
    await page.goto(`${BASE}/sign-in?next=/me`);
    await page.getByRole("button", { name: "Continue with LinkedIn" }).click();
    await page.waitForURL(/\/auth\/v1\/authorize/);
    // Simulate Supabase ignoring a non-allow-listed redirect and using the Site URL instead.
    await page.goto(`${STUB}/__login?user=${ALEX}&redirect_to=${encodeURIComponent(`${BASE}/`)}`);
    await page.waitForURL(`${BASE}/me`);
    await page.locator(".qr svg").waitFor();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(`${BASE}/`);
  });

  assert.deepEqual(errors, [], "no page errors");
} finally {
  for (const [s, n] of steps) console.log(`${s} ${n}`);
  await browser.close();
}
