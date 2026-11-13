"use client";
import { useState } from "react";
import { exactTimestamp } from "@/lib/core/dates";
import { getBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";
import { NoteEditor, type NoteSaveResult } from "./NoteEditor";

interface Props { id: string; alias: string; firstAt: string; note: string; noteUpdatedAt: string | null; archivedAt: string | null }

/** An anonymous guest who scanned your code. No profile, LinkedIn or Again — just when, and your notes. */
export function GuestVisitorView({ id, alias, firstAt, note, noteUpdatedAt, archivedAt }: Props) {
  const [archived, setArchived] = useState(Boolean(archivedAt));
  const [error, setError] = useState<string | null>(null);

  const toggleArchive = async () => {
    const { data } = (await getBrowserClient()?.rpc("set_guest_archived", { p_id: id, p_archived: !archived })) ?? { data: null };
    if (data === "saved") setArchived(!archived);
    else setError("Couldn't update. Try again.");
  };

  const saveNote = async (n: string, expected: string | null): Promise<NoteSaveResult> => {
    const { data, error: e } = (await getBrowserClient()?.rpc("set_guest_note", { p_id: id, p_note: n, p_expected_updated_at: expected })) ?? { data: null, error: true };
    const row = Array.isArray(data) ? data[0] : null;
    if (e || !row) return { ok: false, message: "Couldn't save the note. Your text is still here — try again." };
    if (row.status === "conflict") return { ok: false, message: `This note was changed elsewhere: “${row.note}”. Save again to replace it.`, current: { note: row.note, noteUpdatedAt: row.note_updated_at } };
    return { ok: true, note: row.note, noteUpdatedAt: row.note_updated_at };
  };

  return (
    <article>
      <header className="row" style={{ margin: ".5rem 0" }}>
        <Avatar name={alias} src={null} />
        <div>
          <h1 style={{ margin: 0 }}>{alias}</h1>
          <p className="muted small" style={{ margin: 0 }}>Guest · an anonymous nickname, not a verified person</p>
        </div>
      </header>
      {archived && <p className="banner info small" role="status">In your Archive.</p>}
      <p className="small muted">They scanned your code without signing in, so there&apos;s no profile, LinkedIn link or Again to show.</p>
      <section className="saved-context" aria-label="Saved context">
        <p className="small muted">Scanned your code {exactTimestamp(firstAt)}</p>
        <NoteEditor note={note} noteUpdatedAt={noteUpdatedAt} privacyLine="Only you can see these notes." onSave={saveNote} />
      </section>
      <button className="btn small" style={{ marginTop: "1rem" }} onClick={toggleArchive}>{archived ? "Restore" : "Archive"}</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </article>
  );
}
