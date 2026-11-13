import { redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { SignInButton } from "@/components/SignInButton";
import { SignInProblem } from "@/components/SignInProblem";
import { safeNextPath } from "@/lib/core/redirect";
import { getViewer } from "@/lib/supabase/server";
import { isFixtureMode } from "@/lib/config";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (await getViewer()) redirect(next);
  return (
    <section className="stack">
      <LogoMark size={64} title="" />
      <h1>Sign in</h1>
      <p className="muted">Use LinkedIn to get your Hi Again QR code straight away. You can edit your profile later.</p>
      {sp.signin === "cancelled" && <p className="banner info" role="status">Sign-in was cancelled. Nothing on this browser was lost.</p>}
      {sp.signin === "failed" && <SignInProblem reason={sp.reason} detail={sp.detail} />}
      <SignInButton next={next} />
      {isFixtureMode && (
        <p className="banner info small">Development mode: Supabase isn't configured, so sign-in is unavailable. Public profiles, QR codes and guest saves still work.</p>
      )}
      <p className="small muted">We use your LinkedIn name and photo for a starter profile. Your email is never shown publicly.</p>
    </section>
  );
}
