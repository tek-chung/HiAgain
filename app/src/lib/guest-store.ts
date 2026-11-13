"use client";
// Browser-local storage (IndexedDB) for guest saves and drafts.
// Every write resolves only after the transaction commits, so the UI never claims a save
// that did not happen. All failures surface as GuestStoreError with an honest message.

import type { Draft, GuestSave } from "@/lib/core/guest";
import { draftKey } from "@/lib/core/guest";

const DB_NAME = "hi-again";
const DB_VERSION = 1;
const SAVES = "guestSaves";
const DRAFTS = "drafts";

export class GuestStoreError extends Error {
  constructor(
    public readonly kind: "unavailable" | "quota" | "failed",
    message: string,
  ) {
    super(message);
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function toStoreError(e: unknown): GuestStoreError {
  if (e instanceof GuestStoreError) return e;
  const name = (e as { name?: string } | null)?.name;
  if (name === "QuotaExceededError") return new GuestStoreError("quota", "This browser is out of storage space.");
  if (name === "SecurityError" || name === "InvalidStateError")
    return new GuestStoreError("unavailable", "This browser isn't allowing Hi Again to store data (private mode or a blocked setting).");
  return new GuestStoreError("failed", "This browser couldn't store the data.");
}

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new GuestStoreError("unavailable", "This browser doesn't support local storage for Hi Again."));
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(toStoreError(e));
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SAVES)) db.createObjectStore(SAVES, { keyPath: "publicId" });
      if (!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS);
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(toStoreError(req.error));
    req.onblocked = () => reject(new GuestStoreError("failed", "Close other Hi Again tabs and try again."));
  }).catch((e) => {
    dbPromise = null; // allow a later retry
    throw toStoreError(e);
  });
  return dbPromise;
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await open();
  return new Promise<T | undefined>((resolve, reject) => {
    let result: T | undefined;
    let t: IDBTransaction;
    try {
      t = db.transaction(store, mode);
      const req = run(t.objectStore(store));
      if (req) req.onsuccess = () => (result = req.result);
    } catch (e) {
      reject(toStoreError(e));
      return;
    }
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(toStoreError(t.error));
    t.onabort = () => reject(toStoreError(t.error));
  });
}

// ----- Guest saves -----

export async function getGuestSave(publicId: string): Promise<GuestSave | undefined> {
  return tx<GuestSave>(SAVES, "readonly", (s) => s.get(publicId));
}

export async function listGuestSaves(): Promise<GuestSave[]> {
  return (await tx<GuestSave[]>(SAVES, "readonly", (s) => s.getAll())) ?? [];
}

export async function putGuestSave(save: GuestSave): Promise<void> {
  await tx(SAVES, "readwrite", (s) => s.put(save));
}

export async function deleteGuestSaves(publicIds: readonly string[]): Promise<void> {
  if (!publicIds.length) return;
  await tx(SAVES, "readwrite", (s) => {
    for (const id of publicIds) s.delete(id);
  });
}

// ----- Drafts -----

export async function listDrafts(): Promise<Draft[]> {
  return (await tx<Draft[]>(DRAFTS, "readonly", (s) => s.getAll())) ?? [];
}

export async function putDraft(d: Draft): Promise<void> {
  await tx(DRAFTS, "readwrite", (s) => s.put(d, draftKey(d.scope, d.actionId)));
}

export async function deleteDraft(scope: string, actionId: string): Promise<void> {
  await tx(DRAFTS, "readwrite", (s) => s.delete(draftKey(scope, actionId)));
}

/** On sign-out: remove that account's drafts so the next person on this browser can't see them. */
export async function deleteDraftsForScope(scope: string): Promise<void> {
  const all = await listDrafts();
  await tx(DRAFTS, "readwrite", (s) => {
    for (const d of all) if (d.scope === scope) s.delete(draftKey(d.scope, d.actionId));
  });
}

/** Test hook: lets the verification script simulate a storage failure. */
export function simulateFailureForTesting(): boolean {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem("hiagain:simulateStorageFailure") === "1";
  } catch {
    return false;
  }
}
