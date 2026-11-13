"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Contribution, PublicAction, PublicProfile } from "@/lib/core/types";
import { ACTION_LABELS, bodyRequired, isEditable } from "@/lib/core/types";
import { GUEST_SCOPE, adoptDraft, recordGuestSave, withArchived, withNote, type Draft } from "@/lib/core/guest";
import { exactTimestamp } from "@/lib/core/dates";
import { LIMITS, countChars, countWords } from "@/lib/core/limits";
import {
  GuestStoreError, deleteDraft, getGuestSave, listDrafts, putDraft, putGuestSave, simulateFailureForTesting,
} from "@/lib/guest-store";
import { getBrowserClient } from "@/lib/supabase/client";
import { startLinkedInSignIn } from "@/lib/auth-client";
import { Avatar, LinkedInLink } from "./Avatar";
import { NoteEditor, type NoteSaveResult } from "./NoteEditor";
import { CheckIcon } from "./Icons";
import { SavedContext, type EncounterContext } from "./SavedContext";
import { AgainBlock, AGAIN_INTENT, type AgainState } from "./AgainBlock";
import { guestHashFor } from "@/lib/guest-token";
import { MoreActions } from "./MoreActions";

export interface ServerSave { savedAt: string; note: string; noteUpdatedAt: string | null; archivedAt: string | null; context: EncounterContext | null; contextDismissed: boolean; source: string }

interface Props {
  profile: PublicProfile;
  viewer: { userId: string } | null;
  isSelf: boolean;
  initialSave: ServerSave | null;
  contributions: Contribution[];
  signInAvailable: boolean;
  again: AgainState;
}

