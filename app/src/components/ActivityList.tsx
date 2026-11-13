"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ACTION_LABELS, type ActionKind, type Contribution } from "@/lib/core/types";
import { groupByDay, exactTimestamp } from "@/lib/core/dates";
import { getBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";
import { SentContribution } from "./ProfileView";

export interface ActivityItem {
  id: string;
  direction: "received" | "sent";
  kind: ActionKind | "match";
  promptSnapshot: string;
  body: string;
  sentAt: string;
  editedAt: string | null;
  version: number;
  unread: boolean;
  other: { publicId: string; displayName: string; avatarUrl: string | null };
}

/** Received and Sent, newest first. Opening an item marks that version read; Mark all as read keeps the history. */
export function ActivityList({ items: initial }: { items: ActivityItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = useMemo(() => items.filter((i) => i.direction === tab), [items, tab]);
  const unread = items.filter((i) => i.unread);

  const markRead = async (list: ActivityItem[]) => {
    if (!list.length) return;
    const supabase = getBrowserClient();
    const contributions = list.filter((i) => i.kind !== "match");
    const matches = list.filter((i) => i.kind === "match");
    const results = await Promise.all([
      contributions.length ? supabase?.rpc("mark_activity_read", { p_items: contributions.map((i) => ({ id: i.id, version: i.version })) }) : null,
      matches.length ? supabase?.rpc("mark_matches_read", { p_ids: matches.map((i) => i.id) }) : null,
    ]);
    if (!supabase || results.some((r) => r && r.error)) { setError("Couldn't update read status. Try again."); return; }
    const done = new Set(list.map((i) => `${i.id}:${i.version}`));
    setItems((all) => all.map((i) => (done.has(`${i.id}:${i.version}`) ? { ...i, unread: false } : i)));
    router.refresh(); // updates the badge
  };

  return (
    <div>
      <div className="tabs" role="tablist" aria-label="Activity">
        {(["received", "sent"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setOpen(null); }}>
            {t === "received" ? "Received" : "Sent"}
            {t === "received" && unread.length > 0 ? ` (${unread.length})` : ""}
          </button>
        ))}
      </div>
      {unread.length > 0 && (
        <div className="row spread">
          <span className="small muted">{unread.length} unread</span>
          <button className="btn plain small" onClick={() => markRead(unread)}>Mark all as read</button>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      {visible.length === 0 && (
        <p className="muted small" style={{ marginTop: "1rem" }}>
          {tab === "received" ? "Nothing yet. When someone answers your question, asks for feedback or wants to join you — or when an Again becomes mutual — it appears here." : "Answers, requests and interest you send appear here, and you can edit what you wrote."}
        </p>
      )}
      {groupByDay(visible, (i) => i.editedAt ?? i.sentAt).map((g) => (
        <section key={g.label} aria-label={g.label}>
          <h2 className="group-label">{g.label}</h2>
          {g.items.map((i) => {
            const isOpen = open === i.id;
            const name = i.other.displayName || "Someone";
            if (i.kind === "match") {
              return (
                <div className="activity-item" key={i.id}>
                  <button aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : i.id); if (!isOpen && i.unread) void markRead([i]); }}>
                    <Avatar name={name} src={i.other.avatarUrl} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong>{name} · It&apos;s mutual</strong>
                      <span className="small muted" style={{ display: "block" }}>You both want to meet again.</span>
                    </span>
                    {i.unread && <span className="unread-dot" aria-label="Unread" />}
                  </button>
                  {isOpen && (
                    <div className="card" style={{ marginTop: ".5rem" }}>
                      <p className="small muted" style={{ marginTop: 0 }}>Matched {exactTimestamp(i.sentAt)}</p>
                      <Link className="btn primary small" href={`/p/${i.other.publicId}`}>Make the next step</Link>
                    </div>
                  )}
                </div>
              );
            }
            const label = ACTION_LABELS[i.kind];
            return (
              <div className="activity-item" key={i.id}>
                <button
                  aria-expanded={isOpen}
                  onClick={() => {
                    setOpen(isOpen ? null : i.id);
                    if (!isOpen && i.unread) void markRead([i]);
                  }}
                >
                  <Avatar name={name} src={i.other.avatarUrl} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>{i.direction === "received" ? `${name} · ${label.received}` : `To ${name} · ${label.done}`}</strong>
                    <span className="small muted clamp2" style={{ display: "-webkit-box" }}>{i.body || i.promptSnapshot}</span>
                  </span>
                  {i.unread && <span className="unread-dot" aria-label="Unread" />}
                </button>
                {isOpen && (
                  <div className="card" style={{ marginTop: ".5rem" }}>
                    <p className="small muted" style={{ marginTop: 0 }}>{label.title}: {i.promptSnapshot}</p>
                    {i.direction === "sent" ? (
                      <SentContribution
                        c={toContribution(i)}
                        kind={i.kind as ActionKind}
                        notice={null}
                        onUpdated={(c) => { setItems((all) => all.map((x) => (x.id === c.id ? { ...x, body: c.body, version: c.version, editedAt: c.editedAt } : x))); router.refresh(); }}
                      />
                    ) : (
                      <>
                        <p className="small muted">Sent {exactTimestamp(i.sentAt)}{i.editedAt ? ` · Edited ${exactTimestamp(i.editedAt)}` : ""}</p>
                        {i.body ? <p style={{ whiteSpace: "pre-wrap" }}>{i.body}</p> : <p className="muted">{name} would like to join you.</p>}
                        <p className="small muted">Continue the conversation outside Hi Again — for example on LinkedIn or in person.</p>
                      </>
                    )}
                    <Link className="btn small" href={`/p/${i.other.publicId}`}>View {name}</Link>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function toContribution(i: ActivityItem): Contribution {
  return { id: i.id, actionId: "", kind: i.kind as ActionKind, promptSnapshot: i.promptSnapshot, body: i.body, sentAt: i.sentAt, editedAt: i.editedAt, version: i.version };
}
