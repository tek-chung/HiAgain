import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicProfile, resolveHandle } from "@/lib/data";
import { ProfilePage } from "@/components/ProfilePage";

// hiagain.link/<handle>: the name-based profile address, taken from the person's LinkedIn name.
// App pages (/me, /people, …) are separate routes and take precedence over this one.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const r = await resolveHandle(handle).catch(() => null);
  const p = r ? await getPublicProfile(r.publicId).catch(() => null) : null;
  return { title: p?.displayName || "Profile", robots: { index: false, follow: false } };
}

export default async function HandleProfilePage({ params, searchParams }: Params & { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { handle } = await params;
  const r = await resolveHandle(handle);
  if (!r) notFound();
  if (r.currentHandle !== handle) {
    // An earlier link (the LinkedIn name changed since) or different capitalisation: go to the
    // current address. Temporary redirect, because a name can change back.
    const sp = await searchParams;
    const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v ? [[k, v]] : [])));
    redirect(`/${r.currentHandle}${qs.size ? `?${qs}` : ""}`);
  }
  return <ProfilePage publicId={r.publicId} />;
}
