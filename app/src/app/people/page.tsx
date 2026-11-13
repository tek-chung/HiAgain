import { createClient, getViewer, getViewerId } from "@/lib/supabase/server";
import type { SavedPerson } from "@/lib/core/types";
import { PeopleList, type GuestVisitor } from "@/components/PeopleList";
import { ImportPanel } from "@/components/ImportPanel";

export const metadata = { title: "People" };
export const dynamic = "force-dynamic";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  let visitors: GuestVisitor[] = [];
  const viewerId = await getViewerId();
  let saves: (SavedPerson & { context?: string | null; source?: string })[] | null = null;
  let loadError = false;
  let viewer = null;
  if (viewerId) {
    const supabase = (await createClient())!;
    const [{ data, error }, { data: guests }, v] = await Promise.all([supabase.rpc("my_saved_people"), supabase.rpc("my_guest_encounters"), getViewer()]);
    viewer = v;
    visitors = ((guests as Array<Record<string, any>> | null) ?? [])
      .filter((g) => !g.archived_at)
      .map((g) => ({ id: g.id, alias: g.alias, firstAt: g.first_at }));
    if (error) loadError = true;
    saves = ((data as Array<Record<string, string | null>> | null) ?? []).map((r) => ({
      publicId: r.public_id!, displayName: r.display_name ?? "", headline: r.headline, avatarUrl: r.avatar_url,
      linkedinUrl: r.linkedin_url, savedAt: r.saved_at!, note: r.note ?? "", noteUpdatedAt: r.note_updated_at,
      context: r.context_label, source: r.source ?? undefined,
    }));
  }
  return (
    <section>
      <h1>People</h1>
      {viewer && <ImportPanel accountName={viewer.displayName} />}
      {loadError && <p className="banner error" role="alert">Couldn&apos;t load your People. Refresh to try again.</p>}
      <PeopleList accountSaves={saves} guestVisitors={visitors} notice={sp.blocked ? "Blocked. You won't see each other in Hi Again." : null} />
    </section>
  );
}
