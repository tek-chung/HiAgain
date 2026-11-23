"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { linkedInErrorMessage, normaliseLinkedInUrl } from "@/lib/core/linkedin";
import { logFunnel } from "@/lib/funnel";

/**
 * Sign-in with LinkedIn doesn't share the profile link, so until it's added nobody who scans this
 * person can connect with them, and a mutual Again has nowhere to go. Shown under the QR on My QR.
 */
export function LinkedInPrompt({ displayName, headline }: { displayName: string; headline: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState(false);

  const save = async (input: string) => {
    setError(null);
    const r = normaliseLinkedInUrl(input);
    if (!r.ok) { setError(linkedInErrorMessage(r.reason)); return; }
    const supabase = getBrowserClient();
    if (!supabase) { setError("Saving needs Supabase to be configured."); return; }
    setBusy(true);
    const { error: e } = await supabase.rpc("update_my_profile", { p_display_name: displayName, p_headline: headline ?? "", p_linkedin_url: r.url });
    setBusy(false);
    if (e) { setError("Couldn't save your link. It's still here — try again."); return; }
    logFunnel("linkedin_prompt_saved");
    router.refresh();
  };

  return (
    <section className="card prompt" aria-labelledby="li-prompt-h" data-testid="linkedin-prompt">
      <h2 id="li-prompt-h" style={{ fontSize: "1rem", marginBottom: ".25rem" }}>Add your LinkedIn link</h2>
      <p className="small muted">People who scan you can then connect in one tap, and a mutual Again has somewhere to go. LinkedIn sign-in doesn&apos;t share it, so paste it once.</p>
      <form noValidate onSubmit={(e) => { e.preventDefault(); void save(value); }}>
        <label className="sr-only" htmlFor="li-prompt-input">Your LinkedIn profile link</label>
        <input
          id="li-prompt-input" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          value={value} onChange={(e) => { setValue(e.target.value); setError(null); }} placeholder="linkedin.com/in/your-name"
        />
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="row" style={{ marginTop: ".5rem", flexWrap: "wrap" }}>
          <button
            type="button" className="btn"
            onClick={async () => {
              // Read the clipboard only when asked to; fall back to the field's own paste.
              try {
                const t = await navigator.clipboard.readText();
                setValue(t);
                if (normaliseLinkedInUrl(t).ok) await save(t);
                else setError("That isn't a LinkedIn profile link. Copy it from LinkedIn, then try again.");
              } catch {
                setError("Couldn't read the clipboard. Press and hold the box to paste instead.");
              }
            }}
            disabled={busy}
          >
            Paste
          </button>
          <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={busy || !value.trim()}>{busy ? "Saving…" : "Save link"}</button>
        </div>
      </form>
      <button type="button" className="btn plain small" aria-expanded={help} onClick={() => setHelp(!help)}>Where do I find it?</button>
      {help && (
        <p className="small muted">
          In the LinkedIn app, open your profile, tap <strong>…</strong> (More) → <strong>Contact info</strong>, and copy your profile link.
          On a computer it&apos;s the address of your profile page.{" "}
          <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer">Open LinkedIn</a>
        </p>
      )}
    </section>
  );
}
