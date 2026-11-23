"use client";
import { useEffect, useState } from "react";
import { startLinkedInSignIn } from "@/lib/auth-client";
import { SignInButton } from "./SignInButton";
import { SignInProblem } from "./SignInProblem";

const GUARD = "hiagain:signin-autoretry";
const WINDOW_MS = 3 * 60_000;

/**
 * Sign-in came back in a different browser from the one it started in (usually after approving in
 * the LinkedIn app). Starting again from this browser normally completes at once, so do it
 * automatically, but only once every few minutes so it can never loop.
 */
export function AutoRetrySignIn({ next, reason, detail }: { next: string; reason: string | null; detail: string | null }) {
  const [state, setState] = useState<"retrying" | "manual">("retrying");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let last = 0;
    try { last = Number(sessionStorage.getItem(GUARD) ?? 0); } catch { /* no storage: don't auto-retry */ last = Date.now(); }
    if (Date.now() - last < WINDOW_MS) { setState("manual"); return; }
    try { sessionStorage.setItem(GUARD, String(Date.now())); } catch { /* ignore */ }
    void startLinkedInSignIn(next).then((r) => {
      if (!r.ok) { setMessage(r.message); setState("manual"); }
    });
  }, [next]);

  if (state === "retrying") {
    return <p className="banner info" role="status">Finishing sign-in in this browser…</p>;
  }
  return (
    <>
      <SignInProblem reason={reason} detail={detail} />
      {message && <p className="banner error" role="alert">{message}</p>}
      <SignInButton next={next} />
    </>
  );
}
