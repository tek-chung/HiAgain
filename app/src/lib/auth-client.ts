"use client";
import { getBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/core/redirect";

export type SignInStart = { ok: true } | { ok: false; message: string };

/** Starts LinkedIn sign-in. The callback validates `next` again before redirecting. */
export async function startLinkedInSignIn(next: string): Promise<SignInStart> {
  const supabase = getBrowserClient();
  if (!supabase) {
    return { ok: false, message: "Sign-in isn't configured in this development build. Your draft and saves stay on this browser." };
  }
  const redirectTo = new URL("/auth/callback", window.location.origin);
  redirectTo.searchParams.set("next", safeNextPath(next));
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: { redirectTo: redirectTo.toString() },
  });
  if (error) return { ok: false, message: "Couldn't start LinkedIn sign-in. Check your connection and try again." };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = getBrowserClient();
  await supabase?.auth.signOut();
}
