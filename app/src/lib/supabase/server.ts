import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl, isSupabaseConfigured } from "@/lib/config";

/** Supabase client bound to the visitor's session cookies (one per request). RLS applies. */
export const createClient = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
});

/**
 * The signed-in account's ID, verified from the session token. With Supabase's asymmetric JWT
 * signing keys this is checked locally against the cached public key (no network round trip);
 * projects on legacy symmetric keys fall back to asking Supabase Auth. Cached per request.
 */
export const getViewerId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return !error && typeof sub === "string" ? sub : null;
});

export interface Viewer {
  userId: string;
  displayName: string;
  publicId: string | null;
}

/** The signed-in account plus its public ID and name (one small query). Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const userId = await getViewerId();
  if (!userId) return null;
  const supabase = (await createClient())!;
  const { data: profile } = await supabase.from("profiles").select("public_id, display_name").maybeSingle();
  return { userId, displayName: profile?.display_name || "your account", publicId: profile?.public_id ?? null };
});
