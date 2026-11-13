"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { normaliseLinkedInUrl, linkedInErrorMessage } from "@/lib/core/linkedin";
import { LIMITS, countChars, countWords } from "@/lib/core/limits";
import { ACTION_LABELS, type ActionKind } from "@/lib/core/types";
import { CalendarIdeas } from "./CalendarIdeas";
import { Avatar } from "./Avatar";
import { AvatarError, removeAvatar, uploadAvatar } from "@/lib/avatar";

interface Props {
  displayName: string;
  headline: string | null;
  linkedinUrl: string | null;
  prompts: Record<ActionKind, string>;
  calendarAvailable: boolean;
  userId: string;
  avatarUrl: string | null;
}

const KINDS: ActionKind[] = ["join_me", "question", "feedback"];

/** Inline editing on My QR: one dynamic primary action, no separate edit screen. */
export function ProfileEditor(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(props.displayName);
  const [headline, setHeadline] = useState(props.headline ?? "");
  const [linkedin, setLinkedin] = useState(props.linkedinUrl ?? "");
  const [prompts, setPrompts] = useState(props.prompts);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const joinRef = useRef<HTMLTextAreaElement>(null);
  const [avatar, setAvatar] = useState(props.avatarUrl);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ error: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoMsg(null);
    try {
      setAvatar(await uploadAvatar(props.userId, file));
      setPhotoMsg({ error: false, text: "Photo updated." });
      router.refresh();
    } catch (e) {
      setPhotoMsg({ error: true, text: e instanceof AvatarError ? e.message : "Couldn't upload the photo. Try again." });
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!editing) {
    return <button className="btn full" onClick={() => setEditing(true)}>Edit profile</button>;
  }

  const save = async () => {
    setError(null);
    let li: string | null = null;
    if (linkedin.trim()) {
      const r = normaliseLinkedInUrl(linkedin);
      if (!r.ok) return setError(linkedInErrorMessage(r.reason));
      li = r.url;
    }
    if (countChars(name.trim()) > LIMITS.displayName || countChars(headline.trim()) > LIMITS.headline) {
      return setError("Shorten the highlighted field.");
    }
    if (KINDS.some((k) => countChars(prompts[k]) > LIMITS.prompt)) return setError(`Keep each invitation to ${LIMITS.prompt} characters.`);
    const supabase = getBrowserClient();
    if (!supabase) return setError("Profile editing needs Supabase to be configured.");
    setBusy(true);
    const { error: e } = await supabase.rpc("update_my_profile", { p_display_name: name, p_headline: headline, p_linkedin_url: li ?? "" });
    let failed = Boolean(e);
    for (const k of KINDS) {
      if (failed) break;
      if (prompts[k].trim() !== props.prompts[k].trim()) {
        const { error: ae } = await supabase.rpc("update_my_action", { p_kind: k, p_prompt: prompts[k] });
        failed = Boolean(ae);
      }
    }
    setBusy(false);
    if (failed) return setError("Couldn't save all your changes. They're still here — try again.");
    setLinkedin(li ?? "");
    setEditing(false);
    router.refresh();
  };

  return (
    <form className="card" noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className="field" role="group" aria-labelledby="photo-label">
        <span id="photo-label" style={{ display: "block", fontWeight: 600, fontSize: ".9rem", marginBottom: ".25rem" }}>Photo</span>
        <div className="row">
          <Avatar name={name} src={avatar} />
          <button type="button" className="btn small" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
            {photoBusy ? "Uploading…" : avatar ? "Change photo" : "Add photo"}
          </button>
          {avatar && (
            <button type="button" className="btn plain small" disabled={photoBusy} onClick={async () => {
              setPhotoBusy(true);
              try { await removeAvatar(props.userId); setAvatar(null); setPhotoMsg({ error: false, text: "Photo removed." }); router.refresh(); }
              catch { setPhotoMsg({ error: true, text: "Couldn't remove the photo. Try again." }); }
              finally { setPhotoBusy(false); }
            }}>Remove</button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden aria-label="Choose a photo" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </div>
        <p className="small muted" style={{ margin: ".25rem 0 0" }}>Public on your profile. Saved straight away, cropped to a square.</p>
        {photoMsg && <p className={photoMsg.error ? "field-error" : "small"} role={photoMsg.error ? "alert" : "status"}>{photoMsg.text}</p>}
      </div>
      <label className="field">
        <span>Name</span>
        <input type="text" value={name} maxLength={LIMITS.displayName} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <label className="field">
        <span>What you do</span>
        <input type="text" value={headline} maxLength={LIMITS.headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Product designer · London" />
      </label>
      <label className="field">
        <span>LinkedIn profile link (optional)</span>
        <input type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/your-name" />
      </label>
      {KINDS.map((k) => {
        const chars = countChars(prompts[k]);
        return (
          <label className="field" key={k}>
            <span className="row spread">
              {ACTION_LABELS[k].title}
              {k === "join_me" && props.calendarAvailable && (
                <a href="#calendar-ideas" className="small" style={{ fontWeight: 400 }}>Choose from calendar ideas ↓</a>
              )}
            </span>
            <textarea
              ref={k === "join_me" ? joinRef : undefined}
              value={prompts[k]}
              onChange={(e) => setPrompts({ ...prompts, [k]: e.target.value })}
              style={{ minHeight: "4.5rem" }}
              placeholder="Leave empty to hide this action"
            />
            <div className={"counter" + (chars > LIMITS.prompt ? " over" : "")}>{countWords(prompts[k])} words · {chars}/{LIMITS.prompt}</div>
          </label>
        );
      })}
      {notice && <p className="banner small" role="status">{notice}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="row">
        <button type="button" className="btn" onClick={() => { setEditing(false); setError(null); setPrompts(props.prompts); }} disabled={busy}>Cancel</button>
        <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
      {props.calendarAvailable && (
        <CalendarIdeas
          onUse={(wording) => {
            setPrompts((p) => ({ ...p, join_me: wording }));
            setNotice("Added to Join me. Save changes to put it on your profile.");
            joinRef.current?.focus();
            joinRef.current?.scrollIntoView({ block: "center" });
          }}
        />
      )}
    </form>
  );
}
