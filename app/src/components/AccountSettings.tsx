"use client";
import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { deleteDraftsForScope } from "@/lib/guest-store";
import { Avatar } from "./Avatar";
import { clearCachedQr } from "./QuickQr";

interface Blocked { publicId: string; displayName: string; avatarUrl: string | null }

export function AccountSettings({ userId, blocked: initial, digestEmail: initialDigest = true }: { userId: string; blocked: Blocked[]; digestEmail?: boolean }) {
  const [blocked, setBlocked] = useState(initial);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState(initialDigest);
  const [digestBusy, setDigestBusy] = useState(false);
  // The digest email links straight here (…/me#notifications), so open the section for it.
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (window.location.hash === "#notifications" && detailsRef.current) {
      detailsRef.current.open = true;
      detailsRef.current.scrollIntoView({ block: "start" });
    }
  }, []);

  return (
    <details className="card" style={{ marginTop: "1rem" }} id="notifications" ref={detailsRef}>
      <summary>Privacy and account</summary>
      <h3 style={{ fontSize: "1rem", marginTop: ".5rem" }}>Email</h3>
      <label className="row small" style={{ alignItems: "flex-start" }}>
        <input
          type="checkbox" checked={digest} disabled={digestBusy} style={{ marginTop: ".3rem" }}
          onChange={async (e) => {
            const on = e.target.checked;
            setDigest(on); // optimistic; put back if saving fails
            setDigestBusy(true);
            const { error: er } = (await getBrowserClient()?.rpc("set_digest_email", { p_on: on })) ?? { error: true };
            setDigestBusy(false);
            if (er) { setDigest(!on); setError("Couldn't change your email setting. Try again."); }
          }}
        />
        <span>The morning after you meet people, email me to choose who to meet again. Counts only, never names; at most once a day.</span>
      </label>
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
          clearCachedQr();
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
