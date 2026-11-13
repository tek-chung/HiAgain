// Pure logic for the browser-local guest collection and drafts.
// Storage (IndexedDB) lives in src/lib/guest-store.ts; this file has no browser dependencies.

import type { PublicProfile } from "./types.ts";

export interface GuestSave {
  publicId: string;
  savedAt: string; // first time this browser saved the person (ISO, UTC)
  note: string;
  noteUpdatedAt: string | null;
  snapshot: { displayName: string; headline: string | null; avatarUrl: string | null; linkedinUrl: string | null };
  /** Private, reversible: hidden from People until restored. */
  archivedAt?: string | null;
  /** Set when an import found a different note already in the account. */
  conflict?: { serverNote: string; serverNoteUpdatedAt: string | null };
}

/** Repeat scans keep the original timestamp and note; only the public snapshot refreshes. */
export function recordGuestSave(
  existing: GuestSave | undefined,
  profile: PublicProfile,
  now: Date = new Date(),
): { save: GuestSave; created: boolean } {
  const snapshot = {
    displayName: profile.displayName,
    headline: profile.headline,
    avatarUrl: profile.avatarUrl,
    linkedinUrl: profile.linkedinUrl,
  };
  if (existing) return { save: { ...existing, snapshot }, created: false };
  return {
    save: { publicId: profile.publicId, savedAt: now.toISOString(), note: "", noteUpdatedAt: null, snapshot },
    created: true,
  };
}

export function withNote(save: GuestSave, note: string, now: Date = new Date()): GuestSave {
  return { ...save, note, noteUpdatedAt: now.toISOString() };
}

// ---------- Import ----------

export interface ImportItem {
  public_id: string;
  saved_at: string;
  note: string | null;
  archived_at?: string | null;
}

export type ImportStatus = "imported" | "merged" | "note_conflict" | "self" | "not_found" | "invalid";

export interface ImportResult {
  public_id: string;
  status: ImportStatus;
  saved_at?: string | null;
  server_note?: string | null;
  server_note_updated_at?: string | null;
}

export const IMPORT_BATCH_SIZE = 50;

export function toImportItems(saves: readonly GuestSave[]): ImportItem[] {
  // Items already in conflict are resolved by the person, not re-sent automatically.
  return saves
    .filter((s) => !s.conflict)
    .map((s) => ({
      public_id: s.publicId,
      saved_at: s.savedAt,
      note: s.note.trim() ? s.note : null,
      ...(s.archivedAt ? { archived_at: s.archivedAt } : {}),
    }));
}

export function batches<T>(items: readonly T[], size = IMPORT_BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface ImportOutcome {
  /** Server acknowledged these; the local copy can be removed. */
  acknowledged: string[];
  /** Kept locally with conflict details so the person can choose. */
  conflicts: GuestSave[];
  /** Not mentioned by the server (e.g. interrupted response); kept for retry. */
  unacknowledged: string[];
  counts: Record<ImportStatus, number>;
}

/**
 * Decides what happens to each local save after a server response.
 * Local records are only released when the server has explicitly acknowledged them.
 */
export function applyImportResults(sent: readonly GuestSave[], results: readonly ImportResult[]): ImportOutcome {
  const byId = new Map(results.map((r) => [r.public_id, r]));
  const outcome: ImportOutcome = {
    acknowledged: [],
    conflicts: [],
    unacknowledged: [],
    counts: { imported: 0, merged: 0, note_conflict: 0, self: 0, not_found: 0, invalid: 0 },
  };
  for (const save of sent) {
    const r = byId.get(save.publicId);
    if (!r) {
      outcome.unacknowledged.push(save.publicId);
      continue;
    }
    outcome.counts[r.status]++;
    switch (r.status) {
      case "imported":
      case "merged":
      case "self": // your own profile never becomes a saved person
      case "not_found": // profile no longer exists; nothing to import
      case "invalid":
        outcome.acknowledged.push(save.publicId);
        break;
      case "note_conflict":
        outcome.conflicts.push({
          ...save,
          conflict: { serverNote: r.server_note ?? "", serverNoteUpdatedAt: r.server_note_updated_at ?? null },
        });
        break;
    }
  }
  return outcome;
}

export type ConflictChoice = "keep_account" | "use_browser" | "combine";

/** Returns the note to write to the account, or null to leave the account note unchanged. */
export function resolveNoteConflict(save: GuestSave, choice: ConflictChoice): string | null {
  if (!save.conflict) return null;
  const server = save.conflict.serverNote;
  switch (choice) {
    case "keep_account":
      return null;
    case "use_browser":
      return save.note;
    case "combine":
      return server.trim() ? `${server.trimEnd()}\n\n${save.note.trim()}` : save.note;
  }
}

// ---------- Drafts ----------

export const GUEST_SCOPE = "guest";

export interface Draft {
  scope: string; // "guest" or a user ID; drafts never leak across scopes
  actionId: string;
  profilePublicId: string;
  body: string;
  /** Reused on every retry so a send is never duplicated. */
  idempotencyKey: string;
  /** True when the person pressed "sign in to send"; the send resumes after sign-in. */
  pendingSend: boolean;
  updatedAt: string;
}

export function draftKey(scope: string, actionId: string): string {
  return `${scope}::${actionId}`;
}

/**
 * After sign-in, adopt only the guest draft for the action that prompted sign-in.
 * Other guest drafts stay in the guest scope, and drafts from other accounts are never visible.
 */
export function adoptDraft(drafts: readonly Draft[], userId: string, actionId: string): Draft | null {
  const own = drafts.find((d) => d.scope === userId && d.actionId === actionId);
  const guest = drafts.find((d) => d.scope === GUEST_SCOPE && d.actionId === actionId);
  if (!guest) return own ?? null;
  if (own && own.updatedAt > guest.updatedAt) return own;
  return { ...guest, scope: userId };
}

export function draftsVisibleTo(drafts: readonly Draft[], scope: string): Draft[] {
  return drafts.filter((d) => d.scope === scope);
}

export function withArchived(save: GuestSave, archived: boolean, now: Date = new Date()): GuestSave {
  return { ...save, archivedAt: archived ? save.archivedAt ?? now.toISOString() : null };
}
