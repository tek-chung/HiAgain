import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, getViewerId } from "@/lib/supabase/server";
import { isFixtureMode, isSupabaseConfigured } from "@/lib/config";
import { isValidPublicId } from "@/lib/core/public-id";
import { siteUrl } from "@/lib/site-url";
import { qrSvg } from "@/lib/qr";
import { EventView, type PublicEvent } from "@/components/EventView";

// hiagain.link/e/<code>: an event's page. Its QR goes at the door; attendees join by scanning it.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

async function loadEvent(code: string): Promise<PublicEvent | null> {
  if (isFixtureMode || !isValidPublicId(code)) return null;
  const supabase = (await createClient())!;
  const { data, error } = await supabase.rpc("get_public_event", { p_code: code });
  if (error) throw new Error("Event lookup failed");
  return (data as PublicEvent | null) ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const e = await loadEvent(code).catch(() => null);
  return { title: e?.name ?? "Event", robots: { index: false, follow: false } };
}

export default async function EventPage({ params }: Params) {
  const { code } = await params;
  const event = await loadEvent(code);
  if (!event) notFound();
  const viewerId = await getViewerId();

  let stats: { attendees: number; connections: number; mutualAgains: number | null } | null = null;
  let svg: string | null = null;
  const url = `${await siteUrl()}/e/${event.code}`;
  if (event.isOrganiser) {
    const supabase = (await createClient())!;
    const { data } = await supabase.rpc("event_stats", { p_code: event.code });
    const r = (data as Array<{ attendees: number; connections: number; mutual_agains: number | null }> | null)?.[0];
    if (r) stats = { attendees: Number(r.attendees), connections: Number(r.connections), mutualAgains: r.mutual_agains === null ? null : Number(r.mutual_agains) };
    svg = await qrSvg(url);
  }

  return <EventView event={event} signedIn={Boolean(viewerId)} signInAvailable={isSupabaseConfigured} stats={stats} qrSvg={svg} url={url} />;
}
