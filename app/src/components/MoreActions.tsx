"use client";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

/** Block and Report, tucked at the bottom of a profile. Blocking is silent and fully reversible from My QR. */
export function MoreActions({ publicId, name }: { publicId: string; name: string }) {
  const [mode, setMode] = useState<"idle" | "block" | "report" | "reported">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const first = name.split(/\s+/)[0] || "them";

  const block = async () => {
    setBusy(true);
    const { data } = (await getBrowserClient()?.rpc("block_user", { p_public_id: publicId })) ?? { data: null };
    setBusy(false);
    if (data === "blocked") window.location.assign("/people?blocked=1");
    else setError("Couldn't block. Try again.");
  };

  return (
    <details className="more" style={{ marginTop: "1.5rem" }}>
      <summary className="small muted">More</summary>
      {mode === "idle" && (
        <div className="row">
          <button className="btn small" onClick={() => setMode("block")}>Block {first}</button>
          <button className="btn small" onClick={() => setMode("report")}>Report</button>
        </div>
      )}
      {mode === "block" && (
        <div className="banner info small">
          <p style={{ margin: "0 0 .5rem" }}>Block {first}? You won&apos;t see each other in Hi Again, any match ends, and {first} isn&apos;t told. You can unblock from My QR.</p>
          <div className="row">
            <button className="btn" onClick={() => setMode("idle")}>Cancel</button>
            <button className="btn primary" disabled={busy} onClick={block}>Block</button>
          </div>
        </div>
      )}
      {(mode === "report" || mode === "reported") && (
        <form noValidate onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setBusy(true);
          const { data } = (await getBrowserClient()?.rpc("report_user", { p_public_id: publicId, p_reason: reason })) ?? { data: null };
          setBusy(false);
          if (data === "reported") setMode("reported");
          else setError(data === "invalid" ? "Tell us briefly what happened." : data === "limited" ? "You've sent a lot of reports today. Try again tomorrow." : "Couldn't send the report. Try again.");
        }}>
          {mode === "reported" ? (
            <p className="banner small" role="status">Thanks — your report was sent for review. {first} isn&apos;t told who reported them.</p>
          ) : (
            <>
              <label className="field">
                <span>What&apos;s wrong?</span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} style={{ minHeight: "5rem" }} />
              </label>
              <div className="row">
                <button type="button" className="btn" onClick={() => setMode("idle")}>Cancel</button>
                <button type="submit" className="btn primary" disabled={busy || !reason.trim()}>Send report</button>
              </div>
            </>
          )}
          {mode === "reported" && <button type="button" className="btn small" onClick={() => setMode("block")}>Also block {first}</button>}
        </form>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </details>
  );
}
