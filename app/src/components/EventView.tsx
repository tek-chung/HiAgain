"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { startLinkedInSignIn } from "@/lib/auth-client";
import { formatEventTimes } from "@/lib/core/events";
import { logFunnel } from "@/lib/funnel";
import { ShareLink } from "./ShareLink";

export interface PublicEvent {
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
  organiserName: string;
  attendeeCount: number;
  isOn: boolean;
  hasEnded: boolean;
  isOrganiser: boolean;
  joined: boolean;
}

interface Props {
  event: PublicEvent;
  signedIn: boolean;
  signInAvailable: boolean;
  stats: { attendees: number; connections: number; mutualAgains: number | null } | null;
  qrSvg: string | null;
  url: string;
}

/**
 * The organiser sees the door QR and totals. A signed-in visitor joins automatically on opening
 * the page (scanning the door QR is the intent), like a profile is saved on opening it.
 * A guest is asked to sign in to join.
 */
export function EventView({ event, signedIn, signInAvailable, stats, qrSvg, url }: Props) {
  const router = useRouter();
  const [joined, setJoined] = useState(event.joined);
  const [state, setState] = useState<"idle" | "joining" | "error">("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const attempted = useRef(false);
  const when = formatEventTimes(event.startsAt, event.endsAt);

  useEffect(() => {
    if (event.isOrganiser && qrSvg) logFunnel("event_qr_shown", event.code);
  }, [event.isOrganiser, event.code, qrSvg]);

  useEffect(() => {
    if (!signedIn || joined || event.hasEnded || attempted.current) return;
    attempted.current = true;
    setState("joining");
    void (async () => {
      const { data, error } = (await getBrowserClient()?.rpc("join_event", { p_code: event.code })) ?? { data: null, error: true };
      if (error || !(data === "joined" || data === "already")) { setState("error"); return; }
      setJoined(true);
      setState("idle");
      router.refresh();
    })();
  }, [signedIn, joined, event.hasEnded, event.code, router]);

  return (
    <article>
      <p className="small muted" style={{ margin: 0 }}>Event · hosted by {event.organiserName || "the organiser"}</p>
      <h1>{event.name}</h1>
      <p className="muted" style={{ marginTop: 0 }}>{when}</p>

      {event.isOrganiser && qrSvg && (
        <section aria-label="Door QR">
          <div className="qr" role="img" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="event-qr-title">Scan to join {event.name}</p>
          <p className="small muted" style={{ textAlign: "center" }}>Show or print this at the door. People sign in with LinkedIn, then everyone they scan is remembered as met here.</p>
          <ShareLink url={url} name={event.name} />
          {stats && (
            <div className="stats" aria-label="Event totals" data-testid="event-stats">
              <div><strong>{stats.attendees}</strong><span className="small">joined</span></div>
              <div><strong>{stats.connections}</strong><span className="small">connections</span></div>
              <div><strong>{stats.mutualAgains ?? "–"}</strong><span className="small">mutual Agains</span></div>
            </div>
          )}
          {stats && stats.mutualAgains === null && (
            <p className="small muted">Mutual Agains show once 5 people have joined, so no one can work out who matched.</p>
          )}
          <p className="small muted">You see totals only, never who joined or who they met.</p>
        </section>
      )}

      {!event.isOrganiser && event.hasEnded && !joined && (
        <p className="banner info">This event has finished.</p>
      )}

      {!event.isOrganiser && signedIn && joined && (
        <section className="card" aria-label="You're in" data-testid="event-joined">
          <h2 style={{ fontSize: "1rem" }}>You&apos;re in</h2>
          <p className="small muted">
            Everyone you scan here, and everyone who scans you, is remembered as &ldquo;Met at {event.name}&rdquo;.
            Tomorrow morning you can choose who you&apos;d like to meet again.
          </p>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <Link className="btn primary" href="/me">Show my QR</Link>
            <Link className="btn" href="/scan">Scan someone</Link>
          </div>
          <button className="btn plain small" style={{ marginTop: ".5rem" }} disabled={busy} onClick={async () => {
            setBusy(true);
            const { data } = (await getBrowserClient()?.rpc("leave_event", { p_code: event.code })) ?? { data: null };
            setBusy(false);
            if (data === "left") { setJoined(false); attempted.current = true; setMessage("You've left this event. People you already met keep their context."); router.refresh(); }
            else setMessage("Couldn't leave. Try again.");
          }}>Leave event</button>
        </section>
      )}

      {!event.isOrganiser && signedIn && !joined && !event.hasEnded && (
        state === "error"
          ? <p className="banner error" role="alert">Couldn&apos;t join. Refresh to try again.</p>
          : state === "joining" ? <p className="small muted" role="status">Joining…</p> : null
      )}

      {!signedIn && !event.hasEnded && (
        <section className="card nudge" aria-label="Join this event" data-testid="event-guest">
          <h2 style={{ fontSize: "1rem" }}>Join {event.name}</h2>
          <p className="small muted">
            Sign in with LinkedIn to get your own QR code. Everyone you meet here is remembered as &ldquo;Met at {event.name}&rdquo;,
            and tomorrow you can choose who you&apos;d like to meet again. It&apos;s only revealed when it&apos;s mutual.
          </p>
          {signInAvailable ? (
            <button className="btn primary full" disabled={busy} onClick={async () => {
              setBusy(true);
              const r = await startLinkedInSignIn(`/e/${event.code}`);
              if (!r.ok) { setMessage(r.message); setBusy(false); }
            }}>{busy ? "Opening LinkedIn…" : "Join with LinkedIn"}</button>
          ) : (
            <p className="small muted">Sign-in isn&apos;t available in this development build.</p>
          )}
        </section>
      )}

      {message && <p className="small" role="status">{message}</p>}
      <p className="small muted" style={{ marginTop: "1rem" }}>{event.attendeeCount} {event.attendeeCount === 1 ? "person has" : "people have"} joined. The list of who joined is never shown.</p>
    </article>
  );
}
