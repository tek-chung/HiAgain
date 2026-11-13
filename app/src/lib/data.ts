import "server-only";
import { cache } from "react";
import type { PublicAction, PublicProfile } from "@/lib/core/types";
import { isValidPublicId } from "@/lib/core/public-id";
import { isFixtureMode } from "@/lib/config";
import { FIXTURE_PROFILES } from "@/lib/fixtures";
import { createClient } from "@/lib/supabase/server";

/** Reads a public profile. Only the fields defined by get_public_profile() can be returned. */
export const getPublicProfile = cache(async (publicId: string): Promise<PublicProfile | null> => {
  if (!isValidPublicId(publicId)) return null;
  if (isFixtureMode) return FIXTURE_PROFILES.find((p) => p.publicId === publicId) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase!.rpc("get_public_profile", { p_public_id: publicId });
  if (error) throw new Error("Profile lookup failed");
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    publicId: String(d.publicId),
    displayName: String(d.displayName ?? ""),
    headline: (d.headline as string | null) ?? null,
    avatarUrl: (d.avatarUrl as string | null) ?? null,
    linkedinUrl: (d.linkedinUrl as string | null) ?? null,
    actions: (d.actions as PublicAction[]) ?? [],
  };
});

export interface MyProfile {
  publicId: string;
  displayName: string;
  headline: string | null;
  linkedinUrl: string | null;
  avatarUrl: string | null;
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  let { data } = await supabase
    .from("profiles")
    .select("public_id, display_name, headline, linkedin_url, avatar_url")
    .maybeSingle();
  if (!data) {
    // Covers accounts that signed in before the callback created a profile.
    await supabase.rpc("ensure_starter_profile");
    ({ data } = await supabase
      .from("profiles")
      .select("public_id, display_name, headline, linkedin_url, avatar_url")
      .maybeSingle());
  }
  if (!data) return null;
  return {
    publicId: data.public_id,
    displayName: data.display_name,
    headline: data.headline,
    linkedinUrl: data.linkedin_url,
    avatarUrl: data.avatar_url,
  };
}
