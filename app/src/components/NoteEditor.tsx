"use client";
import { useEffect, useState } from "react";
import { LIMITS, countChars, countWords } from "@/lib/core/limits";

export type NoteSaveResult = { ok: true; note: string; noteUpdatedAt: string | null } | { ok: false; message: string; current?: { note: string; noteUpdatedAt: string | null } };

interface Props {
  note: string;
  noteUpdatedAt: string | null;
  privacyLine: string;
  onSave: (note: string, expectedUpdatedAt: string | null) => Promise<NoteSaveResult>;
}

/** Private notes, collapsed by default; edited in place with a single Save. */
export function NoteEditor({ note, noteUpdatedAt, privacyLine, onSave }: Props) {
  const [value, setValue] = useState(note);
  const [base, setBase] = useState({ note, noteUpdatedAt });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setValue(note); setBase({ note, noteUpdatedAt }); }, [note, noteUpdatedAt]);

  const chars = countChars(value);
  const dirty = value !== base.note;
  return (
    <details open={Boolean(base.note)}>
      <summary>Notes</summary>
      <textarea
        aria-label="Private notes"
        value={value}
        placeholder="What would you like to remember?"
        onChange={(e) => { setValue(e.target.value); setStatus(null); }}
      />
      <div className={"counter" + (chars > LIMITS.note ? " over" : "")}>{countWords(value)} words · {chars}/{LIMITS.note}</div>
      <p className="small muted">{privacyLine}</p>
      {error && <p className="field-error" role="alert">{error}</p>}
      {status && <p className="small" role="status">{status}</p>}
      {dirty && (
        <button
          className="btn primary"
          disabled={busy || chars > LIMITS.note}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const r = await onSave(value, base.noteUpdatedAt);
            setBusy(false);
            if (r.ok) {
              setBase({ note: r.note, noteUpdatedAt: r.noteUpdatedAt });
              setStatus("Saved.");
            } else {
              setError(r.message);
              if (r.current) setBase(r.current); // next save overwrites knowingly, after the person has seen it
            }
          }}
        >
          {busy ? "Saving…" : "Save note"}
        </button>
      )}
    </details>
  );
}
