"use client";
import { useState } from "react";
import { startLinkedInSignIn } from "@/lib/auth-client";

export function SignInButton({ next, label = "Continue with LinkedIn" }: { next: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        className="btn primary full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await startLinkedInSignIn(next);
          if (!r.ok) {
            setError(r.message);
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening LinkedIn…" : label}
      </button>
      {error && <p className="banner error" role="alert">{error}</p>}
    </div>
  );
}
