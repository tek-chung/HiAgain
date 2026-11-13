"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { listGuestSaves, deleteGuestSaves, putGuestSave } from "@/lib/guest-store";
import {
  applyImportResults, batches, resolveNoteConflict, toImportItems,
  type ConflictChoice, type GuestSave, type ImportResult,
} from "@/lib/core/guest";

type Phase = "idle" | "importing" | "done" | "error" | "hidden";

/**
 * Offers to move this browser's guest saves into the signed-in account.
 * Local records are deleted only after the server acknowledges each one; retries are safe.
 */
export function ImportPanel({ accountName }: { accountName: string }) {
  const router = useRouter();
  const [saves, setSaves] = useState<GuestSave[] | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setSaves(await listGuestSaves());
    } catch {
      setSaves([]); // storage unavailable: nothing to import
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  if (!saves || phase === "hidden") return null;
  const pending = saves.filter((s) => !s.conflict);
  const conflicts = saves.filter((s) => s.conflict);
  if (!pending.length && !conflicts.length && phase !== "done") return null;

  const runImport = async () => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    setPhase("importing");
    setError(null);
    let added = 0, already = 0, skipped = 0, conflicted = 0;
    for (const batch of batches(pending)) {
      const { data, error: e } = await supabase.rpc("import_guest_saves", { p_items: toImportItems(batch) });
      if (e || !Array.isArray(data)) {
        await reload();
        setError("Couldn't reach Hi Again. Nothing was lost — the remaining saves are still on this browser. Try again.");
        setPhase("error");
        return;
      }
      const outcome = applyImportResults(batch, data as ImportResult[]);
      try {
        for (const c of outcome.conflicts) await putGuestSave(c);
        await deleteGuestSaves(outcome.acknowledged);
      } catch {
        // Server already has them; a later retry is still safe and duplicate-free.
      }
      added += outcome.counts.imported;
      already += outcome.counts.merged;
      skipped += outcome.counts.self + outcome.counts.not_found + outcome.counts.invalid;
      conflicted += outcome.counts.note_conflict;
    }
    await reload();
    const parts = [`Added ${added} ${added === 1 ? "person" : "people"}`];
    if (already) parts.push(`${already} already in your account`);
    if (skipped) parts.push(`${skipped} skipped (your own or no longer available)`);
    if (conflicted) parts.push(`${conflicted} with different notes to check below`);
    setSummary(parts.join(", ") + ".");
    setPhase("done");
    router.refresh();
  };

  const choose = async (save: GuestSave, choice: ConflictChoice) => {
    const supabase = getBrowserClient();
    if (!supabase || !save.conflict) return;
    const note = resolveNoteConflict(save, choice);
    if (note !== null) {
      const { data, error: e } = await supabase.rpc("set_saved_note", {
        p_public_id: save.publicId,
        p_note: note,
        p_expected_updated_at: save.conflict.serverNoteUpdatedAt,
      });
      const row = Array.isArray(data) ? data[0] : null;
      if (e || !row) {
        setError("Couldn't save that note. Both versions are still kept — try again.");
        return;
      }
      if (row.status === "conflict") {
        // The account note changed again meanwhile: show the newest version and ask again.
        await putGuestSave({ ...save, conflict: { serverNote: row.note, serverNoteUpdatedAt: row.note_updated_at } });
        await reload();
        return;
      }
    }
    await deleteGuestSaves([save.publicId]);
    await reload();
    router.refresh();
  };

  return (
    <div className="card" role="region" aria-label="Saves from this browser">
      {pending.length > 0 && phase !== "done" && (
        <>
          <p style={{ marginTop: 0 }}>
            <strong>You saved {pending.length} {pending.length === 1 ? "person" : "people"} on this browser</strong> before signing in.
          </p>
          <p className="small muted">Add them to People for <strong>{accountName}</strong>? Their save times and notes come too.</p>
          {error && <p className="banner error small" role="alert">{error}</p>}
          <div className="row">
            <button className="btn" onClick={() => setPhase("hidden")} disabled={phase === "importing"}>Not now</button>
            <button className="btn primary" style={{ flex: 1 }} onClick={runImport} disabled={phase === "importing"}>
              {phase === "importing" ? "Adding…" : phase === "error" ? "Try again" : "Add to my account"}
            </button>
          </div>
        </>
      )}
      {phase === "done" && summary && <p className="banner small" role="status" style={{ margin: 0 }}>{summary}</p>}
      {conflicts.map((s) => (
        <div key={s.publicId} className="stack" style={{ marginTop: ".75rem" }}>
          <p style={{ margin: 0 }}><strong>{s.snapshot.displayName || "Someone"}</strong> already has a different note in your account.</p>
          <p className="small"><span className="muted">In your account:</span> {s.conflict!.serverNote}</p>
          <p className="small"><span className="muted">On this browser:</span> {s.note}</p>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button className="btn" onClick={() => choose(s, "keep_account")}>Keep account note</button>
            <button className="btn" onClick={() => choose(s, "use_browser")}>Use this browser&apos;s</button>
            <button className="btn primary" onClick={() => choose(s, "combine")}>Keep both</button>
          </div>
        </div>
      ))}
    </div>
  );
}
