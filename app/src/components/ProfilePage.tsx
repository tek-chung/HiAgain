import "server-only";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/data";
import { createClient, getViewer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import type { Contribution } from "@/lib/core/types";
import { ProfileView, type ServerSave } from "@/components/ProfileView";
import type { AgainState } from "@/components/AgainBlock";

/** The profile page, shared by hiagain.link/<handle> and the older /p/<id> address. */
export async function ProfilePage({ publicId }: { publicId: string }) {
  const [profile, viewer] = await Promise.all([getPublicProfile(publicId), getViewer()]);
  if (!profile) notFound();

  const isSelf = Boolean(viewer && viewer.publicId === profile.publicId);
  let initialSave: ServerSave | null = null;
  let contributions: Contribution[] = [];
  let again: AgainState = "none";

  if (viewer && !isSelf) {
    const supabase = (await createClient())!;
    const [{ data: saved }, { data: contribs }, { data: againRows }] = await Promise.all([
      supabase.rpc("my_saved_person", { p_public_id: profile.publicId }),
      supabase.rpc("my_contributions_to", { p_public_id: profile.publicId }),
      supabase.rpc("my_again_state", { p_public_id: profile.publicId }),
    ]);
    again = ((againRows as Array<{ state: AgainState }> | null)?.[0]?.state) ?? "none";
    const mine = (saved as Array<Record<string, any>> | null)?.[0];
    if (mine) {
      initialSave = {
        savedAt: mine.saved_at, note: mine.note ?? "", noteUpdatedAt: mine.note_updated_at,
        archivedAt: mine.archived_at ?? null,
        context: mine.context_label ? { label: mine.context_label, source: mine.context_source, eventStart: mine.context_event_start } : null,
        contextDismissed: Boolean(mine.context_dismissed),
        source: mine.source ?? "scan",
      };
    }
    contributions = ((contribs as Array<Record<string, string | null>> | null) ?? []).map((c) => ({
      id: c.id!, actionId: c.action_id!, kind: c.kind as Contribution["kind"], promptSnapshot: c.prompt_snapshot!,
      body: c.body ?? "", sentAt: c.sent_at!, editedAt: c.edited_at, version: Number(c.version ?? 1),
    }));
  }

  return (
    <ProfileView
      profile={profile}
      viewer={viewer ? { userId: viewer.userId } : null}
      isSelf={isSelf}
      initialSave={initialSave}
      contributions={contributions}
      signInAvailable={isSupabaseConfigured}
      again={again}
    />
  );
}
