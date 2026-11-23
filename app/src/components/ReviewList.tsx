"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { groupByDay } from "@/lib/core/dates";
import { logFunnel } from "@/lib/funnel";
import { Avatar } from "./Avatar";

export interface RecentPerson {
  publicId: string;
  handle?: string | null;
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
  savedAt: string;
  context: string | null;
  source: string;
  again: "none" | "sent" | "matched";
}

/**
 * The morning-after review: everyone met recently, each with a one-tap Again. Only the person's own
 * Again state is shown; an incoming one-sided Again never appears here.
 */
export function ReviewList({ people: initial, hasLinkedIn }: { people: RecentPerson[]; hasLinkedIn: boolean }) {
  const router = useRouter();
  const [people, setPeople] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { logFunnel("review_opened"); }, []);

  const toggle = async (p: RecentPerson) => {
    setBusy(p.publicId);
    setError(null);
    const { data, error: e } = (await getBrowserClient()?.rpc("set_again", { p_public_id: p.publicId, p_on: p.again !== "sent" })) ?? { data: null, error: true };
    setBusy(null);
    const row = Array.isArray(data) ? data[0] : null;
    if (e || !row) { setError("Couldn't update Again. Check your connection and try again."); return; }
    setPeople((list) => list.map((x) => (x.publicId === p.publicId ? { ...x, again: row.state } : x)));
    if (row.state === "matched") router.refresh();
  };

  if (people.length === 0) {
    return (
      <div className="card">
        <p style={{ marginTop: 0 }}><strong>No one from the last week.</strong></p>
        <p className="small muted">After an event, come back here to choose who you&apos;d like to meet again. It&apos;s only revealed when it&apos;s mutual.</p>
        <Link className="btn" href="/scan">Scan a code</Link>
      </div>
    );
  }

  // Group by event where there is one, otherwise by day.
  const byEvent = new Map<string, RecentPerson[]>();
  const rest: RecentPerson[] = [];
  for (const p of people) {
    if (p.context && p.source !== "guest_import") {
      const list = byEvent.get(p.context) ?? [];
      list.push(p);
      byEvent.set(p.context, list);
    } else rest.push(p);
  }
  const groups = [
    ...[...byEvent.entries()].map(([label, items]) => ({ label: `Met at ${label}`, items })),
    ...groupByDay(rest, (p) => p.savedAt),
  ];

  return (
    <div>
      {!hasLinkedIn && (
        <p className="banner info small">
          Add your LinkedIn link on <Link href="/me">My QR</Link> so a mutual Again has somewhere to go.
        </p>
      )}
      {error && <p className="banner error" role="alert">{error}</p>}
      {groups.map((g) => (
        <section key={g.label} aria-label={g.label}>
          <h2 className="group-label">{g.label}</h2>
          {g.items.map((p) => (
            <div className="person" key={p.publicId} data-testid="review-row">
              <Avatar name={p.displayName} src={p.avatarUrl} />
              <Link className="who" href={p.handle ? `/${p.handle}` : `/p/${p.publicId}`}>
                <strong>{p.displayName || "Unnamed profile"}</strong>
                {p.headline && <span>{p.headline}</span>}
              </Link>
              {p.again === "matched" ? (
                <Link className="btn small primary" href={`/p/${p.publicId}`}>It&apos;s mutual</Link>
              ) : (
                <button
                  className={"btn small" + (p.again === "sent" ? "" : " primary")}
                  aria-pressed={p.again === "sent"}
                  aria-label={p.again === "sent" ? `Again sent to ${p.displayName}. Tap to undo` : `Again with ${p.displayName}`}
                  disabled={busy === p.publicId}
                  onClick={() => toggle(p)}
                >
                  {p.again === "sent" ? "Again ✓" : "Again"}
                </button>
              )}
            </div>
          ))}
        </section>
      ))}
      <p className="small muted" style={{ marginTop: "1rem" }}>Only you can see who you chose. Someone finds out only if they chose you too.</p>
    </div>
  );
}
