import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getViewerId } from "@/lib/supabase/server";
import { isFixtureMode } from "@/lib/config";
import { formatEventTimes } from "@/lib/core/events";
import { EventCreateForm } from "@/components/EventCreateForm";

export const metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  if (isFixtureMode) {
    return (
      <section>
        <h1>Events</h1>
        <p className="banner info small">Development fixture: events need sign-in, which isn&apos;t configured here.</p>
      </section>
    );
  }
  const viewerId = await getViewerId();
  if (!viewerId) redirect("/sign-in?next=/events");
  const supabase = (await createClient())!;
  const { data } = await supabase.rpc("my_events");
  const events = (data as Array<{ code: string; name: string; starts_at: string; ends_at: string; is_organiser: boolean; attendee_count: number }> | null) ?? [];

  return (
    <section>
      <h1>Events</h1>
      <p className="muted small">
        Put one QR at the door. Everyone who scans it and signs in has the people they meet there remembered as
        &ldquo;Met at&rdquo; your event, and the next morning they&apos;re asked who they&apos;d like to meet again. You see totals, never names.
      </p>
      <EventCreateForm />
      {events.length > 0 && (
        <>
          <h2 className="group-label">Your events</h2>
          {events.map((e) => (
            <Link key={e.code} href={`/e/${e.code}`} className="person" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="who">
                <strong>{e.name}</strong>
                <span>{formatEventTimes(e.starts_at, e.ends_at)} · {e.is_organiser ? "Organiser" : "Attending"} · {Number(e.attendee_count)} joined</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </Link>
          ))}
        </>
      )}
    </section>
  );
}
