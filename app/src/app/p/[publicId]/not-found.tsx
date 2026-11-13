import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <section className="stack">
      <h1>Profile not available</h1>
      <p className="muted">This QR code or link doesn&apos;t match a Hi Again profile. It may have been removed, or the link was copied incompletely.</p>
      <Link className="btn" href="/scan">Scan again</Link>
    </section>
  );
}
