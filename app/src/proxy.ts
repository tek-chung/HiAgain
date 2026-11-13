import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl, isSupabaseConfigured } from "@/lib/config";

// Refreshes the Supabase session cookie on navigation so Server Components see a valid session.
export async function proxy(request: NextRequest) {
  // If Supabase returns someone to a page other than /auth/callback (it falls back to the Site URL
  // when the redirect address isn't on its allow list), finish the sign-in anyway.
  const { pathname, searchParams } = request.nextUrl;
  if (searchParams.has("code") && !pathname.startsWith("/auth/callback") && !pathname.startsWith("/calendar/")) {
    const target = request.nextUrl.clone();
    target.pathname = "/auth/callback";
    const rest = new URLSearchParams(searchParams);
    rest.delete("code");
    const back = pathname + (rest.toString() ? `?${rest}` : "");
    target.search = "";
    target.searchParams.set("code", searchParams.get("code")!);
    target.searchParams.set("next", back === "/" ? "/me" : back);
    return NextResponse.redirect(target);
  }

  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  // Refreshes an expired session and verifies the token (locally, with asymmetric signing keys).
  // Do not add logic between client creation and this call.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
