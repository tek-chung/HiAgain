import { NextResponse } from "next/server";
import { createClient, getViewer } from "@/lib/supabase/server";
import { eventsBetween, getCalendarState } from "@/lib/calendar/service";
import { IDEA_HORIZON_DAYS, joinMeIdeas, suggestedJoinMeWording } from "@/lib/core/calendar-match";

const noStore = { headers: { "cache-control": "no-store" } };

// Private Join me ideas from upcoming events. Nothing here is published until the owner confirms.
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401, ...noStore });
  const supabase = (await createClient())!;
  const state = await getCalendarState(supabase);
  if (state.status !== "connected") return NextResponse.json({ status: state.status, ideas: [] }, noStore);
  const now = new Date();
  const events = await eventsBetween(supabase, viewer.userId, state, now, new Date(now.getTime() + IDEA_HORIZON_DAYS * 86_400_000));
  if (!events) return NextResponse.json({ status: (await getCalendarState(supabase)).status, ideas: [] }, noStore);
  const { data: dismissed } = await supabase.from("calendar_idea_dismissals").select("event_key");
  const ideas = joinMeIdeas(events, now, new Set((dismissed ?? []).map((d) => d.event_key))).slice(0, 12);
  return NextResponse.json({
    status: "connected",
    ideas: ideas.map((e) => ({ key: e.key, summary: e.summary, start: e.start, location: e.location, wording: suggestedJoinMeWording(e) })),
  }, noStore);
}
