import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl, isSupabaseConfigured } from "@/lib/config";

/** Supabase client bound to the visitor's session cookies. RLS applies; no privileged key is used. */
export async function createClient() {
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
}

export interface Viewer {
  userId: string;
  displayName: string;
  publicId: string | null;
}

/** The signed-in account, verified with Supabase Auth (not just decoded from a cookie). */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("public_id, display_name").maybeSingle();
  return {
    userId: data.user.id,
    displayName: profile?.display_name || "your account",
    publicId: profile?.public_id ?? null,
  };
}
