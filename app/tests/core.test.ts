import { test } from "node:test";
import assert from "node:assert/strict";
import { groupLabel, groupByDay, exactTimestamp } from "../src/lib/core/dates.ts";
import { normaliseLinkedInUrl } from "../src/lib/core/linkedin.ts";
import { safeNextPath, withParam } from "../src/lib/core/redirect.ts";
import { isValidPublicId, publicIdFromScan, profileUrl } from "../src/lib/core/public-id.ts";
import { countChars, countWords } from "../src/lib/core/limits.ts";

// Friday 13 November 2026, 11:00 London (GMT)
const NOW = new Date("2026-11-13T11:00:00Z");

test("date groups: today, yesterday, last weekday, exact date", () => {
  assert.equal(groupLabel("2026-11-13T00:30:00Z", NOW), "Today");
  assert.equal(groupLabel("2026-11-12T23:59:00Z", NOW), "Yesterday");
  assert.equal(groupLabel("2026-11-11T09:00:00Z", NOW), "Last Wednesday");
  assert.equal(groupLabel("2026-11-07T09:00:00Z", NOW), "Last Saturday");
  assert.equal(groupLabel("2026-11-06T09:00:00Z", NOW), "6 November 2026");
});

test("date groups use London calendar days across BST", () => {
  // 23:30 UTC on 31 Aug is 00:30 BST on 1 Sep
  const now = new Date("2026-09-01T10:00:00Z");
  assert.equal(groupLabel("2026-08-31T23:30:00Z", now), "Today");
  assert.equal(groupLabel("2026-08-31T22:30:00Z", now), "Yesterday");
});

test("groupByDay orders newest first", () => {
  const items = [
    { id: "a", at: "2026-11-10T10:00:00Z" },
    { id: "b", at: "2026-11-13T10:00:00Z" },
    { id: "c", at: "2026-11-13T09:00:00Z" },
  ];
  const g = groupByDay(items, (i) => i.at, NOW);
  assert.deepEqual(g.map((x) => x.label), ["Today", "Last Tuesday"]);
  assert.deepEqual(g[0].items.map((i) => i.id), ["b", "c"]);
  assert.equal(exactTimestamp("2026-11-13T09:05:00Z"), "13 Nov 2026, 09:05");
});

test("LinkedIn URLs normalise to a canonical personal profile link", () => {
  const ok = (s: string) => {
    const r = normaliseLinkedInUrl(s);
    assert.ok(r.ok, s);
    return r.ok ? r.url : "";
  };
  assert.equal(ok("https://www.linkedin.com/in/alex-morgan/"), "https://www.linkedin.com/in/alex-morgan");
  assert.equal(ok("uk.linkedin.com/in/alex-morgan?trk=x#y"), "https://www.linkedin.com/in/alex-morgan");
  assert.equal(ok("linkedin.com/in/alex-morgan/details/experience"), "https://www.linkedin.com/in/alex-morgan");
  for (const bad of ["", "javascript:alert(1)", "https://evil.com/in/x", "https://linkedin.com.evil.com/in/alexm",
    "https://www.linkedin.com/company/acme", "https://user:pw@www.linkedin.com/in/alexm", "https://www.linkedin.com/in/a"]) {
    assert.equal(normaliseLinkedInUrl(bad).ok, false, bad);
  }
});

test("post-sign-in redirects stay on this site", () => {
  assert.equal(safeNextPath("/p/abcdefghijkl?resume=1"), "/p/abcdefghijkl?resume=1");
  for (const bad of [null, "", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "/\u0000x", "\\\\evil"]) {
    assert.equal(safeNextPath(bad as string), "/me", String(bad));
  }
  assert.equal(withParam("/p/x?a=1", "signin", "cancelled"), "/p/x?a=1&signin=cancelled");
});

test("public IDs and scanned links", () => {
  assert.ok(isValidPublicId("Ab3_-xYz0123"));
  assert.ok(!isValidPublicId("short"));
  assert.ok(!isValidPublicId("../../etc/pa"));
  const site = "https://hiagain.link";
  assert.equal(profileUrl(site, "Ab3_-xYz0123"), "https://hiagain.link/p/Ab3_-xYz0123");
  assert.equal(publicIdFromScan("https://hiagain.link/p/Ab3_-xYz0123", site), "Ab3_-xYz0123");
  assert.equal(publicIdFromScan("https://evil.link/p/Ab3_-xYz0123", site), null);
  assert.equal(publicIdFromScan("Ab3_-xYz0123", site), "Ab3_-xYz0123");
});

test("character counting uses code points", () => {
  assert.equal(countChars("café ☕"), 6);
  assert.equal(countChars("👋🏽"), 2);
  assert.equal(countWords("  two   words "), 2);
});
