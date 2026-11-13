import Link from "next/link";
import { createClient, getViewer } from "@/lib/supabase/server";
import { ArchiveList, type Archived } from "@/components/ArchiveList";

export const metadata = { title: "Archive" };
export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const viewer = await getViewer();
  let archived: Archived[] | null = null;
  if (viewer) {
    const supabase = (await createClient())!;
    const [{ data }, { data: guests }] = await Promise.all([supabase.rpc("my_archived_people"), supabase.rpc("my_guest_encounters")]);
    archived = ((data as Array<Record<string, any>> | null) ?? []).map((r) => ({
      publicId: r.public_id, displayName: r.display_name ?? "", headline: r.headline, avatarUrl: r.avatar_url,
    }));
    for (const g of ((guests as Array<Record<string, any>> | null) ?? []).filter((g) => g.archived_at)) {
      archived.push({ publicId: `guest-${g.id}`, guestId: g.id, displayName: g.alias, headline: "Guest", avatarUrl: null });
    }
  }
  return (
    <section>
      <Link className="btn plain small" href="/people" style={{ paddingLeft: 0 }}>‹ People</Link>
      <h1>Archive</h1>
      <p className="small muted">Private to you. Archiving doesn&apos;t block anyone or remove notes.</p>
      <ArchiveList accountArchived={archived} />
    </section>
  );
}
