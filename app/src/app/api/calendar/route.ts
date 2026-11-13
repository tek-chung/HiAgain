import { NextResponse, type NextRequest } from "next/server";
import { createClient, getViewer } from "@/lib/supabase/server";
import { accessTokenFor, getCalendarState } from "@/lib/calendar/service";
import { listCalendars, revokeToken } from "@/lib/calendar/google";
import { decryptSecret } from "@/lib/calendar/crypto";

const noStore = { headers: { "cache-control": "no-store" } };

// GET: connection state and, when allowed, the person's calendars for selection.
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401, ...noStore });
  const supabase = (await createClient())!;
  const state = await getCalendarState(supabase);
  let calendars: { id: string; summary: string; primary: boolean }[] = [];
  if (state.status === "connected" && !state.primaryOnly) {
    const token = await accessTokenFor(supabase, viewer.userId);
    if (token) {
      try { calendars = await listCalendars(token); } catch { /* shown as unavailable */ }
    }
    return NextResponse.json({ ...(await getCalendarState(supabase)), calendars }, noStore);
  }
  return NextResponse.json({ ...state, calendars }, noStore);
}

// POST { action: "select", ids } | { action: "disconnect" }
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const supabase = (await createClient())!;
  const body = (await request.json().catch(() => ({}))) as { action?: string; ids?: unknown };

  if (body.action === "select") {
    const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string" && x.length <= 300).slice(0, 50) : null;
    if (!ids) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const { error } = await supabase.rpc("set_calendar_selection", { p_calendar_ids: ids });
    return error ? NextResponse.json({ error: "failed" }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (body.action === "disconnect") {
    const { data: enc } = await supabase.rpc("calendar_secret");
    if (enc) {
      try { await revokeToken(decryptSecret(String(enc), viewer.userId)); } catch { /* still forget it locally */ }
    }
    const { error } = await supabase.rpc("disconnect_calendar");
    return error ? NextResponse.json({ error: "failed" }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
