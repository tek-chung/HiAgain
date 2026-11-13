// Measures bottom-tab navigation: time from tap until the new page heading is visible, and how
// many requests the app server makes to Supabase per navigation. Use with STUB_LATENCY_MS to
// simulate distance between the app server and the database.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL, STUB = process.env.STUB_URL;
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto(`${BASE}/sign-in?next=/people`);
await page.getByRole("button", { name: "Continue with LinkedIn" }).click();
await page.getByRole("link", { name: "Sign in as Alex Morgan" }).click();
await page.waitForURL(`${BASE}/people`);
await page.getByRole("heading", { name: "People" }).waitFor();
await page.waitForTimeout(1500); // let prefetching settle

const tabs = [["Activity", "Activity", "/activity"], ["My QR", null, "/me"], ["People", "People", "/people"]];
const rows = [];
for (let round = 0; round < 3; round++) {
  for (const [tab, heading, path] of tabs) {
    await fetch(`${STUB}/__test/stats?reset=1`);
    const t0 = Date.now();
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: new RegExp(`^${tab}`) }).click();
    // First visual response (loading state or page), then the finished page.
    // First visual response: the URL has changed and either the loading state or the page is showing.
    await page.waitForFunction(({ p, h }) => location.pathname === p &&
      (document.querySelector("main [data-loading]") !== null ||
       (h ? [...document.querySelectorAll("main h1")].some((e) => e.textContent === h) : document.querySelector("main .qr svg") !== null)),
      { p: path, h: heading }, { polling: 10 });
    const tFirst = Date.now();
    if (heading) await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    else await page.locator(".qr svg").waitFor();
    await page.locator("main [data-loading]").waitFor({ state: "detached" }).catch(() => {});
    const t1 = Date.now();
    const stats = await (await fetch(`${STUB}/__test/stats`)).json();
    const requests = Object.values(stats).reduce((a, b) => a + b, 0);
    rows.push({ tab, firstResponseMs: tFirst - t0, readyMs: t1 - t0, supabaseRequests: requests });
    if (process.env.PERF_VERBOSE && round === 2) console.log(`detail ${tab}: ${JSON.stringify(stats)}`);
    await page.waitForTimeout(800);
  }
}
const median = (xs) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const [tab] of tabs) {
  const r = rows.filter((x) => x.tab === tab);
  console.log(`perf ${tab.padEnd(8)} first response ${String(median(r.map((x) => x.firstResponseMs))).padStart(4)} ms · ready ${String(median(r.map((x) => x.readyMs))).padStart(4)} ms · ${median(r.map((x) => x.supabaseRequests))} Supabase requests`);
}
await browser.close();
