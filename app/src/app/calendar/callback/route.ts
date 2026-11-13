import { NextResponse, type NextRequest } from "next/server";
import { createClient, getViewer } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/calendar/crypto";
import { exchangeCode, listCalendars, revokeToken } from "@/lib/calendar/google";
import { grantOutcome } from "@/lib/core/calendar-match";
import { safeNextPath, withParam } from "@/lib/core/redirect";

const OAUTH_COOKIE = "hiagain_cal_oauth";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = url.origin;
  let saved: { state?: string; verifier?: string; returnTo?: string; uid?: string } = {};
  try { saved = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value ?? "{}"); } catch { /* treated as invalid */ }
  const returnTo = safeNextPath(saved.returnTo, "/me");
  const done = (outcome: string) => {
    const res = NextResponse.redirect(new URL(withParam(returnTo, "calendar", outcome), origin));
    res.cookies.set(OAUTH_COOKIE, "", { path: "/calendar", maxAge: 0 });
    return res;
  };

  if (!saved.state || url.searchParams.get("state") !== saved.state || !saved.verifier) return done("error");
  const viewer = await getViewer();
  // The grant must land in the account that started it (guards against account switching mid-flow).
  if (!viewer || viewer.userId !== saved.uid) return done("error");

  const err = url.searchParams.get("error");
  if (err) return done(err === "access_denied" ? "declined" : "error");
  const code = url.searchParams.get("code");
  if (!code) return done("error");

  const supabase = (await createClient())!;
  let tokens;
  try {
    tokens = await exchangeCode(code, `${origin}/calendar/callback`, saved.verifier);
  } catch {
    return done("error");
  }
  const outcome = grantOutcome(tokens.scope);
  const scopes = tokens.scope.split(/\s+/).filter(Boolean);

  if (outcome === "partial") {
    // Without permission to view events nothing useful can happen: keep no token.
    await revokeToken(tokens.refreshToken ?? tokens.accessToken);
    await supabase.rpc("save_calendar_connection", {
      p_status: "partial", p_scopes: scopes, p_refresh_token_enc: null, p_account_label: null, p_selected: [],
    });
    return done("partial");
  }

  let label: string | null = null;
  let selected = ["primary"];
  if (outcome === "connected") {
    try {
      const cals = await listCalendars(tokens.accessToken);
      const primary = cals.find((c) => c.primary);
      label = primary?.summary ?? null;
      if (primary) selected = [primary.id];
    } catch { /* selection can be made later */ }
  }

  const { error } = await supabase.rpc("save_calendar_connection", {
    p_status: "connected",
    p_scopes: scopes,
    p_refresh_token_enc: tokens.refreshToken ? encryptSecret(tokens.refreshToken, viewer.userId) : null,
    p_account_label: label,
    p_selected: selected,
  });
  if (error) return done("error");
  if (!tokens.refreshToken) {
    // Should not happen with prompt=consent; if there is no stored token either, ask to reconnect.
    const { data: enc } = await supabase.rpc("calendar_secret");
    if (!enc) {
      await supabase.rpc("mark_calendar_needs_reconnect");
      return done("error");
    }
  }
  return done(outcome === "primary_only" ? "primary_only" : "connected");
}
