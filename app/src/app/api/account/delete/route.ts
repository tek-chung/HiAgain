import { NextResponse } from "next/server";
import { createClient, getViewer } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/calendar/crypto";
import { revokeToken } from "@/lib/calendar/google";

// Permanently deletes the signed-in account: revokes Google Calendar access first, then deletes
// the account, which cascades to every record (including contributions sent to others).
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const supabase = (await createClient())!;
  const { data: enc } = await supabase.rpc("calendar_secret");
  if (enc) {
    try { await revokeToken(decryptSecret(String(enc), viewer.userId)); } catch { /* deletion still proceeds */ }
  }
  // Remove uploaded photos (Storage files don't cascade with the database).
  const bucket = supabase.storage.from("avatars");
  const { data: files } = await bucket.list(viewer.userId, { limit: 100 });
  if (files?.length) await bucket.remove(files.map((f) => `${viewer.userId}/${f.name}`));
  const { data, error } = await supabase.rpc("delete_my_account");
  if (error || data !== "deleted") return NextResponse.json({ error: "failed" }, { status: 500 });
  await supabase.auth.signOut().catch(() => undefined); // the session's user no longer exists; clear cookies
  return NextResponse.json({ ok: true });
}
