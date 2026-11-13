import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data";
import { getViewer } from "@/lib/supabase/server";
import { isFixtureMode } from "@/lib/config";
import { FIXTURE_PROFILES, FIXTURE_OWNER_ID } from "@/lib/fixtures";
import { profileUrl } from "@/lib/core/public-id";
import { siteUrl } from "@/lib/site-url";
import { qrSvg } from "@/lib/qr";
import { Avatar, LinkedInLink } from "@/components/Avatar";
import { ShareLink } from "@/components/ShareLink";
import { ProfileEditor } from "@/components/ProfileEditor";
import { SignOutButton } from "@/components/SignOutButton";
import { ImportPanel } from "@/components/ImportPanel";
import { CalendarCard } from "@/components/CalendarCard";
import { AccountSettings } from "@/components/AccountSettings";
import { createClient } from "@/lib/supabase/server";
import { getCalendarState, type CalendarState } from "@/lib/calendar/service";
import type { ActionKind } from "@/lib/core/types";

export const metadata = { title: "My QR" };

export default async function MyQrPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  let profile: { publicId: string; displayName: string; headline: string | null; linkedinUrl: string | null; avatarUrl: string | null };
  let viewer = null;
  const prompts: Record<ActionKind, string> = { join_me: "", question: "", feedback: "" };
  let calendar: CalendarState | null = null;
  let blocked: { publicId: string; displayName: string; avatarUrl: string | null }[] = [];

  if (isFixtureMode) {
    const f = FIXTURE_PROFILES.find((p) => p.publicId === FIXTURE_OWNER_ID)!;
    profile = f;
  } else {
    viewer = await getViewer();
    if (!viewer) redirect("/sign-in?next=/me");
    const mine = await getMyProfile();
    if (!mine) {
      return <p className="banner error" role="alert">We couldn&apos;t load your profile. Refresh to try again.</p>;
    }
    profile = mine;
    const supabase = (await createClient())!;
    const { data: acts } = await supabase.from("profile_actions").select("kind, prompt").eq("active", true);
    for (const a of acts ?? []) prompts[a.kind as ActionKind] = a.prompt;
    calendar = await getCalendarState(supabase);
    const { data: bl } = await supabase.rpc("my_blocked");
    blocked = ((bl as Array<Record<string, any>> | null) ?? []).map((b) => ({ publicId: b.public_id, displayName: b.display_name ?? "", avatarUrl: b.avatar_url }));
  }

  const url = profileUrl(await siteUrl(), profile.publicId);
  const svg = await qrSvg(url);
  const name = profile.displayName || "Your profile";

  return (
    <section>
      {isFixtureMode && (
        <p className="banner info small">Development fixture: this is a fictional profile. Configure Supabase to sign in with LinkedIn.</p>
      )}
      {sp.signin === "profile_failed" && (
        <p className="banner error" role="alert">You&apos;re signed in, but your profile couldn&apos;t be prepared. Refresh to try again.</p>
      )}
      {viewer && <ImportPanel accountName={viewer.displayName} />}
      <div className="row">
        <Avatar name={name} src={profile.avatarUrl} />
        <div>
          <div className="name-line"><h1 style={{ margin: 0 }}>{name}</h1><LinkedInLink url={profile.linkedinUrl} name={name} /></div>
          {profile.headline && <p className="muted" style={{ margin: 0 }}>{profile.headline}</p>}
        </div>
      </div>
      <div className="qr" role="img" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
      <p style={{ textAlign: "center", fontWeight: 600 }}>Let people scan this to save you</p>
      <ShareLink url={url} name={name} />
      <div style={{ marginTop: "1.25rem" }} className="stack">
        {!isFixtureMode && (
          <ProfileEditor
            displayName={profile.displayName}
            headline={profile.headline}
            linkedinUrl={profile.linkedinUrl}
            prompts={prompts}
            calendarAvailable={Boolean(calendar && calendar.status !== "unavailable")}
            userId={viewer!.userId}
            avatarUrl={profile.avatarUrl}
          />
        )}
        {calendar && <CalendarCard initialStatus={calendar.status} accountLabel={calendar.accountLabel} outcome={sp.calendar} />}
        <a className="btn full plain" href={`/p/${profile.publicId}`}>See what people see</a>
        {viewer && <AccountSettings userId={viewer.userId} blocked={blocked} />}
        {viewer && <div style={{ textAlign: "center" }}><SignOutButton userId={viewer.userId} /></div>}
      </div>
    </section>
  );
}
