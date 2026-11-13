import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/core/redirect";
import { clampDetail, type SignInReason } from "@/lib/core/signin-errors";

// OAuth return point. Exchanges the code (PKCE), creates the starter profile idempotently,
// then returns the person to where they started. Never redirects off-site. Failures go to a page
// that explains the likely cause, rather than silently back to the start.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  const origin = url.origin;

  const fail = (reason: SignInReason | "cancelled", detail?: string | null) => {
    // Profile pages keep the visitor's draft in view; everything else explains on the sign-in page.
    const target = next.startsWith("/p/") ? new URL(next, origin) : new URL("/sign-in", origin);
    if (!next.startsWith("/p/")) target.searchParams.set("next", next);
    target.searchParams.set("signin", reason === "cancelled" ? "cancelled" : "failed");
    if (reason !== "cancelled") target.searchParams.set("reason", reason);
    const d = clampDetail(detail);
    if (d) target.searchParams.set("detail", d);
    if (reason !== "cancelled") console.error(`[auth/callback] sign-in failed: ${reason}${d ? ` — ${d}` : ""}`);
    return NextResponse.redirect(target);
  };

  const supabase = await createClient();
  if (!supabase) return fail("not_configured");

  const providerError = url.searchParams.get("error");
  if (providerError) {
    return providerError === "access_denied"
      ? fail("cancelled")
      : fail("provider", url.searchParams.get("error_description") ?? providerError);
  }

  const code = url.searchParams.get("code");
  if (!code) return fail("no_code");

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail("exchange", error.message);

  const { error: profileError } = await supabase.rpc("ensure_starter_profile");
  if (profileError) return fail("profile", profileError.message);

  return NextResponse.redirect(new URL(next, origin));
}
