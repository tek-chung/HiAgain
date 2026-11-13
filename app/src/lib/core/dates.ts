// Date grouping for People, matching the mock-up and reference §5.5:
// Today, Yesterday, "Last <weekday>" for 2–6 calendar days ago, then exact dates.
// Calendar days are computed in the display time zone (default Europe/London).

export const DEFAULT_TIME_ZONE = "Europe/London";

function calendarDayNumber(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(at);
  const v: Record<string, string> = {};
  for (const p of parts) v[p.type] = p.value;
  return Date.UTC(Number(v.year), Number(v.month) - 1, Number(v.day)) / 86_400_000;
}

export function daysAgo(at: Date | string, now: Date = new Date(), timeZone = DEFAULT_TIME_ZONE): number {
  return calendarDayNumber(now, timeZone) - calendarDayNumber(new Date(at), timeZone);
}

export function groupLabel(at: Date | string, now: Date = new Date(), timeZone = DEFAULT_TIME_ZONE): string {
  const d = new Date(at);
  const diff = daysAgo(d, now, timeZone);
  if (diff <= 0) return "Today"; // a slightly future clock skew still reads as Today
  if (diff === 1) return "Yesterday";
  if (diff < 7) {
    return "Last " + new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long" }).format(d);
  }
  return new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** Exact timestamp for person detail, e.g. "13 Nov 2026, 11:42". */
export function exactTimestamp(at: Date | string, timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(at));
}

export interface Group<T> {
  label: string;
  items: T[];
}

/** Groups newest first; items inside a group are newest first. */
export function groupByDay<T>(
  items: readonly T[],
  getAt: (item: T) => string | Date,
  now: Date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): Group<T>[] {
  const sorted = [...items].sort((a, b) => new Date(getAt(b)).getTime() - new Date(getAt(a)).getTime());
  const groups: Group<T>[] = [];
  for (const item of sorted) {
    const label = groupLabel(getAt(item), now, timeZone);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
