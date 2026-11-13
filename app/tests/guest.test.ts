import { test } from "node:test";
import assert from "node:assert/strict";
import {
  recordGuestSave, withNote, toImportItems, applyImportResults, resolveNoteConflict,
  adoptDraft, draftsVisibleTo, batches, withArchived, GUEST_SCOPE, type GuestSave, type Draft,
} from "../src/lib/core/guest.ts";
import type { PublicProfile } from "../src/lib/core/types.ts";

const profile: PublicProfile = {
  publicId: "AAAAAAAAAAAA", handle: "alex-morgan", displayName: "Alex Morgan", headline: "Product builder",
  avatarUrl: null, linkedinUrl: null, actions: [],
};

test("repeat scans keep the first timestamp and note", () => {
  const first = recordGuestSave(undefined, profile, new Date("2026-11-13T09:00:00Z"));
  assert.equal(first.created, true);
  const noted = withNote(first.save, "Met at the product meetup", new Date("2026-11-13T09:05:00Z"));
  const again = recordGuestSave(noted, { ...profile, headline: "New headline" }, new Date("2026-11-13T12:00:00Z"));
  assert.equal(again.created, false);
  assert.equal(again.save.savedAt, "2026-11-13T09:00:00.000Z");
  assert.equal(again.save.note, "Met at the product meetup");
  assert.equal(again.save.snapshot.headline, "New headline");
});

function save(id: string, note = ""): GuestSave {
  return { publicId: id, savedAt: "2026-11-12T10:00:00.000Z", note, noteUpdatedAt: null,
    snapshot: { displayName: id, headline: null, avatarUrl: null, linkedinUrl: null } };
}

test("import releases only acknowledged records and keeps conflicts", () => {
  const sent = [save("a"), save("b", "mine"), save("c"), save("d")];
  const out = applyImportResults(sent, [
    { public_id: "a", status: "imported" },
    { public_id: "b", status: "note_conflict", server_note: "theirs", server_note_updated_at: "2026-11-12T11:00:00Z" },
    { public_id: "c", status: "self" },
    // "d" missing: interrupted response
  ]);
  assert.deepEqual(out.acknowledged, ["a", "c"]);
  assert.deepEqual(out.unacknowledged, ["d"]);
  assert.equal(out.conflicts[0].conflict?.serverNote, "theirs");
  assert.equal(out.conflicts[0].note, "mine", "local note is never discarded");
});

test("conflicted saves are not re-sent automatically; empty notes are sent as null", () => {
  const items = toImportItems([save("a"), { ...save("b", "x"), conflict: { serverNote: "y", serverNoteUpdatedAt: null } }]);
  assert.deepEqual(items, [{ public_id: "a", saved_at: "2026-11-12T10:00:00.000Z", note: null }]);
  assert.equal(batches([1, 2, 3, 4, 5], 2).length, 3);
  const archived = toImportItems([withArchived(save("c"), true, new Date("2026-11-12T12:00:00Z"))]);
  assert.equal(archived[0].archived_at, "2026-11-12T12:00:00.000Z", "archive state travels with the import");
  assert.equal(withArchived(withArchived(save("c"), true), false).archivedAt, null);
});

test("note conflict choices", () => {
  const s = { ...save("b", "browser note"), conflict: { serverNote: "account note", serverNoteUpdatedAt: null } };
  assert.equal(resolveNoteConflict(s, "keep_account"), null);
  assert.equal(resolveNoteConflict(s, "use_browser"), "browser note");
  assert.equal(resolveNoteConflict(s, "combine"), "account note\n\nbrowser note");
});

function draft(scope: string, actionId: string, updatedAt: string, body = "text"): Draft {
  return { scope, actionId, profilePublicId: "AAAAAAAAAAAA", body, idempotencyKey: "k-" + scope,
    pendingSend: true, updatedAt };
}

test("drafts: only the guest draft for the resumed action is adopted", () => {
  const drafts = [
    draft(GUEST_SCOPE, "q1", "2026-11-13T10:00:00Z", "guest answer"),
    draft(GUEST_SCOPE, "q2", "2026-11-13T10:00:00Z"),
    draft("user-b", "q1", "2026-11-13T09:00:00Z", "B's answer"),
  ];
  const adopted = adoptDraft(drafts, "user-a", "q1");
  assert.equal(adopted?.scope, "user-a");
  assert.equal(adopted?.body, "guest answer");
  assert.equal(adopted?.idempotencyKey, "k-guest", "idempotency key survives sign-in");
  assert.deepEqual(draftsVisibleTo(drafts, "user-a"), [], "user A never sees user B's draft");
  assert.equal(adoptDraft(drafts, "user-a", "q9"), null);
});

test("drafts: a newer account draft wins over an older guest draft", () => {
  const drafts = [draft(GUEST_SCOPE, "q1", "2026-11-13T08:00:00Z", "old"), draft("user-a", "q1", "2026-11-13T09:00:00Z", "newer")];
  assert.equal(adoptDraft(drafts, "user-a", "q1")?.body, "newer");
});
