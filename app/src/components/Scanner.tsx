"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { publicIdFromScan } from "@/lib/core/public-id";

// Minimal typing for the BarcodeDetector API (Chrome/Android; not Safari).
type Detector = { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> };
declare global {
  interface Window { BarcodeDetector?: new (opts: { formats: string[] }) => Detector }
}

export function Scanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"checking" | "camera" | "unsupported" | "denied">("checking");
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);

  const go = (text: string) => {
    const id = publicIdFromScan(text, window.location.origin);
    if (!id) { setError("That isn't a Hi Again profile code or link."); return false; }
    router.push(`/p/${id}`);
    return true;
  };

  useEffect(() => {
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) { setMode("unsupported"); return; }
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        setMode("denied");
        return;
      }
      if (stopped || !video.current) return;
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      setMode("camera");
      const tick = async () => {
        if (stopped || !video.current) return;
        try {
          const codes = await detector.detect(video.current);
          for (const c of codes) if (publicIdFromScan(c.rawValue, window.location.origin)) { stopped = true; go(c.rawValue); return; }
        } catch { /* frame not ready */ }
        raf = window.setTimeout(tick, 250) as unknown as number;
      };
      void tick();
    })();
    return () => { stopped = true; clearTimeout(raf); stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stack">
      {mode === "camera" && <video ref={video} className="scanner" playsInline muted aria-label="Camera view" />}
      {mode !== "camera" && <video ref={video} hidden playsInline muted />}
      {mode === "checking" && <p className="muted small" role="status">Starting camera…</p>}
      {mode === "unsupported" && <p className="banner info small">Use your phone&apos;s camera app to scan a Hi Again code — it opens the profile here. Or paste a link below.</p>}
      {mode === "denied" && <p className="banner info small">Camera access is off. Allow it in your browser settings, use your phone&apos;s camera app, or paste a link below.</p>}
      <form noValidate onSubmit={(e) => { e.preventDefault(); setError(null); go(paste); }}>
        <label className="field">
          <span>Profile link</span>
          <input type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="https://…/p/…" />
        </label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="btn full" type="submit">Open profile</button>
      </form>
    </div>
  );
}
