import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getViewer } from "@/lib/supabase/server";
import { authorizationUrl, isGoogleCalendarConfigured } from "@/lib/calendar/google";
import { safeNextPath, withParam } from "@/lib/core/redirect";

const OAUTH_COOKIE = "hiagain_cal_oauth";

// Starts the separate, optional Google Calendar connection. Requires a Hi Again session;
// the calendar grant never replaces or affects the LinkedIn sign-in.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const returnTo = safeNextPath(request.nextUrl.searchParams.get("returnTo"), "/me");
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(returnTo)}`, origin));
  if (!isGoogleCalendarConfigured()) return NextResponse.redirect(new URL(withParam(returnTo, "calendar", "unavailable"), origin));

  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const res = NextResponse.redirect(
    authorizationUrl({ redirectUri: `${origin}/calendar/callback`, state, codeChallenge: challenge }),
  );
  res.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, verifier, returnTo, uid: viewer.userId }), {
    httpOnly: true, sameSite: "lax", secure: origin.startsWith("https://"), path: "/calendar", maxAge: 600,
  });
  return res;
}
