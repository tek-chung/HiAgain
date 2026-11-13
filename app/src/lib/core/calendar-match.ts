// Pure calendar logic: which events plausibly explain a save, and which upcoming events
// could become a Join me idea. No provider calls here.

export interface CalendarEvent {
  key: string; // provider-unique: `${calendarId}:${eventId}`
  summary: string;
  start: string; // ISO; date-only events are given as midnight UTC of that date
  end: string;
  allDay: boolean;
  location: string | null;
  visibility: "default" | "public" | "private" | "confidential";
  declined: boolean;
}

export const MATCH_MARGIN_MINUTES = 30;

/**
 * Events around the save time, best first: timed events that contain the save time (with a
 * 30-minute margin either side), shortest first; then all-day events on that day.
 * Declined and untitled events are ignored.
 */
export function contextCandidates(savedAt: string | Date, events: readonly CalendarEvent[], max = 4): CalendarEvent[] {
  const t = new Date(savedAt).getTime();
  const margin = MATCH_MARGIN_MINUTES * 60_000;
  const usable = events.filter((e) => !e.declined && e.summary.trim());
  const timed = usable
    .filter((e) => !e.allDay && new Date(e.start).getTime() - margin <= t && t <= new Date(e.end).getTime() + margin)
    .sort((a, b) => duration(a) - duration(b));
  const allDay = usable.filter((e) => e.allDay && new Date(e.start).getTime() <= t && t < new Date(e.end).getTime());
  return dedupeByLabel([...timed, ...allDay]).slice(0, max);
}

function duration(e: CalendarEvent): number {
  return new Date(e.end).getTime() - new Date(e.start).getTime();
}

function dedupeByLabel(list: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return list.filter((e) => {
    const k = e.summary.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const IDEA_HORIZON_DAYS = 30;

/**
 * Upcoming events that might be worth inviting someone to. Calendar data can't prove an event
 * is public, so these are only private suggestions: the owner must confirm before publishing.
 * Private/confidential, declined, all-day and very short events are left out.
 */
export function joinMeIdeas(events: readonly CalendarEvent[], now: Date, dismissed: ReadonlySet<string>): CalendarEvent[] {
  const from = now.getTime();
  const to = from + IDEA_HORIZON_DAYS * 86_400_000;
  return dedupeByLabel(
    events
      .filter((e) => !e.declined && !e.allDay && e.summary.trim())
      .filter((e) => e.visibility !== "private" && e.visibility !== "confidential")
      .filter((e) => !dismissed.has(e.key))
      .filter((e) => duration(e) >= 30 * 60_000)
      .filter((e) => {
        const s = new Date(e.start).getTime();
        return s > from && s <= to;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
  );
}

/** Suggested public wording, within the 180-character prompt limit. The owner can edit it. */
export function suggestedJoinMeWording(e: CalendarEvent, timeZone = "Europe/London"): string {
  const when = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(new Date(e.start));
  const text = `Join me at ${e.summary.trim()} on ${when}?`;
  return Array.from(text).length <= 180 ? text : Array.from(`Join me at ${e.summary.trim()}`).slice(0, 178).join("") + "…?";
}

export type GrantOutcome = "connected" | "primary_only" | "partial";

export const SCOPE_EVENTS = "https://www.googleapis.com/auth/calendar.events.readonly";
export const SCOPE_CALENDAR_LIST = "https://www.googleapis.com/auth/calendar.calendarlist.readonly";

/** Interprets the scopes Google actually granted (people can untick permissions). */
export function grantOutcome(grantedScopeString: string | null | undefined): GrantOutcome {
  const granted = new Set((grantedScopeString ?? "").split(/\s+/).filter(Boolean));
  if (!granted.has(SCOPE_EVENTS)) return "partial";
  return granted.has(SCOPE_CALENDAR_LIST) ? "connected" : "primary_only";
}
