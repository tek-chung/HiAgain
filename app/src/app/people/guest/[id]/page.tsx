import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";
import { GuestVisitorView } from "@/components/GuestVisitorView";

export const metadata = { title: "Guest visitor" };
export const dynamic = "force-dynamic";

export default async function GuestVisitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/people");
  const { data } = await (await createClient())!.rpc("my_guest_encounters");
  const g = ((data as Array<Record<string, any>> | null) ?? []).find((x) => x.id === id);
  if (!g) notFound();
  return (
    <section>
      <Link className="btn plain small" href="/people" style={{ paddingLeft: 0 }}>‹ People</Link>
      <GuestVisitorView id={g.id} alias={g.alias} firstAt={g.first_at} note={g.note ?? ""} noteUpdatedAt={g.note_updated_at} archivedAt={g.archived_at} />
    </section>
  );
}
