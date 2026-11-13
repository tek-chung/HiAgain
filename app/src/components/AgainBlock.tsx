"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { startLinkedInSignIn } from "@/lib/auth-client";
import { GUEST_SCOPE } from "@/lib/core/guest";
import { deleteDraft, listDrafts, putDraft } from "@/lib/guest-store";

export type AgainState = "none" | "sent" | "matched";
export const AGAIN_INTENT = "again"; // draft key used to carry the intent through sign-in

const NEXT_STEPS = {
  coffee: { label: "Coffee", text: "Coffee and a catch-up?" },
  walk: { label: "Walk", text: "Fancy a walk and a catch-up?" },
  call: { label: "Call", text: "Would you be up for a quick call?" },
} as const;
type Step = keyof typeof NEXT_STEPS;

interface Props {
  publicId: string;
  name: string;
  linkedinUrl: string | null;
  viewerId: string | null;
  initial: AgainState;
  resume: boolean;
  signInAvailable: boolean;
}

/**
 * Again: private interest in meeting again. One-sided interest is visible only to the sender;
 * both people see the match only when it's mutual. Either person can end a match.
 */
export function AgainBlock({ publicId, name, linkedinUrl, viewerId, initial, resume, signInAvailable }: Props) {
  const router = useRouter();
  const [state, setState] = useState<AgainState>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("coffee");
  const [message, setMessage] = useState<string>(NEXT_STEPS.coffee.text);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ended, setEnded] = useState(false);
  const resumed = useRef(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const first = name.split(/\s+/)[0] || "they";

  const set = async (on: boolean) => {
    setBusy(true);
    setError(null);
    const { data, error: e } = (await getBrowserClient()?.rpc("set_again", { p_public_id: publicId, p_on: on })) ?? { data: null, error: true };
    setBusy(false);
    const row = Array.isArray(data) ? data[0] : null;
    if (e || !row) { setError("Couldn't update Again. Check your connection and try again."); return false; }
    setState(row.state);
    router.refresh(); // Activity may now show a match
    return true;
  };

  // Resume after sign-in only when this browser recorded the intent (a link alone can't trigger it).
  useEffect(() => {
    if (!resume || !viewerId || resumed.current) return;
    resumed.current = true;
    (async () => {
      let intent = false;
      try {
        intent = (await listDrafts()).some((d) => d.scope === GUEST_SCOPE && d.actionId === `${AGAIN_INTENT}:${publicId}` && d.pendingSend);
        if (intent) await deleteDraft(GUEST_SCOPE, `${AGAIN_INTENT}:${publicId}`);
      } catch { /* no intent available */ }
      if (intent && state === "none") await set(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, viewerId]);

  const signInForAgain = async () => {
    setError(null);
    try {
      await putDraft({ scope: GUEST_SCOPE, actionId: `${AGAIN_INTENT}:${publicId}`, profilePublicId: publicId, body: "", idempotencyKey: "again", pendingSend: true, updatedAt: new Date().toISOString() });
    } catch {
      setError("This browser can't keep your choice through sign-in. Sign in first, then tap Again.");
      return;
    }
    const r = await startLinkedInSignIn(`/p/${publicId}?resume=${AGAIN_INTENT}`);
    if (!r.ok) setError(r.message);
  };

  if (state === "matched") {
    return (
      <section className="card again matched" aria-labelledby="again-h">
        <h2 id="again-h" style={{ marginBottom: 0 }}>It&apos;s mutual.</h2>
        <p className="small muted">You both want to meet again. Make the next step.</p>
        <div className="tabs" role="radiogroup" aria-label="Next step">
          {(Object.keys(NEXT_STEPS) as Step[]).map((k) => (
            <button key={k} role="radio" aria-checked={step === k} aria-selected={step === k}
              onClick={() => { setStep(k); setMessage(NEXT_STEPS[k].text); setCopied(null); }}>
              {NEXT_STEPS[k].label}
            </button>
          ))}
        </div>
        <label className="field">
          <span className="sr-only">Message to send {first}</span>
          <textarea ref={textRef} value={message} onChange={(e) => { setMessage(e.target.value); setCopied(null); }} style={{ minHeight: "4rem" }} />
        </label>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button
            className="btn primary"
            onClick={async () => {
              try { await navigator.clipboard.writeText(message); setCopied("Copied. Paste it wherever you talk to " + first + "."); }
              catch { textRef.current?.select(); setCopied("Couldn't copy automatically — the text is selected, so copy it yourself."); }
            }}
          >
            Copy message
          </button>
          {linkedinUrl && <a className="btn" href={linkedinUrl} target="_blank" rel="noopener noreferrer">Open LinkedIn</a>}
        </div>
        {copied && <p className="small" role="status">{copied}</p>}
        <p className="small muted">Hi Again doesn&apos;t send this or book anything — you choose how to get in touch.</p>
        {confirmEnd ? (
          <div className="banner info small">
            <p style={{ margin: "0 0 .5rem" }}>End this match? It disappears for both of you, and {first} isn&apos;t notified.</p>
            <div className="row">
              <button className="btn" onClick={() => setConfirmEnd(false)}>Cancel</button>
              <button className="btn primary" disabled={busy} onClick={async () => {
                setBusy(true);
                const { data } = (await getBrowserClient()?.rpc("end_match", { p_public_id: publicId })) ?? { data: null };
                setBusy(false);
                if (data === "ended" || data === "not_found") { setState("none"); setConfirmEnd(false); setEnded(true); router.refresh(); }
                else setError("Couldn't end the match. Try again.");
              }}>End match</button>
            </div>
          </div>
        ) : (
          <button className="btn plain small" onClick={() => setConfirmEnd(true)}>End match</button>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
      </section>
    );
  }

  const sent = state === "sent";
  return (
    <section className="again" aria-label="Again">
      <button
        className={"btn full " + (sent ? "" : "primary")}
        aria-pressed={sent}
        disabled={busy}
        onClick={() => (viewerId ? set(!sent) : signInForAgain())}
      >
        {sent ? "Again ✓" : "Again"}
      </button>
      <p className="small muted" style={{ textAlign: "center" }}>
        {sent
          ? "Only you can see your interest. Tap to undo."
          : viewerId
            ? "Want to meet again? Only revealed when mutual."
            : signInAvailable
              ? "Want to meet again? Sign in with LinkedIn — it's only revealed when mutual."
              : "Want to meet again? Sign-in is unavailable in this development build."}
      </p>
      {ended && <p className="small muted" role="status">Match ended.</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}
