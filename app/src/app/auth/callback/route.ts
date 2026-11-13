import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath, withParam } from "@/lib/core/redirect";

// OAuth return point. Exchanges the code (PKCE), creates the starter profile idempotently,
// then returns the person to where they started. Never redirects off-site.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  const origin = url.origin;
  const supabase = await createClient();

  const providerError = url.searchParams.get("error");
  if (providerError || !supabase) {
    const reason = providerError === "access_denied" ? "cancelled" : "failed";
    return NextResponse.redirect(new URL(withParam(next, "signin", reason), origin));
  }

  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL(withParam(next, "signin", "failed"), origin));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(withParam(next, "signin", "failed"), origin));

  const { error: profileError } = await supabase.rpc("ensure_starter_profile");
  if (profileError) return NextResponse.redirect(new URL(withParam("/me", "signin", "profile_failed"), origin));

  return NextResponse.redirect(new URL(next, origin));
}
