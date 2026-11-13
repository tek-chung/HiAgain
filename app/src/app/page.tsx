import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/SignInButton";
import { getViewer } from "@/lib/supabase/server";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (await getViewer()) redirect("/me");
  return (
    <section className="stack">
      {sp.deleted && <p className="banner" role="status">Your account has been deleted.</p>}
      <h1>Don&apos;t just meet. Meet again.</h1>
      <p className="muted">Share your QR code at events. People who scan it can save you, answer your question or join you for a coffee — then make the second interaction happen.</p>
      <SignInButton next="/me" />
      <p className="small muted">Scanned someone already? They&apos;re in <Link href="/people">People</Link> on this browser.</p>
    </section>
  );
}
