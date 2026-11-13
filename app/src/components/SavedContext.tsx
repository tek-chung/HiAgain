"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";

export interface EncounterContext { label: string; source: "calendar_auto" | "calendar_chosen" | "manual"; eventStart: string | null }
interface Candidate { label: string; start: string; allDay: boolean }

/**
 * Private "where we met" context, above Notes. Filled from the calendar when one event fits,
 * offered as a choice when several do, and always editable or removable in place.
 */
export function SavedContext({ publicId, initial, dismissed }: { publicId: string; initial: EncounterContext | null; dismissed: boolean }) {
  const router = useRouter();
  const [ctx, setCtx] = useState<EncounterContext | null>(initial);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [calStatus, setCalStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<EncounterContext | null>(null);

  useEffect(() => {
    if (initial || dismissed) return;
    fetch(`/api/calendar/context?publicId=${encodeURIComponent(publicId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setCalStatus(d.status);
        if (d.context) setCtx(d.context);
        setCandidates(d.candidates ?? []);
      })
      .catch(() => {});
  }, [publicId, initial, dismissed]);

  const save = async (label: string | null, source: EncounterContext["source"] | null, eventStart: string | null) => {
    setError(null);
    const supabase = getBrowserClient();
    const { data, error: e } = (await supabase?.rpc("set_saved_context", {
      p_public_id: publicId, p_label: label, p_source: source, p_event_start: eventStart, p_only_if_empty: false,
    })) ?? { data: null, error: true };
    const row = Array.isArray(data) ? data[0] : null;
    if (e || !row || row.status !== "saved") { setError("Couldn't save that. Try again."); return false; }
    setCtx(row.context_label ? { label: row.context_label, source: row.context_source, eventStart: row.context_event_start } : null);
    setCandidates([]);
    router.refresh(); // People shows "Met at …"
    return true;
  };

  if (editing) {
    return (
      <form noValidate onSubmit={async (e) => { e.preventDefault(); if (draft.trim() && (await save(draft.trim(), "manual", null))) setEditing(false); }}>
        <label className="field">
          <span>Where did you meet?</span>
          <input type="text" value={draft} maxLength={200} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Product Meetup London" autoFocus />
        </label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="row">
          <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
          <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={!draft.trim()}>Save</button>
        </div>
      </form>
    );
  }

  if (ctx) {
    return (
      <div className="row spread" style={{ alignItems: "flex-start" }}>
        <p className="small" style={{ margin: 0 }}>
          <span className="muted">{ctx.source === "calendar_auto" ? "Likely met at" : "Met at"}</span> <strong>{ctx.label}</strong>
          {ctx.source === "calendar_auto" && <span className="muted"> · from your calendar</span>}
        </p>
        <span className="row" style={{ gap: 0 }}>
          <button className="btn plain small" onClick={() => { setDraft(ctx.label); setEditing(true); }}>Edit</button>
          <button className="btn plain small" onClick={async () => { const prev = ctx; if (await save(null, null, null)) setRemoved(prev); }}>Remove</button>
        </span>
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {removed && (
        <p className="small" role="status">
          Removed.{" "}
          <button className="btn plain small" onClick={async () => { if (await save(removed.label, removed.source, removed.eventStart)) setRemoved(null); }}>Undo</button>
        </p>
      )}
      {candidates.length > 1 && (
        <div role="group" aria-label="Where did you meet?">
          <p className="small" style={{ marginBottom: ".25rem" }}>Where did you meet? Your calendar had a few things on.</p>
          <div className="row" style={{ flexWrap: "wrap", gap: ".4rem" }}>
            {candidates.map((c) => (
              <button key={c.label} className="btn small" onClick={() => save(c.label, "calendar_chosen", c.start)}>{c.label}</button>
            ))}
            <button className="btn plain small" onClick={() => { setDraft(""); setEditing(true); }}>Something else</button>
          </div>
        </div>
      )}
      {candidates.length <= 1 && (
        <button className="btn plain small" style={{ paddingLeft: 0 }} onClick={() => { setDraft(""); setEditing(true); }}>+ Add where you met</button>
      )}
      {calStatus === "needs_reconnect" && <p className="small muted">Calendar needs reconnecting on <a href="/me">My QR</a> to suggest this.</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
