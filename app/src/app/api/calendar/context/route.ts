import { NextResponse, type NextRequest } from "next/server";
import { createClient, getViewer } from "@/lib/supabase/server";
import { eventsBetween, getCalendarState } from "@/lib/calendar/service";
import { contextCandidates } from "@/lib/core/calendar-match";
import { isValidPublicId } from "@/lib/core/public-id";

const noStore = { headers: { "cache-control": "no-store" } };

/**
 * Private encounter context for one saved person. With exactly one plausible event, it is saved
 * automatically as "Likely met at" (never replacing anything the person set or removed).
 * With several, the candidates are returned for the person to choose. Raw events are not stored.
 */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401, ...noStore });
  const publicId = request.nextUrl.searchParams.get("publicId");
  if (!isValidPublicId(publicId)) return NextResponse.json({ error: "invalid" }, { status: 400, ...noStore });

  const supabase = (await createClient())!;
  const state = await getCalendarState(supabase);
  const { data: saves } = await supabase.rpc("my_saved_people");
  const save = (saves as Array<Record<string, any>> | null)?.find((s) => s.public_id === publicId);
  if (!save) return NextResponse.json({ status: state.status, candidates: [] }, noStore);
  if (save.context_label || save.context_dismissed) {
    return NextResponse.json({ status: state.status, candidates: [], context: contextOf(save) }, noStore);
  }
  if (state.status !== "connected") return NextResponse.json({ status: state.status, candidates: [] }, noStore);

  const t = new Date(save.saved_at);
  const events = await eventsBetween(supabase, viewer.userId, state, new Date(t.getTime() - 36 * 3600_000), new Date(t.getTime() + 12 * 3600_000));
  if (!events) return NextResponse.json({ status: (await getCalendarState(supabase)).status, candidates: [] }, noStore);
  const candidates = contextCandidates(t, events);

  if (candidates.length === 1) {
    const c = candidates[0];
    const { data } = await supabase.rpc("set_saved_context", {
      p_public_id: publicId, p_label: c.summary, p_source: "calendar_auto", p_event_start: c.start, p_only_if_empty: true,
    });
    const row = Array.isArray(data) ? data[0] : null;
    return NextResponse.json({ status: "connected", candidates: [], context: row ? { label: row.context_label, source: row.context_source, eventStart: row.context_event_start } : null }, noStore);
  }
  return NextResponse.json({ status: "connected", candidates: candidates.map((c) => ({ label: c.summary, start: c.start, allDay: c.allDay })) }, noStore);
}

function contextOf(s: Record<string, any>) {
  return s.context_label ? { label: s.context_label, source: s.context_source, eventStart: s.context_event_start } : null;
}
