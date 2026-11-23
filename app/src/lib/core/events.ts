// Event times: the create form's date and times are the organiser's local wall-clock times.
// Pure, so it can be unit-tested; the database applies the same limits again.

export const EVENT_NAME_MAX = 120;
export const EVENT_MAX_HOURS = 72;

export type EventTimes = { ok: true; startsAt: Date; endsAt: Date } | { ok: false; message: string };

/**
 * Builds start and end instants from "2026-11-27", "18:00" and "21:00" in the browser's time zone.
 * An end time earlier than the start means the event runs past midnight.
 */
export function eventTimesFromForm(date: string, start: string, end: string, now: Date = new Date()): EventTimes {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const s = /^(\d{2}):(\d{2})$/.exec(start);
  const e = /^(\d{2}):(\d{2})$/.exec(end);
  if (!d || !s || !e) return { ok: false, message: "Choose a date, a start time and an end time." };
  const startsAt = new Date(+d[1], +d[2] - 1, +d[3], +s[1], +s[2]);
  let endsAt = new Date(+d[1], +d[2] - 1, +d[3], +e[1], +e[2]);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return { ok: false, message: "That date doesn't look right." };
  if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86_400_000);
  if (endsAt.getTime() - startsAt.getTime() > EVENT_MAX_HOURS * 3_600_000) return { ok: false, message: "Events can last up to 3 days." };
  if (startsAt.getTime() < now.getTime() - 86_400_000) return { ok: false, message: "That's in the past. Choose today or a later date." };
  if (startsAt.getTime() > now.getTime() + 366 * 86_400_000) return { ok: false, message: "Choose a date within the next year." };
  return { ok: true, startsAt, endsAt };
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" });

/** "Thu 27 Nov, 18:00–21:00", or with both days when it spans midnight. Shown in UK time. */
export function formatEventTimes(startsAt: string | Date, endsAt: string | Date): string {
  const a = new Date(startsAt), b = new Date(endsAt);
  if (dayKey.format(a) === dayKey.format(b)) return `${dayFmt.format(a)}, ${timeFmt.format(a)}–${timeFmt.format(b)}`;
  return `${dayFmt.format(a)}, ${timeFmt.format(a)} – ${dayFmt.format(b)}, ${timeFmt.format(b)}`;
}
