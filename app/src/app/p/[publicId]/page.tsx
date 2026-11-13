import type { Metadata } from "next";
import { getPublicProfile } from "@/lib/data";
import { ProfilePage } from "@/components/ProfilePage";

// Older address (/p/<id>), kept so every QR code printed before name links still works.
// Always render per request: the response depends on the visitor and must not be shared-cached.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ publicId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { publicId } = await params;
  const p = await getPublicProfile(publicId).catch(() => null);
  return {
    title: p?.displayName || "Profile",
    robots: { index: false, follow: false },
    ...(p?.handle ? { alternates: { canonical: `/${p.handle}` } } : {}),
  };
}

export default async function OldAddressProfilePage({ params }: Params) {
  const { publicId } = await params;
  return <ProfilePage publicId={publicId} />;
}
