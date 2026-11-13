"use client";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { LIMITS, countChars } from "@/lib/core/limits";

interface Idea { key: string; summary: string; start: string; location: string | null; wording: string }

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

/**
 * Private Join me ideas from upcoming calendar events, at the bottom of Edit profile.
 * Two at first, with Show more. Nothing becomes public until the owner edits the wording,
 * confirms the event is public and open to guests, and saves the profile.
 */
export function CalendarIdeas({ onUse }: { onUse: (wording: string) => void }) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [status, setStatus] = useState<string>("loading");
  const [expanded, setExpanded] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [wording, setWording] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [undo, setUndo] = useState<Idea[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar/ideas", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setStatus(d.status); setIdeas(d.ideas ?? []); })
      .catch(() => { setStatus("error"); setIdeas([]); });
  }, []);

  if (status === "unavailable") return null;
  const shown = (ideas ?? []).slice(0, expanded ? undefined : 2);

  const dismiss = async (idea: Idea) => {
    const { error: e } = (await getBrowserClient()?.rpc("dismiss_calendar_idea", { p_event_key: idea.key })) ?? { error: true };
    if (e) { setError("Couldn't dismiss that idea. Try again."); return; }
    setIdeas((list) => (list ?? []).filter((i) => i.key !== idea.key));
    setUndo((u) => [...u, idea]);
  };
  const undoLast = async () => {
    const idea = undo[undo.length - 1];
    if (!idea) return;
    const { error: e } = (await getBrowserClient()?.rpc("undismiss_calendar_idea", { p_event_key: idea.key })) ?? { error: true };
    if (e) { setError("Couldn't undo. Try again."); return; }
    setUndo((u) => u.slice(0, -1));
    setIdeas((list) => [...(list ?? []), idea].sort((a, b) => a.start.localeCompare(b.start)));
  };

  return (
    <section id="calendar-ideas" aria-labelledby="ideas-h" style={{ marginTop: "1rem" }}>
      <h3 id="ideas-h" style={{ fontSize: "1rem" }}>Ideas from your calendar</h3>
      <p className="small muted">Private to you. Only wording you approve appears on your profile.</p>
      {status === "loading" && <p className="small muted" role="status">Looking at your upcoming events…</p>}
      {status === "not_connected" || status === "partial" ? (
        <p className="small"><a href="/calendar/connect?returnTo=/me">Connect Google Calendar</a> to get suggestions for Join me.</p>
      ) : null}
      {status === "needs_reconnect" && <p className="small"><a href="/calendar/connect?returnTo=/me">Reconnect Google Calendar</a> to see suggestions.</p>}
      {status === "error" && <p className="small muted">Suggestions aren&apos;t available right now.</p>}
      {status === "connected" && ideas?.length === 0 && <p className="small muted">No suitable upcoming events. “Coffee and a catch-up?” works well too.</p>}
      {undo.length > 0 && (
        <p className="small" role="status">Idea dismissed. <button type="button" className="btn plain small" onClick={undoLast}>Undo</button></p>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      {shown.map((idea) => (
        <div key={idea.key} className="card" style={{ margin: ".5rem 0", padding: ".75rem" }}>
          <p style={{ margin: 0 }}><strong>{idea.summary}</strong></p>
          <p className="small muted" style={{ margin: 0 }}>{when(idea.start)}{idea.location ? ` · ${idea.location}` : ""}</p>
          {reviewing === idea.key ? (
            <div style={{ marginTop: ".5rem" }}>
              <label className="field">
                <span>Public wording</span>
                <textarea value={wording} onChange={(e) => setWording(e.target.value)} style={{ minHeight: "4rem" }} />
              </label>
              <div className={"counter" + (countChars(wording) > LIMITS.prompt ? " over" : "")}>{countChars(wording)}/{LIMITS.prompt}</div>
              <label className="row small" style={{ minHeight: 44 }}>
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>This event is public and open to guests</span>
              </label>
              <div className="row">
                <button type="button" className="btn" onClick={() => setReviewing(null)}>Cancel</button>
                <button
                  type="button"
                  className="btn primary"
                  style={{ flex: 1 }}
                  disabled={!confirmed || !wording.trim() || countChars(wording) > LIMITS.prompt}
                  onClick={() => { onUse(wording.trim()); setReviewing(null); }}
                >
                  Use for Join me
                </button>
              </div>
            </div>
          ) : (
            <div className="row" style={{ marginTop: ".25rem" }}>
              <button type="button" className="btn small" onClick={() => { setReviewing(idea.key); setWording(idea.wording); setConfirmed(false); }}>Review for Join me</button>
              <button type="button" className="btn plain small" onClick={() => dismiss(idea)} aria-label={`Dismiss ${idea.summary}`}>Dismiss</button>
            </div>
          )}
        </div>
      ))}
      {(ideas?.length ?? 0) > 2 && (
        <button type="button" className="btn plain small" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? "Show fewer ↑" : `Show ${(ideas?.length ?? 0) - 2} more ↓`}
        </button>
      )}
    </section>
  );
}
