"use client";
import { useEffect, useState } from "react";

type Status = "unavailable" | "not_connected" | "connected" | "partial" | "needs_reconnect";
interface Cal { id: string; summary: string; primary: boolean }

const OUTCOME_TEXT: Record<string, { tone: "" | "info" | "error"; text: string }> = {
  connected: { tone: "", text: "Google Calendar connected. Hi Again can now suggest where you met people." },
  primary_only: { tone: "info", text: "Connected to your main calendar only, because the calendar-list permission wasn't granted." },
  declined: { tone: "info", text: "No problem — Calendar isn't connected. Everything else works as before." },
  partial: { tone: "info", text: "Hi Again needs permission to view events to help. Nothing was stored. You can connect again any time." },
  error: { tone: "error", text: "Calendar connection didn't complete. Nothing changed — try again." },
  unavailable: { tone: "info", text: "Calendar connection isn't configured in this build." },
};

/** Optional, separate Google Calendar connection, shown on My QR. */
export function CalendarCard({ initialStatus, accountLabel, outcome }: { initialStatus: Status; accountLabel: string | null; outcome?: string }) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [calendars, setCalendars] = useState<Cal[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [primaryOnly, setPrimaryOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "connected") return;
    fetch("/api/calendar", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.status);
        setCalendars(d.calendars ?? []);
        setSelected(d.selectedCalendarIds ?? []);
        setPrimaryOnly(Boolean(d.primaryOnly));
      })
      .catch(() => setMessage("Couldn't load your calendars right now."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "unavailable") return null;
  const o = outcome ? OUTCOME_TEXT[outcome] : null;
  const connectHref = `/calendar/connect?returnTo=${encodeURIComponent("/me")}`;

  const toggle = async (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    if (!next.length) { setMessage("Keep at least one calendar selected, or disconnect."); return; }
    const before = selected;
    setSelected(next);
    const r = await fetch("/api/calendar", { method: "POST", body: JSON.stringify({ action: "select", ids: next }) }).catch(() => null);
    if (!r?.ok) { setSelected(before); setMessage("Couldn't save your calendar choice. Try again."); }
    else setMessage(null);
  };

  return (
    <section className="card" aria-labelledby="cal-h">
      <h2 id="cal-h" style={{ marginBottom: ".25rem" }}>Calendar</h2>
      {o && <p className={`banner small ${o.tone}`} role="status">{o.text}</p>}
      {status === "not_connected" || status === "partial" ? (
        <>
          <p className="small muted">Optional. Hi Again reads your Google Calendar to note privately where you met someone, and to suggest public events for Join me. It never posts, books or publishes anything without you.</p>
          <a className="btn full" href={connectHref}>Connect Google Calendar</a>
        </>
      ) : status === "needs_reconnect" ? (
        <>
          <p className="small">Google Calendar access has expired or was removed. Your QR, People and notes are unaffected.</p>
          <a className="btn primary full" href={connectHref}>Reconnect Google Calendar</a>
        </>
      ) : (
        <>
          <p className="small muted" style={{ marginBottom: ".5rem" }}>Connected{accountLabel ? ` as ${accountLabel}` : ""} · read-only · private to you</p>
          {primaryOnly && <p className="small muted">Using your main calendar.</p>}
          {calendars && calendars.length > 0 && (
            <fieldset style={{ border: 0, padding: 0, margin: "0 0 .5rem" }}>
              <legend className="small" style={{ fontWeight: 600 }}>Use these calendars</legend>
              {calendars.map((c) => (
                <label key={c.id} className="row" style={{ minHeight: 44 }}>
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span>{c.summary}{c.primary ? " (main)" : ""}</span>
                </label>
              ))}
            </fieldset>
          )}
          {message && <p className="field-error" role="alert">{message}</p>}
          <button
            className="btn plain small"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await fetch("/api/calendar", { method: "POST", body: JSON.stringify({ action: "disconnect" }) }).catch(() => null);
              setBusy(false);
              if (r?.ok) { setStatus("not_connected"); setMessage(null); }
              else setMessage("Couldn't disconnect. Try again.");
            }}
          >
            Disconnect Google Calendar
          </button>
        </>
      )}
    </section>
  );
}
