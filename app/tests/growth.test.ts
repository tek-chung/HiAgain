import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDigestEmail } from "../src/lib/core/digest.ts";
import { eventTimesFromForm, formatEventTimes } from "../src/lib/core/events.ts";
import { isDifferentBrowserError } from "../src/lib/core/signin-errors.ts";
import { isValidHandle, profilePathFromScan } from "../src/lib/core/public-id.ts";

test("digest: people met at an event, with counts only", () => {
  const m = buildDigestEmail({ firstName: "Pat", peopleCount: 3, eventName: "London Product Meetup", newMatches: 0, siteUrl: "https://hiagain.link/" });
  assert.equal(m.subject, "Who from London Product Meetup would you like to meet again?");
  assert.match(m.text, /^Hi Pat,/);
  assert.match(m.text, /You met 3 people at London Product Meetup yesterday/);
  assert.match(m.text, /https:\/\/hiagain\.link\/review/);
  assert.match(m.text, /https:\/\/hiagain\.link\/me#notifications/, "how to turn it off");
  assert.doesNotMatch(m.text, /someone (said|wants)/i, "never hints at a one-sided Again");
});

test("digest: one person, no event; matches only", () => {
  const one = buildDigestEmail({ firstName: null, peopleCount: 1, eventName: null, newMatches: 1, siteUrl: "https://hiagain.link" });
  assert.match(one.text, /^Hi,/);
  assert.match(one.text, /You met 1 person yesterday/);
  assert.match(one.text, /You have a new mutual Again/);
  const matchesOnly = buildDigestEmail({ firstName: "Q", peopleCount: 0, eventName: null, newMatches: 2, siteUrl: "https://hiagain.link" });
  assert.match(matchesOnly.subject, /mutual/);
  assert.match(matchesOnly.text, /2 new mutual Agains/);
  assert.match(matchesOnly.text, /hiagain\.link\/activity/);
});

test("digest: names and event titles are escaped in HTML", () => {
  const m = buildDigestEmail({ firstName: "<b>Al</b>", peopleCount: 2, eventName: "R&D <script>", newMatches: 0, siteUrl: "https://hiagain.link" });
  assert.doesNotMatch(m.html, /<script>|<b>Al/);
  assert.match(m.html, /R&amp;D &lt;script&gt;/);
});

test("event times: same evening, past midnight, limits", () => {
  const now = new Date(2026, 10, 23, 12, 0);
  const a = eventTimesFromForm("2026-11-27", "18:00", "21:00", now);
  assert.ok(a.ok);
  if (a.ok) assert.equal(a.endsAt.getTime() - a.startsAt.getTime(), 3 * 3_600_000);
  const b = eventTimesFromForm("2026-11-27", "22:00", "01:30", now);
  assert.ok(b.ok, "runs past midnight");
  if (b.ok) assert.equal(b.endsAt.getTime() - b.startsAt.getTime(), 3.5 * 3_600_000);
  assert.equal(eventTimesFromForm("", "18:00", "21:00", now).ok, false);
  assert.equal(eventTimesFromForm("2026-11-20", "18:00", "21:00", now).ok, false, "in the past");
  assert.equal(eventTimesFromForm("2028-01-01", "18:00", "21:00", now).ok, false, "over a year ahead");
});

test("event times are shown in UK time", () => {
  assert.equal(formatEventTimes("2026-11-27T18:00:00Z", "2026-11-27T21:00:00Z"), "Fri 27 Nov, 18:00–21:00");
  assert.equal(formatEventTimes("2026-06-05T17:00:00Z", "2026-06-05T20:00:00Z"), "Fri 5 Jun, 18:00–21:00", "BST");
  assert.equal(formatEventTimes("2026-11-27T22:00:00Z", "2026-11-28T01:30:00Z"), "Fri 27 Nov, 22:00 – Sat 28 Nov, 01:30");
});

test("different-browser sign-in is recognised for the automatic retry", () => {
  assert.ok(isDifferentBrowserError("invalid request: both auth code and code verifier should be non-empty; code verifier not found in storage"));
  assert.ok(isDifferentBrowserError("PKCE flow initiated in a different browser"));
  assert.equal(isDifferentBrowserError("Unable to exchange external code"), false);
  assert.equal(isDifferentBrowserError(null), false);
});

test("event door QR links open in the app; new pages are never profiles", () => {
  assert.equal(profilePathFromScan("https://hiagain.link/e/Ab3_xY9-k2Lm"), "/e/Ab3_xY9-k2Lm");
  assert.equal(profilePathFromScan("https://evil.example/e/Ab3_xY9-k2Lm"), null, "only Hi Again's own addresses");
  assert.equal(profilePathFromScan("https://hiagain.link/e/short"), null);
  for (const w of ["review", "events", "e", "offline"]) assert.equal(isValidHandle(w), false, w);
});
