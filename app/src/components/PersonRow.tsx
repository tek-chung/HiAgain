"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { ArchiveIcon } from "./Icons";

const THRESHOLD = 80;

interface Props {
  publicId: string;
  name: string;
  headline: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  context?: string | null;
  /** Small label after the name, e.g. "Scanned you" or "Guest". */
  tag?: string | null;
  /** Defaults to the person's public profile. */
  href?: string;
  onArchive: () => void;
  onNoLinkedIn: () => void;
}

/**
 * People row. Archive button on the left, LinkedIn on the right, name in between.
 * Swipe left → LinkedIn, swipe right → archive. Horizontal swipes only; vertical scrolling is untouched.
 */
export function PersonRow({ publicId, name, headline, avatarUrl, linkedinUrl, context, tag, href, onArchive, onNoLinkedIn }: Props) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const horizontal = useRef(false);
  const [dx, setDx] = useState(0);
  const display = name || "Unnamed profile";

  const openLinkedIn = () => {
    if (linkedinUrl) window.open(linkedinUrl, "_blank", "noopener,noreferrer");
    else onNoLinkedIn();
  };

  return (
    <div className="swipe-wrap">
      <div className="swipe-bg" aria-hidden="true">
        <span>{dx > 0 ? "Archive" : ""}</span>
        <span>{dx < 0 ? (linkedinUrl ? "LinkedIn" : "No LinkedIn link") : ""}</span>
      </div>
      <div
        className={"swipe-row" + (start.current ? " dragging" : "")}
        style={{ transform: `translateX(${dx}px)` }}
        data-testid={`row-${publicId}`}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          horizontal.current = false;
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s || s.id !== e.pointerId) return;
          const mx = e.clientX - s.x, my = e.clientY - s.y;
          if (!horizontal.current) {
            if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { start.current = null; return; } // a scroll
            if (Math.abs(mx) > 10) { horizontal.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
          }
          if (horizontal.current) setDx(Math.max(-120, Math.min(120, mx)));
        }}
        onPointerUp={() => {
          const d = dx;
          start.current = null;
          setDx(0);
          if (!horizontal.current) return;
          horizontal.current = false;
          if (d >= THRESHOLD) onArchive();
          else if (d <= -THRESHOLD) openLinkedIn();
        }}
        onPointerCancel={() => { start.current = null; horizontal.current = false; setDx(0); }}
        onClickCapture={(e) => { if (Math.abs(dx) > 5) e.preventDefault(); }}
      >
        <div className="person">
          <button className="row-btn" onClick={onArchive} aria-label={`Archive ${display}`} title="Archive">
            <ArchiveIcon />
          </button>
          <Avatar name={display} src={avatarUrl} />
          <Link className="who" href={href ?? `/p/${publicId}`} draggable={false}>
            <strong>{display}{tag && <span className="badge">{tag}</span>}</strong>
            {(context || headline) && <span>{context ? `Met at ${context}` : headline}</span>}
          </Link>
          {linkedinUrl ? (
            <a className="li" href={linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label={`${display} on LinkedIn (opens LinkedIn)`}>in</a>
          ) : (
            <button className="li disabled" onClick={onNoLinkedIn} aria-label={`${display} hasn't added a LinkedIn link`}>in</button>
          )}
        </div>
      </div>
    </div>
  );
}
