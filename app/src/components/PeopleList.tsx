"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SavedPerson } from "@/lib/core/types";
import { groupByDay } from "@/lib/core/dates";
import { withArchived } from "@/lib/core/guest";
import { getGuestSave, listGuestSaves, putGuestSave, GuestStoreError } from "@/lib/guest-store";
import { getBrowserClient } from "@/lib/supabase/client";
import { PersonRow } from "./PersonRow";
import { ArchiveIcon } from "./Icons";

type Person = SavedPerson & { context?: string | null; source?: string; guestId?: string };

export interface GuestVisitor { id: string; alias: string; firstAt: string }

export function PeopleList({ accountSaves, guestVisitors = [], notice }: { accountSaves: Person[] | null; guestVisitors?: GuestVisitor[]; notice?: string | null }) {
  const router = useRouter();
  const [people, setPeople] = useState<Person[] | null>(
    accountSaves ? [...accountSaves, ...guestVisitors.map(visitorToPerson)] : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ text: string; undo?: Person } | null>(null);
  const guest = accountSaves === null;

  useEffect(() => {
    if (!guest) return;
    listGuestSaves()
      .then((saves) =>
        setPeople(saves.filter((s) => !s.archivedAt).map((s) => ({
          publicId: s.publicId, displayName: s.snapshot.displayName, headline: s.snapshot.headline,
          avatarUrl: s.snapshot.avatarUrl, linkedinUrl: s.snapshot.linkedinUrl,
          savedAt: s.savedAt, note: s.note, noteUpdatedAt: s.noteUpdatedAt,
        }))),
      )
      .catch((e) => {
        setError(e instanceof GuestStoreError ? e.message : "This browser couldn't read its saved people.");
        setPeople([]);
      });
  }, [guest]);

  const setArchived = async (p: Person, archived: boolean): Promise<boolean> => {
    if (p.guestId) {
      const { data } = (await getBrowserClient()?.rpc("set_guest_archived", { p_id: p.guestId, p_archived: archived })) ?? { data: null };
      return data === "saved";
    }
    if (guest) {
      try {
        const s = await getGuestSave(p.publicId);
        if (!s) return false;
        await putGuestSave(withArchived(s, archived));
        return true;
      } catch { return false; }
    }
    const { data } = (await getBrowserClient()?.rpc("set_archived", { p_public_id: p.publicId, p_archived: archived })) ?? { data: null };
    return data === "saved";
  };

  const archive = async (p: Person) => {
    if (!(await setArchived(p, true))) { setBanner({ text: "Couldn't archive. Try again." }); return; }
    setPeople((list) => (list ?? []).filter((x) => x.publicId !== p.publicId));
    setBanner({ text: `${p.displayName || "Person"} archived.`, undo: p });
    if (!guest) router.refresh();
  };
  const undo = async (p: Person) => {
    if (!(await setArchived(p, false))) { setBanner({ text: "Couldn't undo. Restore from Archive instead." }); return; }
    setPeople((list) => [...(list ?? []), p]);
    setBanner(null);
    if (!guest) router.refresh();
  };

  if (!people) return <p className="muted small" role="status">Loading…</p>;
  return (
    <div>
      <div className="row spread">
        <p className="small muted" style={{ margin: 0 }}>
          {guest ? "Saved in this browser. Sign in to keep them in your account." : people.length > 0 ? "Swipe ← LinkedIn · swipe → archive" : ""}
        </p>
        <Link className="btn plain small" href="/people/archive"><ArchiveIcon /> Archive</Link>
      </div>
      {guest && people.length > 0 && <p className="small muted" style={{ marginTop: 0 }}>Swipe ← LinkedIn · swipe → archive</p>}
      {notice && !banner && <p className="banner small" role="status">{notice}</p>}
      {banner && (
        <div className="banner small row spread" role="status">
          <span>{banner.text}</span>
          {banner.undo && <button className="btn small" onClick={() => undo(banner.undo!)}>Undo</button>}
        </div>
      )}
      {error && <p className="banner error" role="alert">{error}</p>}
      {people.length === 0 && !error && (
        <div className="card">
          <p style={{ marginTop: 0 }}><strong>No one here yet.</strong></p>
          <p className="small muted">Scan someone&apos;s Hi Again code with your phone camera or the scan button — they&apos;re saved automatically. Archived people are in Archive.</p>
          <Link className="btn" href="/scan">Scan a code</Link>
        </div>
      )}
      {groupByDay(people, (p) => p.savedAt).map((g) => (
        <section key={g.label} aria-label={g.label}>
          <h2 className="group-label">{g.label}</h2>
          {g.items.map((p) => (
            <PersonRow
              key={p.publicId}
              publicId={p.publicId}
              name={p.displayName}
              headline={p.headline}
              avatarUrl={p.avatarUrl}
              linkedinUrl={p.linkedinUrl}
              context={p.context}
              tag={p.guestId ? "Guest" : p.source === "incoming_scan" ? "Scanned you" : null}
              href={p.guestId ? `/people/guest/${p.guestId}` : undefined}
              onArchive={() => archive(p)}
              onNoLinkedIn={() => setBanner({ text: p.guestId ? "Guests don't have a LinkedIn link." : `${p.displayName || "This person"} hasn't added a LinkedIn link.` })}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function visitorToPerson(v: GuestVisitor): Person {
  return {
    publicId: `guest-${v.id}`, guestId: v.id, displayName: v.alias, headline: "Visited your profile as a guest",
    avatarUrl: null, linkedinUrl: null, savedAt: v.firstAt, note: "", noteUpdatedAt: null,
  };
}
