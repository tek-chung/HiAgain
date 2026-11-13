// Runtime configuration. Without Supabase settings the app runs in development-fixture mode:
// fictional public profiles, real QR codes and real browser-local guest saves, but no sign-in.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const isFixtureMode = !isSupabaseConfigured;

export function configuredSiteUrl(): string | null {
  const v = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return v ? v.replace(/\/+$/, "") : null;
}
