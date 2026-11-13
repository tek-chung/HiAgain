import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contextCandidates, joinMeIdeas, suggestedJoinMeWording, grantOutcome, SCOPE_EVENTS, SCOPE_CALENDAR_LIST,
  type CalendarEvent,
} from "../src/lib/core/calendar-match.ts";

const ev = (key: string, summary: string, start: string, end: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  key, summary, start, end, allDay: false, location: null, visibility: "default", declined: false, ...extra,
});

test("one event containing the save time", () => {
  const events = [
    ev("a", "Product Meetup London", "2026-11-12T18:00:00Z", "2026-11-12T21:00:00Z"),
    ev("b", "Dentist", "2026-11-12T09:00:00Z", "2026-11-12T09:30:00Z"),
  ];
  assert.deepEqual(contextCandidates("2026-11-12T19:15:00Z", events).map((e) => e.key), ["a"]);
});

test("30-minute margin either side, shortest first, all-day last, declined and untitled ignored", () => {
  const events = [
    ev("conf", "Web Summit", "2026-11-12T00:00:00Z", "2026-11-13T00:00:00Z", { allDay: true }),
    ev("long", "Conference day", "2026-11-12T08:00:00Z", "2026-11-12T18:00:00Z"),
    ev("talk", "Design systems talk", "2026-11-12T14:00:00Z", "2026-11-12T15:00:00Z"),
    ev("early", "Coffee", "2026-11-12T15:20:00Z", "2026-11-12T16:00:00Z"),
    ev("no", "Declined thing", "2026-11-12T14:00:00Z", "2026-11-12T16:00:00Z", { declined: true }),
    ev("blank", "  ", "2026-11-12T14:00:00Z", "2026-11-12T16:00:00Z"),
  ];
  assert.deepEqual(contextCandidates("2026-11-12T15:05:00Z", events).map((e) => e.key), ["early", "talk", "long", "conf"]);
  assert.deepEqual(contextCandidates("2026-11-12T22:00:00Z", events).map((e) => e.key), ["conf"]);
  assert.deepEqual(contextCandidates("2026-11-14T22:00:00Z", events), []);
});

test("Join me ideas: upcoming, not private, not dismissed, not tiny, deduplicated", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  const events = [
    ev("past", "Yesterday's meetup", "2026-11-12T18:00:00Z", "2026-11-12T20:00:00Z"),
    ev("pm", "Product Meetup London", "2026-11-19T18:00:00Z", "2026-11-19T20:00:00Z"),
    ev("pm2", "Product meetup london", "2026-11-26T18:00:00Z", "2026-11-26T20:00:00Z"),
    ev("priv", "1:1 with manager", "2026-11-14T10:00:00Z", "2026-11-14T11:00:00Z", { visibility: "private" }),
    ev("short", "Standup", "2026-11-14T09:00:00Z", "2026-11-14T09:15:00Z"),
    ev("dis", "Dismissed talk", "2026-11-15T18:00:00Z", "2026-11-15T19:00:00Z"),
    ev("far", "Next year", "2027-01-20T18:00:00Z", "2027-01-20T19:00:00Z"),
  ];
  assert.deepEqual(joinMeIdeas(events, now, new Set(["dis"])).map((e) => e.key), ["pm"]);
});

test("suggested wording stays within 180 characters", () => {
  const e = ev("pm", "Product Meetup London", "2026-11-19T18:00:00Z", "2026-11-19T20:00:00Z");
  assert.equal(suggestedJoinMeWording(e), "Join me at Product Meetup London on Thu 19 Nov?");
  const long = ev("x", "x".repeat(300), "2026-11-19T18:00:00Z", "2026-11-19T20:00:00Z");
  assert.ok(Array.from(suggestedJoinMeWording(long)).length <= 180);
});

test("granted scopes decide the connection state", () => {
  assert.equal(grantOutcome(`${SCOPE_EVENTS} ${SCOPE_CALENDAR_LIST}`), "connected");
  assert.equal(grantOutcome(SCOPE_EVENTS), "primary_only");
  assert.equal(grantOutcome(SCOPE_CALENDAR_LIST), "partial");
  assert.equal(grantOutcome(""), "partial");
});
