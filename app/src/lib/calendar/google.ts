import "server-only";
import type { CalendarEvent } from "@/lib/core/calendar-match";
import { SCOPE_CALENDAR_LIST, SCOPE_EVENTS } from "@/lib/core/calendar-match";

// Minimal Google Calendar client over fetch. Endpoints can be overridden for local testing
// (GOOGLE_*_URL); production uses Google's real endpoints.
const AUTH_URL = process.env.GOOGLE_AUTH_URL ?? "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL ?? "https://oauth2.googleapis.com/token";
const REVOKE_URL = process.env.GOOGLE_REVOKE_URL ?? "https://oauth2.googleapis.com/revoke";
const API = process.env.GOOGLE_CALENDAR_API ?? "https://www.googleapis.com/calendar/v3";

export const CALENDAR_SCOPES = [SCOPE_CALENDAR_LIST, SCOPE_EVENTS];

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.CALENDAR_TOKEN_KEY);
}

export function authorizationUrl(opts: { redirectUri: string; state: string; codeChallenge: string }): string {
  const u = new URL(AUTH_URL);
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", CALENDAR_SCOPES.join(" "));
  u.searchParams.set("access_type", "offline"); // a refresh token, so people aren't asked again on every visit
  u.searchParams.set("prompt", "consent"); // only on an explicit connect/reconnect, so a fresh refresh token is issued
  u.searchParams.set("include_granted_scopes", "false");
  u.searchParams.set("state", opts.state);
  u.searchParams.set("code_challenge", opts.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

export class GoogleAuthError extends Error {
  constructor(public readonly kind: "invalid_grant" | "failed", message: string) {
    super(message);
  }
}

async function post(url: string, body: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, json };
}

export interface TokenSet { accessToken: string; refreshToken: string | null; scope: string }

export async function exchangeCode(code: string, redirectUri: string, codeVerifier: string): Promise<TokenSet> {
  const { ok, json } = await post(TOKEN_URL, {
    code, code_verifier: codeVerifier, redirect_uri: redirectUri, grant_type: "authorization_code",
    client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
  });
  if (!ok || typeof json.access_token !== "string") throw new GoogleAuthError("failed", "Token exchange failed");
  return { accessToken: json.access_token, refreshToken: (json.refresh_token as string) ?? null, scope: String(json.scope ?? "") };
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { ok, json } = await post(TOKEN_URL, {
    refresh_token: refreshToken, grant_type: "refresh_token",
    client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
  });
  if (!ok || typeof json.access_token !== "string") {
    // invalid_grant = expired, revoked or password changed: the person must reconnect.
    throw new GoogleAuthError(json.error === "invalid_grant" ? "invalid_grant" : "failed", "Refresh failed");
  }
  return json.access_token;
}

export async function revokeToken(token: string): Promise<void> {
  await post(REVOKE_URL, { token }).catch(() => undefined); // best effort
}

async function get(path: string, accessToken: string, params: Record<string, string> = {}) {
  const u = new URL(API + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (res.status === 401) throw new GoogleAuthError("invalid_grant", "Access rejected");
  if (!res.ok) throw new GoogleAuthError("failed", `Calendar request failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

export interface CalendarInfo { id: string; summary: string; primary: boolean }

export async function listCalendars(accessToken: string): Promise<CalendarInfo[]> {
  const json = await get("/users/me/calendarList", accessToken, { minAccessRole: "reader", maxResults: "50" });
  const items = (json.items as Array<Record<string, unknown>>) ?? [];
  return items
    .filter((c) => !c.deleted && !c.hidden)
    .map((c) => ({ id: String(c.id), summary: String(c.summaryOverride ?? c.summary ?? c.id), primary: Boolean(c.primary) }));
}

export async function listEvents(accessToken: string, calendarId: string, timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
  const json = await get(`/calendars/${encodeURIComponent(calendarId)}/events`, accessToken, {
    timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), singleEvents: "true", orderBy: "startTime",
    maxResults: "100", fields: "items(id,status,summary,location,visibility,start,end,attendees(self,responseStatus))",
  });
  const items = (json.items as Array<Record<string, any>>) ?? [];
  return items
    .filter((e) => e.status !== "cancelled" && e.start && e.end)
    .map((e) => {
      const allDay = Boolean(e.start.date && !e.start.dateTime);
      const self = (e.attendees as Array<{ self?: boolean; responseStatus?: string }> | undefined)?.find((a) => a.self);
      return {
        key: `${calendarId}:${e.id}`,
        summary: String(e.summary ?? "").slice(0, 200),
        start: allDay ? new Date(`${e.start.date}T00:00:00Z`).toISOString() : new Date(e.start.dateTime).toISOString(),
        end: allDay ? new Date(`${e.end.date}T00:00:00Z`).toISOString() : new Date(e.end.dateTime).toISOString(),
        allDay,
        location: e.location ? String(e.location).slice(0, 200) : null,
        visibility: (e.visibility ?? "default") as CalendarEvent["visibility"],
        declined: self?.responseStatus === "declined",
      };
    });
}
