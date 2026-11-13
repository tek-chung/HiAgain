"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listGuestSaves, getGuestSave, putGuestSave } from "@/lib/guest-store";
import { withArchived } from "@/lib/core/guest";
import { getBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";

export interface Archived { publicId: string; displayName: string; headline: string | null; avatarUrl: string | null; guestId?: string }

/** Archived people with one-tap Restore. Restoring returns them to their original date group. */
export function ArchiveList({ accountArchived }: { accountArchived: Archived[] | null }) {
  const guest = accountArchived === null;
  const [items, setItems] = useState<Archived[] | null>(accountArchived);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!guest) return;
    listGuestSaves()
      .then((all) => setItems(all.filter((s) => s.archivedAt).map((s) => ({ publicId: s.publicId, displayName: s.snapshot.displayName, headline: s.snapshot.headline, avatarUrl: s.snapshot.avatarUrl }))))
      .catch(() => setItems([]));
  }, [guest]);

  const restore = async (a: Archived) => {
    let ok = false;
    if (a.guestId) {
      const { data } = (await getBrowserClient()?.rpc("set_guest_archived", { p_id: a.guestId, p_archived: false })) ?? { data: null };
      ok = data === "saved";
    } else if (guest) {
      try {
        const s = await getGuestSave(a.publicId);
        if (s) { await putGuestSave(withArchived(s, false)); ok = true; }
      } catch { ok = false; }
    } else {
      const { data } = (await getBrowserClient()?.rpc("set_archived", { p_public_id: a.publicId, p_archived: false })) ?? { data: null };
      ok = data === "saved";
    }
    if (!ok) { setMsg("Couldn't restore. Try again."); return; }
    setItems((list) => (list ?? []).filter((x) => x.publicId !== a.publicId));
    setMsg(`${a.displayName || "Person"} is back in People.`);
  };

  if (!items) return <p className="muted small" role="status">Loading…</p>;
  return (
    <div>
      {msg && <p className="banner small" role="status">{msg}</p>}
      {items.length === 0 && <p className="muted small">Nothing archived. Swipe right on someone in People to archive them — notes and save times are kept.</p>}
      {items.map((a) => (
        <div className="person" key={a.publicId}>
          <Avatar name={a.displayName} src={a.avatarUrl} />
          <Link className="who" href={a.guestId ? `/people/guest/${a.guestId}` : `/p/${a.publicId}`}>
            <strong>{a.displayName || "Unnamed profile"}</strong>
            {a.headline && <span>{a.headline}</span>}
          </Link>
          <button className="btn small" onClick={() => restore(a)}>Restore</button>
        </div>
      ))}
    </div>
  );
}
