import Link from "next/link";
import { createClient, getViewerId } from "@/lib/supabase/server";
import { isFixtureMode } from "@/lib/config";
import { ActivityList, type ActivityItem } from "@/components/ActivityList";

export const metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const viewerId = await getViewerId();
  if (!viewerId) {
    return (
      <section className="stack">
        <h1>Activity</h1>
        <p className="muted">Sign in to see answers, requests and interest you&apos;ve sent and received.</p>
        {!isFixtureMode && <Link className="btn primary" href="/sign-in?next=/activity">Sign in</Link>}
      </section>
    );
  }
  const supabase = (await createClient())!;
  const [{ data, error }, { data: matches }] = await Promise.all([supabase.rpc("my_activity"), supabase.rpc("my_matches")]);
  const items: ActivityItem[] = ((data as Array<Record<string, any>> | null) ?? []).map((r) => ({
    id: r.id, direction: r.direction, kind: r.kind, promptSnapshot: r.prompt_snapshot, body: r.body ?? "",
    sentAt: r.sent_at, editedAt: r.edited_at, version: Number(r.version), unread: Boolean(r.unread),
    other: { publicId: r.other_public_id, displayName: r.other_display_name ?? "", avatarUrl: r.other_avatar_url },
  }));
  for (const m of (matches as Array<Record<string, any>> | null) ?? []) {
    items.push({
      id: m.id, direction: "received", kind: "match", promptSnapshot: "", body: "", sentAt: m.matched_at, editedAt: null,
      version: 1, unread: Boolean(m.unread),
      other: { publicId: m.other_public_id, displayName: m.other_display_name ?? "", avatarUrl: m.other_avatar_url },
    });
  }
  return (
    <section>
      <h1>Activity</h1>
      {error && <p className="banner error" role="alert">Couldn&apos;t load Activity. Refresh to try again.</p>}
      <ActivityList items={items} />
    </section>
  );
}
