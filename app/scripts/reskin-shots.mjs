// Screenshots of the reskinned surfaces (QR profile, People, saved detail, mutual Again, a long
// name without a photo) at 320, 390 and 1024px in light and dark mode, plus layout assertions.
// Fictional people; portraits are generated abstract images. SHOTS_PREFIX names the files.
import { chromium } from "playwright";
import pg from "pg";
import { PNG } from "pngjs";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL;
const PREFIX = process.env.SHOTS_PREFIX ?? "after";
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const ALEX = "00000000-0000-4000-8000-0000000000a1", JAMIE = "00000000-0000-4000-8000-0000000000b1", SAM = "00000000-0000-4000-8000-0000000000c1";
const PRIYA = "00000000-0000-4000-8000-0000000000d1";
const pid = async (u) => (await q("select public_id, handle from public.profiles where user_id = $1", [u]))[0];

// An abstract "portrait": soft background, a head and shoulders in a darker tone.
function portrait(bg, fg) {
  const w = 256, h = 256, p = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const head = (x - 128) ** 2 + (y - 100) ** 2 < 48 ** 2;
    const body = (x - 128) ** 2 / 95 ** 2 + (y - 250) ** 2 / 85 ** 2 < 1;
    const c = head || body ? fg : bg;
    p.data[i] = c[0]; p.data[i + 1] = c[1]; p.data[i + 2] = c[2]; p.data[i + 3] = 255;
  }
  return PNG.sync.write(p);
}

const browser = await chromium.launch();
const steps = [];
const step = async (name, fn) => {
  try { await fn(); steps.push(["ok  ", name]); }
  catch (e) { steps.push(["FAIL", `${name}: ${e.message.split("\n")[0]}`]); throw e; }
};
async function ctx(width, scheme) {
  const c = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
  const page = await c.newPage();
  page.errors = []; page.on("pageerror", (e) => page.errors.push(e.message));
  return page;
}
async function signIn(page, name, next) {
  await page.goto(`${BASE}/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: "Continue with LinkedIn" }).click();
  await page.getByRole("link", { name: `Sign in as ${name}` }).click();
  await page.waitForURL(`${BASE}${next}`);
}
async function setPhoto(name, png) {
  const page = await ctx(390, "light");
  await signIn(page, name, "/me");
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.getByLabel("Choose a photo").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: png });
  await page.getByText("Photo updated.").waitFor();
  await page.context().close();
}
async function noOverflow(page) {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(o <= 0, `horizontal overflow ${o}px`);
}

try {
  await step("fixtures: photos, a long name without a photo, saves, context and a mutual Again", async () => {
    await setPhoto("Alex Morgan", portrait([234, 242, 231], [74, 104, 88]));
    await setPhoto("Jamie Chen", portrait([243, 233, 219], [150, 110, 80]));
    await setPhoto("Sam Patel", portrait([226, 236, 246], [70, 90, 130]));
    await q("update public.profiles set display_name = 'Priya Shah-Ramanathan Venkataraman', headline = 'Head of Partnerships, Community Investment and Climate Programmes · Manchester' where user_id = $1", [PRIYA]);
    const p = await ctx(390, "light");
    await signIn(p, "Sam Patel", "/people");
    for (const u of [ALEX, PRIYA]) { await p.goto(`${BASE}/p/${(await pid(u)).public_id}`); await p.getByText(/Saved to your People|Saved/).first().waitFor(); }
    await q("update public.saved_people set context_label = 'Climate Tech Meetup', context_source = 'manual', context_updated_at = now() where saver_id = $1 and subject_id = $2", [SAM, JAMIE]);
    await q("update public.saved_people set context_label = 'Founders Breakfast', context_source = 'calendar_auto', context_updated_at = now() where saver_id = $1 and subject_id = $2", [SAM, ALEX]);
    await q("insert into public.again_signals (sender_id, recipient_id) values ($1, $2), ($2, $1) on conflict do nothing", [SAM, ALEX]);
    await q("insert into public.again_matches (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid)) on conflict do nothing", [SAM, ALEX]);
    await p.context().close();
  });

  const alex = await pid(ALEX), jamie = await pid(JAMIE), priya = await pid(PRIYA);
  for (const scheme of ["light", "dark"]) for (const width of [320, 390, 1024]) {
    await step(`${scheme} ${width}px: QR profile, People, saved detail, mutual Again`, async () => {
      const g = await ctx(width, scheme);
      await g.goto(`${BASE}/${alex.handle}`);
      await g.getByRole("button", { name: "Again", exact: true }).waitFor();
      await g.waitForTimeout(300);
      await noOverflow(g);
      await g.screenshot({ path: `/tmp/shots/${PREFIX}-profile-${scheme}-${width}.png`, fullPage: true });
      await g.context().close();

      const s = await ctx(width, scheme);
      await signIn(s, "Sam Patel", "/people");
      await s.getByText("Jamie Chen").first().waitFor();
      await noOverflow(s);
      // Navigation: three equal items, label centred under the icon, active item follows the route.
      const nav = await s.evaluate(() => [...document.querySelectorAll("nav.nav a")].map((a) => {
        const r = a.getBoundingClientRect(), svg = a.querySelector("svg").getBoundingClientRect();
        return { w: Math.round(r.width), centre: Math.round(r.left + r.width / 2), icon: Math.round(svg.left + svg.width / 2), current: a.getAttribute("aria-current") };
      }));
      assert.equal(nav.length, 3);
      assert.ok(Math.max(...nav.map((n) => n.w)) - Math.min(...nav.map((n) => n.w)) <= 1, "equal widths");
      for (const n of nav) assert.ok(Math.abs(n.centre - n.icon) <= 1, "icon centred");
      assert.equal(nav[0].current, "page");
      await s.screenshot({ path: `/tmp/shots/${PREFIX}-people-${scheme}-${width}.png`, fullPage: true });

      await s.goto(`${BASE}/p/${jamie.public_id}`);
      await s.getByText("Climate Tech Meetup").waitFor();
      await noOverflow(s);
      await s.screenshot({ path: `/tmp/shots/${PREFIX}-saved-${scheme}-${width}.png`, fullPage: true });

      await s.goto(`${BASE}/p/${alex.public_id}`);
      await s.getByRole("button", { name: "Copy message" }).waitFor();
      await noOverflow(s);
      await s.screenshot({ path: `/tmp/shots/${PREFIX}-mutual-${scheme}-${width}.png`, fullPage: true });

      if (width === 390) {
        await s.goto(`${BASE}/p/${priya.public_id}`);
        await s.getByRole("button", { name: "Again", exact: true }).waitFor();
        await noOverflow(s);
        await s.screenshot({ path: `/tmp/shots/${PREFIX}-long-${scheme}-${width}.png`, fullPage: true });
      }
      assert.deepEqual([...g.errors, ...s.errors], [], "no page errors");
      await s.context().close();
    });
  }
} finally {
  for (const [s, n] of steps) console.log(`${s} ${n}`);
  await browser.close();
  await db.end();
}
