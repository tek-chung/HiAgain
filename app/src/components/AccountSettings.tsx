"use client";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { deleteDraftsForScope } from "@/lib/guest-store";
import { Avatar } from "./Avatar";

interface Blocked { publicId: string; displayName: string; avatarUrl: string | null }

export function AccountSettings({ userId, blocked: initial }: { userId: string; blocked: Blocked[] }) {
  const [blocked, setBlocked] = useState(initial);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <details className="card" style={{ marginTop: "1rem" }}>
      <summary>Privacy and account</summary>
      <h3 style={{ fontSize: "1rem", marginTop: ".5rem" }}>Blocked people</h3>
      {blocked.length === 0 && <p className="small muted">No one. You can block someone from the bottom of their profile.</p>}
      {blocked.map((b) => (
        <div className="person" key={b.publicId}>
          <Avatar name={b.displayName} src={b.avatarUrl} />
          <span className="who"><strong>{b.displayName || "Unnamed profile"}</strong></span>
          <button className="btn small" onClick={async () => {
            const { data } = (await getBrowserClient()?.rpc("unblock_user", { p_public_id: b.publicId })) ?? { data: null };
            if (data === "unblocked") setBlocked((l) => l.filter((x) => x.publicId !== b.publicId));
            else setError("Couldn't unblock. Try again.");
          }}>Unblock</button>
        </div>
      ))}

      <h3 style={{ fontSize: "1rem", marginTop: "1.25rem" }}>Delete account</h3>
      <p className="small muted">
        Permanently deletes your profile and QR, the people you saved and your notes, everything you sent to others,
        your Again choices and matches, and your Calendar connection. This can&apos;t be undone.
      </p>
      <label className="field">
        <span className="small">Type DELETE to confirm</span>
        <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" autoCapitalize="characters" />
      </label>
      <button
        className="btn"
        style={{ borderColor: "var(--hs-red)", color: "var(--hs-red)" }}
        disabled={confirmText.trim() !== "DELETE" || deleting}
        onClick={async () => {
          setDeleting(true);
          setError(null);
          const r = await fetch("/api/account/delete", { method: "POST" }).catch(() => null);
          if (!r?.ok) { setDeleting(false); setError("Couldn't delete your account. Nothing was deleted — try again."); return; }
          try { await deleteDraftsForScope(userId); } catch { /* nothing stored */ }
          await getBrowserClient()?.auth.signOut().catch(() => undefined);
          window.location.assign("/?deleted=1");
        }}
      >
        {deleting ? "Deleting…" : "Delete my account permanently"}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </details>
  );
}
