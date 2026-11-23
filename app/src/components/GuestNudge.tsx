"use client";
import { useEffect, useState } from "react";
import { startLinkedInSignIn } from "@/lib/auth-client";
import { logFunnel } from "@/lib/funnel";

/**
 * Shown to a guest once the profile is saved on their browser. The owner only sees them as an
 * anonymous nickname, so signing in is what lets the owner have them too — and gives them a QR of
 * their own. Their browser's saves are offered for import after sign-in, as before.
 */
export function GuestNudge({ name, publicId }: { name: string; publicId: string }) {
  const first = name.split(/\s+/)[0] || "They";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { logFunnel("guest_nudge_shown", publicId); }, [publicId]);

  return (
    <section className="card nudge" aria-labelledby="nudge-h" data-testid="guest-nudge">
      <h2 id="nudge-h" style={{ fontSize: "1rem", marginBottom: ".25rem" }}>{first} can&apos;t see who you are</h2>
      <p className="small muted" style={{ marginBottom: ".6rem" }}>
        You&apos;re an anonymous guest to {first}. Sign in with LinkedIn so {first} has you too, and get your own QR code to share. Takes a few seconds.
      </p>
      <button
        className="btn full" disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          logFunnel("guest_nudge_click");
          const r = await startLinkedInSignIn(window.location.pathname);
          if (!r.ok) { setError(r.message); setBusy(false); }
        }}
      >
        {busy ? "Opening LinkedIn…" : `Sign in so ${first} has you too`}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}
