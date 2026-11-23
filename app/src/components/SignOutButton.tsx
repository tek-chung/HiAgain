"use client";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { deleteDraftsForScope } from "@/lib/guest-store";
import { clearCachedQr } from "./QuickQr";

export function SignOutButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn plain small"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        // Remove this account's drafts first so the next person on this browser can't see them.
        try { await deleteDraftsForScope(userId); } catch { /* storage unavailable: nothing to clear */ }
        clearCachedQr();
        await signOut();
        window.location.assign("/");
      }}
    >
      Sign out
    </button>
  );
}
