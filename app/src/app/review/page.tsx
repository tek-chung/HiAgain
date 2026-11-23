import { redirect } from "next/navigation";
import { createClient, getViewerId } from "@/lib/supabase/server";
import { isFixtureMode } from "@/lib/config";
import { getMyProfile } from "@/lib/data";
import { ReviewList, type RecentPerson } from "@/components/ReviewList";

export const metadata = { title: "Who to meet again" };
export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  if (isFixtureMode) {
    return (
      <section>
        <h1>Who would you like to meet again?</h1>
        <p className="banner info small">Development fixture: reviewing needs sign-in, which isn&apos;t configured here.</p>
      </section>
    );
  }
  const viewerId = await getViewerId();
  if (!viewerId) redirect("/sign-in?next=/review");
  const supabase = (await createClient())!;
  const [{ data, error }, mine] = await Promise.all([
    supabase.rpc("my_recent_people", { p_days: 7 }),
    getMyProfile(),
  ]);
  const people: RecentPerson[] = ((data as Array<Record<string, any>> | null) ?? []).map((r) => ({
    publicId: r.public_id, displayName: r.display_name ?? "", headline: r.headline, avatarUrl: r.avatar_url,
    savedAt: r.saved_at, context: r.context_label, source: r.source, again: r.again_state,
  }));
  return (
    <section>
      <h1>Who would you like to meet again?</h1>
      <p className="muted small">Everyone you met in the last week. Tap Again for anyone you&apos;d like to see again.</p>
      {error ? (
        <p className="banner error" role="alert">Couldn&apos;t load the people you met. Refresh to try again.</p>
      ) : (
        <ReviewList people={people} hasLinkedIn={Boolean(mine?.linkedinUrl)} />
      )}
    </section>
  );
}