type SaveState =
  | { kind: "pending" }
  | { kind: "saved"; savedAt: string; note: string; noteUpdatedAt: string | null; where: "browser" | "account"; isNew: boolean; archivedAt: string | null }
  | { kind: "error"; message: string };

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ProfileView({ profile, viewer, isSelf, initialSave, contributions, signInAvailable, again }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [save, setSave] = useState<SaveState>(
    initialSave
      ? { kind: "saved", savedAt: initialSave.savedAt, note: initialSave.note, noteUpdatedAt: initialSave.noteUpdatedAt, where: "account", isNew: false, archivedAt: initialSave.archivedAt }
      : { kind: "pending" },
  );
  const [sent, setSent] = useState<Record<string, Contribution>>(() => Object.fromEntries(contributions.map((c) => [c.actionId, c])));
  const [open, setOpen] = useState<string | null>(null);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const attempted = useRef(false);
  const name = profile.displayName || "This person";
  const scope = viewer?.userId ?? GUEST_SCOPE;

  // ----- Automatic save after an actual visit (never during server render or link prefetch) -----
  const autoSave = useCallback(async () => {
    if (isSelf) return;
    setSave({ kind: "pending" });
    if (viewer) {
      const supabase = getBrowserClient();
      const { data, error } = (await supabase?.rpc("save_profile", { p_public_id: profile.publicId })) ?? { data: null, error: true };
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row || !row.saved_at) {
        setSave({ kind: "error", message: "Couldn't save to your account. Check your connection and try again." });
        return;
      }
      setSave({ kind: "saved", savedAt: row.saved_at, note: initialSave?.note ?? "", noteUpdatedAt: initialSave?.noteUpdatedAt ?? null, where: "account", isNew: row.status === "saved", archivedAt: null });
      return;
    }
    try {
      if (simulateFailureForTesting()) throw new GuestStoreError("failed", "This browser couldn't store the data. (simulated)");
      const existing = await getGuestSave(profile.publicId);
      const { save: s, created } = recordGuestSave(existing, profile);
      await putGuestSave(s);
      // Let the owner see an anonymous visit (scanners are told on this page). Best effort.
      void guestHashFor(profile.publicId).then(async (h) => {
        if (h) await getBrowserClient()?.rpc("record_guest_scan", { p_public_id: profile.publicId, p_token_hash: h });
      }).catch(() => {});
      setSave({ kind: "saved", savedAt: s.savedAt, note: s.note, noteUpdatedAt: s.noteUpdatedAt, where: "browser", isNew: created, archivedAt: s.archivedAt ?? null });
    } catch (e) {
      const msg = e instanceof GuestStoreError ? e.message : "This browser couldn't store the data.";
      setSave({ kind: "error", message: msg });
    }
  }, [isSelf, viewer, profile, initialSave]);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    if (!initialSave) void autoSave();
  }, [autoSave, initialSave]);

  // ----- Resume an action after sign-in (or after a cancelled sign-in) -----
  const resumeId = params.get("resume");
  const signin = params.get("signin");
  const [resumeDraft, setResumeDraft] = useState<Draft | null>(null);
  useEffect(() => {
    if (resumeId === AGAIN_INTENT) {
      // AgainBlock handles the intent; just tidy the URL once it has had a chance to read it.
      const t = setTimeout(() => router.replace(`/p/${profile.publicId}`, { scroll: false }), 1500);
      return () => clearTimeout(t);
    }
    if (!resumeId || !profile.actions.some((a) => a.id === resumeId)) return;
    let cancelled = false;
    (async () => {
      let drafts: Draft[] = [];
      try { drafts = await listDrafts(); } catch { return; }
      if (cancelled) return;
      if (viewer) {
        const adopted = adoptDraft(drafts, viewer.userId, resumeId);
        if (adopted) {
          await putDraft(adopted);
          await deleteDraft(GUEST_SCOPE, resumeId);
          setResumeDraft(adopted);
        }
      } else {
        const d = drafts.find((x) => x.scope === GUEST_SCOPE && x.actionId === resumeId) ?? null;
        setResumeDraft(d ? { ...d, pendingSend: false } : null);
        if (signin === "cancelled") setResumeNotice("Sign-in was cancelled. Your draft is still here.");
        if (signin === "failed") setResumeNotice("Sign-in didn't complete. Your draft is still here — try again.");
      }
      setOpen(resumeId);
      router.replace(`/p/${profile.publicId}`, { scroll: false }); // keep the URL clean on refresh
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setArchivedState = async (archived: boolean): Promise<boolean> => {
    if (save.kind !== "saved") return false;
    if (save.where === "browser") {
      try {
        const existing = await getGuestSave(profile.publicId);
        if (!existing) return false;
        await putGuestSave(withArchived(existing, archived));
        return true;
      } catch { return false; }
    }
    const { data } = (await getBrowserClient()?.rpc("set_archived", { p_public_id: profile.publicId, p_archived: archived })) ?? { data: null };
    return data === "saved";
  };

  // ----- Notes -----
  const saveNote = async (note: string, expected: string | null): Promise<NoteSaveResult> => {
    if (save.kind !== "saved") return { ok: false, message: "Save this person first." };
    if (save.where === "browser") {
      try {
        const existing = await getGuestSave(profile.publicId);
        if (!existing) return { ok: false, message: "This save is no longer on this browser." };
        const updated = withNote(existing, note);
        await putGuestSave(updated);
        return { ok: true, note: updated.note, noteUpdatedAt: updated.noteUpdatedAt };
      } catch (e) {
        return { ok: false, message: e instanceof GuestStoreError ? e.message : "Couldn't save the note on this browser." };
      }
    }
    const supabase = getBrowserClient();
    const { data, error } = (await supabase?.rpc("set_saved_note", { p_public_id: profile.publicId, p_note: note, p_expected_updated_at: expected })) ?? { data: null, error: true };
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return { ok: false, message: "Couldn't save the note. Your text is still here — try again." };
    if (row.status === "conflict") {
      return {
        ok: false,
        message: `This note was changed elsewhere: “${row.note}”. Save again to replace it, or copy what you need first.`,
        current: { note: row.note, noteUpdatedAt: row.note_updated_at },
      };
    }
    return { ok: true, note: row.note, noteUpdatedAt: row.note_updated_at };
  };

  return (
    <article>
      {isSelf && <p className="banner info small">This is your profile — this is what people see when they scan your code.</p>}
      <header className="row" style={{ marginBottom: ".5rem" }}>
        <Avatar name={name} src={profile.avatarUrl} />
        <div style={{ minWidth: 0 }}>
          <div className="name-line">
            <h1 style={{ margin: 0 }}>{name}</h1>
            <LinkedInLink url={profile.linkedinUrl} name={name} />
          </div>
          {profile.headline && <p className="muted" style={{ margin: 0 }}>{profile.headline}</p>}
        </div>
      </header>

      {!isSelf && <SaveBanner state={save} onRetry={autoSave} signedIn={Boolean(viewer)} />}
      {!isSelf && (
        <p className="small muted" data-testid="scan-notice">
          {name.split(/\s+/)[0] || "They"} will see you visited.{viewer ? "" : " Guests show as an anonymous nickname."}
        </p>
      )}
      {resumeNotice && <p className="banner info small" role="status">{resumeNotice}</p>}
      {!isSelf && save.kind === "saved" && save.archivedAt && (
        <div className="banner info small row spread" role="status">
          <span>In your Archive.</span>
          <button className="btn small" onClick={async () => { if (await setArchivedState(false)) setSave({ ...save, archivedAt: null }); }}>Restore</button>
        </div>
      )}

      {!isSelf && (
        <AgainBlock
          publicId={profile.publicId}
          name={name}
          linkedinUrl={profile.linkedinUrl}
          viewerId={viewer?.userId ?? null}
          initial={again}
          resume={resumeId === AGAIN_INTENT}
          signInAvailable={signInAvailable}
        />
      )}

      {profile.actions.length === 0 && <p className="muted small">{name} hasn&apos;t added any invitations yet.</p>}
      {profile.actions.map((a) => (
        <ActionCard
          key={a.id}
          action={a}
          ownerPublicId={profile.publicId}
          scope={scope}
          disabled={isSelf}
          signedIn={Boolean(viewer)}
          signInAvailable={signInAvailable}
          sent={sent[a.id] ?? null}
          open={open === a.id}
          onToggle={() => setOpen(open === a.id ? null : a.id)}
          initialDraft={resumeDraft?.actionId === a.id ? resumeDraft : null}
          onSent={(c) => setSent((m) => ({ ...m, [a.id]: c }))}
        />
      ))}

      {!isSelf && save.kind === "saved" && (
        <section className="saved-context" aria-label="Saved context">
          <p className="small muted">
            {initialSave?.source === "incoming_scan" ? "Scanned your code" : "Saved"} {exactTimestamp(save.savedAt)}{save.where === "browser" ? " · this browser" : ""}
          </p>
          {save.where === "account" && (
            <SavedContext publicId={profile.publicId} initial={initialSave?.context ?? null} dismissed={initialSave?.contextDismissed ?? false} />
          )}
          <NoteEditor
            note={save.note}
            noteUpdatedAt={save.noteUpdatedAt}
            privacyLine={save.where === "browser" ? "Guest notes stay with your saves in this browser." : "Only you can see these notes."}
            onSave={saveNote}
          />
        </section>
      )}
      {!isSelf && viewer && <MoreActions publicId={profile.publicId} name={name} />}
    </article>
  );
}

function SaveBanner({ state, onRetry, signedIn }: { state: SaveState; onRetry: () => void; signedIn: boolean }) {
  if (state.kind === "pending") return <p className="small muted" role="status">Saving…</p>;
  if (state.kind === "error") {
    return (
      <div className="banner error" role="alert">
        <p style={{ margin: 0 }}>Not saved. {state.message}</p>
        <button className="btn" style={{ marginTop: ".5rem" }} onClick={onRetry}>Try again</button>
      </div>
    );
  }
  if (!state.isNew) return null;
  return (
    <p className="banner small" role="status">
      {state.where === "account"
        ? "Saved to your People."
        : signedIn ? "Saved." : "Saved on this browser. Sign in any time to keep it in your account."}
    </p>
  );
}

interface CardProps {
  action: PublicAction;
  ownerPublicId: string;
  scope: string;
  disabled: boolean;
  signedIn: boolean;
  signInAvailable: boolean;
  sent: Contribution | null;
  open: boolean;
  onToggle: () => void;
  initialDraft: Draft | null;
  onSent: (c: Contribution) => void;
}

function ActionCard({ action, ownerPublicId, scope, disabled, signedIn, signInAvailable, sent, open, onToggle, initialDraft, onSent }: CardProps) {
  const label = ACTION_LABELS[action.kind];
  const [body, setBody] = useState("");
  const [key, setKey] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const loaded = useRef(false);
  const autoSent = useRef(false);

  // Load an existing draft for this scope when the composer first opens.
  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    (async () => {
      if (initialDraft) {
        setBody(initialDraft.body);
        setKey(initialDraft.idempotencyKey);
        return;
      }
      try {
        const d = (await listDrafts()).find((x) => x.scope === scope && x.actionId === action.id);
        if (d) { setBody(d.body); setKey(d.idempotencyKey); return; }
      } catch { /* storage unavailable: drafts just won't persist */ }
      setKey(newKey());
    })();
  }, [open, initialDraft, scope, action.id]);

  // Persist the draft as the person types.
  useEffect(() => {
    if (!open || !key || sent) return;
    const t = setTimeout(() => {
      void putDraft({ scope, actionId: action.id, profilePublicId: ownerPublicId, body, idempotencyKey: key, pendingSend: false, updatedAt: new Date().toISOString() }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [body, key, open, scope, action.id, ownerPublicId, sent]);

  const chars = countChars(body);
  const tooLong = chars > LIMITS.contribution;
  const missing = bodyRequired(action.kind) && !body.trim();

  const send = useCallback(async (text: string, idemKey: string) => {
    setBusy(true);
    setError(null);
    const supabase = getBrowserClient();
    const { data, error: e } = (await supabase?.rpc("submit_contribution", { p_action_id: action.id, p_body: text, p_idempotency_key: idemKey })) ?? { data: null, error: true };
    setBusy(false);
    const row = Array.isArray(data) ? data[0] : null;
    if (e || !row) { setError("Couldn't send. Your text is saved here — try again."); return; }
    if (row.status === "sent" || row.status === "existing") {
      const c: Contribution = { id: row.id, actionId: row.action_id, kind: row.kind, promptSnapshot: row.prompt_snapshot, body: row.body, sentAt: row.sent_at, editedAt: row.edited_at, version: Number(row.version ?? 1) };
      if (row.status === "existing" && row.body !== text.trim()) setNotice("You'd already answered this question, so your earlier answer is kept.");
      try { await deleteDraft(scope, action.id); } catch { /* ignore */ }
      onSent(c);
      return;
    }
    if (row.status === "not_found") setError("This invitation is no longer available.");
    else if (row.status === "invalid") setError(bodyRequired(action.kind) ? "Write something before sending (up to 1,500 characters)." : "That's too long.");
    else setError("You can't send this to yourself.");
  }, [action.id, action.kind, scope, onSent]);

  // After sign-in with an explicit send intent, send the restored draft once.
  useEffect(() => {
    if (signedIn && initialDraft?.pendingSend && !sent && !autoSent.current) {
      autoSent.current = true;
      void send(initialDraft.body, initialDraft.idempotencyKey);
    }
  }, [signedIn, initialDraft, sent, send]);

  const signInAndSend = async () => {
    setError(null);
    try {
      await putDraft({ scope: GUEST_SCOPE, actionId: action.id, profilePublicId: ownerPublicId, body, idempotencyKey: key, pendingSend: true, updatedAt: new Date().toISOString() });
    } catch {
      setError("This browser can't keep your draft through sign-in. Copy your text first, then sign in.");
      return;
    }
    const r = await startLinkedInSignIn(`/p/${ownerPublicId}?resume=${action.id}`);
    if (!r.ok) setError(r.message);
  };

  return (
    <div>
      <button className="action" onClick={onToggle} aria-expanded={open} disabled={disabled && !sent}>
        <div style={{ minWidth: 0 }}>
          <div className="t">
            {label.title}
            {sent && <span className="badge"><CheckIcon />{label.done}</span>}
          </div>
          <div className="c">{action.prompt}</div>
        </div>
        <span className="chev" aria-hidden="true">›</span>
      </button>
      {open && !disabled && (
        <div className="card" style={{ marginTop: "-.25rem" }}>
          {sent ? (
            <SentContribution c={sent} kind={action.kind} notice={notice} onUpdated={onSent} />          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (signedIn) void send(body, key); else void signInAndSend(); }}>
              <label className="sr-only" htmlFor={`body-${action.id}`}>{label.placeholder}</label>
              <textarea id={`body-${action.id}`} value={body} placeholder={label.placeholder} onChange={(e) => setBody(e.target.value)} />
              <div className={"counter" + (tooLong ? " over" : "")}>{countWords(body)} words · {chars}/{LIMITS.contribution}</div>
              <p className="small muted">Private: only the recipient will see this.</p>
              {error && <p className="field-error" role="alert">{error}</p>}
              <button type="submit" className="btn primary full" disabled={busy || tooLong || missing || !key}>
                {busy ? "Sending…" : signedIn ? label.send : signInAvailable ? "Sign in with LinkedIn and send" : "Sign in to send (unavailable in development)"}
              </button>
              {!signedIn && <p className="small muted">Your draft is kept on this browser while you sign in.</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export function SentContribution({ c, kind, notice, onUpdated }: { c: Contribution; kind: PublicAction["kind"]; notice: string | null; onUpdated: (c: Contribution) => void }) {
  const label = ACTION_LABELS[kind];
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chars = countChars(text);

  const save = async () => {
    setBusy(true);
    setError(null);
    const { data, error: e } = (await getBrowserClient()?.rpc("edit_contribution", { p_id: c.id, p_body: text, p_expected_version: c.version })) ?? { data: null, error: true };
    setBusy(false);
    const row = Array.isArray(data) ? data[0] : null;
    if (e || !row) { setError("Couldn't save your changes. Your edit is still here — try again."); return; }
    if (row.status === "saved" || row.status === "unchanged") {
      onUpdated({ ...c, body: row.body, version: row.version, editedAt: row.edited_at });
      setEditing(false);
      return;
    }
    if (row.status === "conflict") {
      onUpdated({ ...c, body: row.body, version: row.version, editedAt: row.edited_at });
      setError(`This was changed elsewhere to: “${row.body}”. Save again to replace it with your edit.`);
      return;
    }
    setError(row.status === "invalid" ? "Write something (up to 1,500 characters)." : "This can't be edited.");
  };

  return (
    <div>
      <p className="small muted" style={{ marginTop: 0 }}>
        Sent {exactTimestamp(c.sentAt)}{c.editedAt ? ` · Edited ${exactTimestamp(c.editedAt)}` : ""} · only you and the recipient can see this
      </p>
      {editing ? (
        <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <label className="sr-only" htmlFor={`edit-${c.id}`}>{label.edit}</label>
          <textarea id={`edit-${c.id}`} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          <div className={"counter" + (chars > LIMITS.contribution ? " over" : "")}>{countWords(text)} words · {chars}/{LIMITS.contribution}</div>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="row">
            <button type="button" className="btn" onClick={() => { setEditing(false); setText(c.body); setError(null); }} disabled={busy}>Cancel</button>
            <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={busy || !text.trim() || chars > LIMITS.contribution}>{busy ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      ) : (
        <>
          {c.body ? <p style={{ whiteSpace: "pre-wrap" }}>{c.body}</p> : <p className="muted">You said you&apos;d like to join.</p>}
          {notice && <p className="small" role="status">{notice}</p>}
          {isEditable(kind) && (
            <button className="btn small" onClick={() => { setText(c.body); setEditing(true); }}>✎ {label.edit}</button>
          )}
        </>
      )}
    </div>
  );
}
