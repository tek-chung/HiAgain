"use client";
import { useState } from "react";

export function ShareLink({ url, name }: { url: string; name: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="stack">
      <p className="small muted" style={{ textAlign: "center", wordBreak: "break-all" }}>{url}</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <button
          className="btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setMsg("Link copied.");
            } catch {
              setMsg("Couldn't copy — press and hold the link instead.");
            }
          }}
        >
          Copy link
        </button>
        <button
          className="btn"
          onClick={async () => {
            if (navigator.share) {
              try {
                await navigator.share({ title: `${name} on Hi Again`, url });
              } catch {
                /* dismissed */
              }
            } else {
              setMsg("Sharing isn't available here — copy the link instead.");
            }
          }}
        >
          Share
        </button>
      </div>
      {msg && <p className="small muted" role="status" style={{ textAlign: "center" }}>{msg}</p>}
    </div>
  );
}
