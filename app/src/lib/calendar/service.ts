import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent } from "@/lib/core/calendar-match";
import { decryptSecret } from "./crypto";
import { GoogleAuthError, isGoogleCalendarConfigured, listEvents, refreshAccessToken } from "./google";

export type CalendarStatus = "unavailable" | "not_connected" | "connected" | "partial" | "needs_reconnect";

export interface CalendarState {
  status: CalendarStatus;
  accountLabel: string | null;
  selectedCalendarIds: string[];
  primaryOnly: boolean;
}

export async function getCalendarState(supabase: SupabaseClient): Promise<CalendarState> {
  if (!isGoogleCalendarConfigured()) return { status: "unavailable", accountLabel: null, selectedCalendarIds: [], primaryOnly: false };
  const { data } = await supabase
    .from("calendar_connections")
    .select("status, account_label, selected_calendar_ids, granted_scopes")
    .maybeSingle();
  if (!data) return { status: "not_connected", accountLabel: null, selectedCalendarIds: [], primaryOnly: false };
  const scopes: string[] = data.granted_scopes ?? [];
  return {
    status: data.status,
    accountLabel: data.account_label,
    selectedCalendarIds: data.selected_calendar_ids ?? [],
    primaryOnly: !scopes.some((s) => s.endsWith("calendar.calendarlist.readonly")),
  };
}

/** A short-lived Google access token for the signed-in person, or null if they must reconnect. */
export async function accessTokenFor(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: enc } = await supabase.rpc("calendar_secret");
  if (!enc) return null;
  try {
    return await refreshAccessToken(decryptSecret(String(enc), userId));
  } catch (e) {
    if (e instanceof GoogleAuthError && e.kind === "invalid_grant") await supabase.rpc("mark_calendar_needs_reconnect");
    return null;
  }
}

/** Events from the selected calendars between two times. Raw events are never stored. */
export async function eventsBetween(
  supabase: SupabaseClient, userId: string, state: CalendarState, from: Date, to: Date,
): Promise<CalendarEvent[] | null> {
  if (state.status !== "connected") return null;
  const token = await accessTokenFor(supabase, userId);
  if (!token) return null;
  const ids = state.selectedCalendarIds.length ? state.selectedCalendarIds : ["primary"];
  try {
    const lists = await Promise.all(ids.map((id) => listEvents(token, id, from, to)));
    return lists.flat();
  } catch (e) {
    if (e instanceof GoogleAuthError && e.kind === "invalid_grant") await supabase.rpc("mark_calendar_needs_reconnect");
    return null;
  }
}
