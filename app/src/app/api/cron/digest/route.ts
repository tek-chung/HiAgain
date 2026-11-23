import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { configuredSiteUrl, supabaseKey, supabaseUrl } from "@/lib/config";
import { buildDigestEmail } from "@/lib/core/digest";

// The next-day digest. Vercel Cron calls this once each morning with "Authorization: Bearer
// <CRON_SECRET>". The database releases the list only to the same secret (stored there as a hash
// by set_app_secret), so this route needs no privileged database key.
// Dormant until CRON_SECRET, RESEND_API_KEY and DIGEST_FROM are all set.
export const dynamic = "force-dynamic";

// RESEND_API_URL exists only so tests can point at a stand-in; real deployments leave it unset.
const RESEND_BATCH = `${process.env.RESEND_API_URL ?? "https://api.resend.com"}/emails/batch`;
const BATCH_SIZE = 100; // Resend's batch limit

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DIGEST_FROM;
  const site = configuredSiteUrl();
  if (!apiKey || !from || !site || !supabaseUrl || !supabaseKey) {
    return NextResponse.json({ status: "disabled", reason: "Set RESEND_API_KEY, DIGEST_FROM and NEXT_PUBLIC_SITE_URL to send digests." });
  }

  const db = createSupabaseClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("digest_due", { p_key: secret });
  if (error) {
    console.error("[cron/digest] digest_due failed:", error.message);
    return NextResponse.json({ error: "database" }, { status: 500 });
  }
  const due = (data as Array<{ user_id: string; email: string; first_name: string | null; people_count: number; event_name: string | null; new_matches: number }> | null) ?? [];

  const sent: string[] = [];
  let failed = 0;
  for (let i = 0; i < due.length; i += BATCH_SIZE) {
    const batch = due.slice(i, i + BATCH_SIZE);
    const payload = batch.map((d) => {
      const m = buildDigestEmail({
        firstName: d.first_name, peopleCount: Number(d.people_count), eventName: d.event_name,
        newMatches: Number(d.new_matches), siteUrl: site,
      });
      return {
        from, to: [d.email], subject: m.subject, text: m.text, html: m.html,
        headers: { "List-Unsubscribe": `<${site}/me#notifications>` },
      };
    });
    const r = await fetch(RESEND_BATCH, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    if (r?.ok) sent.push(...batch.map((d) => d.user_id));
    else {
      failed += batch.length;
      console.error("[cron/digest] send failed:", r?.status, r ? await r.text().catch(() => "") : "network");
    }
  }

  if (sent.length) {
    const { error: markError } = await db.rpc("digest_mark_sent", { p_key: secret, p_user_ids: sent });
    if (markError) console.error("[cron/digest] digest_mark_sent failed:", markError.message);
  }
  return NextResponse.json({ status: "ok", due: due.length, sent: sent.length, failed });
}
