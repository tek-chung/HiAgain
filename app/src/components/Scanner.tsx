"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { publicIdFromScan } from "@/lib/core/public-id";

// Built-in QR detection where the browser has it (Chrome on Android); otherwise jsQR decodes
// camera frames in JavaScript (iPhone Safari, desktop). One <video> element is always mounted so
// the camera stream stays attached to the element that's on screen.
type Detector = { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> };
declare global {
  interface Window {
    BarcodeDetector?: { new (opts: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };
  }
}

type Mode = "starting" | "scanning" | "denied" | "unavailable" | "busy";

export function Scanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<Mode>("starting");
  const [hint, setHint] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = (text: string) => {
    const id = publicIdFromScan(text, window.location.origin);
    if (!id) return false;
    router.push(`/p/${id}`);
    return true;
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;
    const stop = () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setMode("unavailable"); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      } catch (e) {
        const name = (e as { name?: string }).name;
        setMode(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotReadableError" ? "busy" : "unavailable");
        return;
      }
      const v = video.current;
      if (stopped || !v) { stop(); return; }
      v.muted = true;
      v.setAttribute("muted", "");
      v.setAttribute("playsinline", "");
      v.srcObject = stream;
      await v.play().catch(() => {});
      setMode("scanning");

      let detector: Detector | null = null;
      try {
        const formats = (await window.BarcodeDetector?.getSupportedFormats?.()) ?? [];
        if (window.BarcodeDetector && formats.includes("qr_code")) detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      } catch { detector = null; }
      const jsQR = detector ? null : (await import("jsqr")).default;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      let lastHint = 0;

      const tick = async () => {
        if (stopped) return;
        if (v.readyState >= 2 && v.videoWidth) {
          let found: string | null = null;
          try {
            if (detector) {
              found = (await detector.detect(v))[0]?.rawValue ?? null;
            } else if (jsQR && ctx) {
              const scale = Math.min(1, 640 / v.videoWidth);
              canvas.width = Math.round(v.videoWidth * scale);
              canvas.height = Math.round(v.videoHeight * scale);
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              found = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
            }
          } catch { /* frame not ready */ }
          if (found) {
            if (open(found)) { stop(); return; }
            if (Date.now() - lastHint > 3000) { setHint("That QR code isn't a Hi Again profile."); lastHint = Date.now(); }
          }
        }
        timer = window.setTimeout(tick, 150);
      };
      void tick();
    })();

    const onHide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onHide);
    return () => { document.removeEventListener("visibilitychange", onHide); stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const live = mode === "starting" || mode === "scanning";
  return (
    <div className="stack">
      <div className="scanner-frame" hidden={!live}>
        <video ref={video} className="scanner" playsInline muted autoPlay aria-label="Camera view" />
        {mode === "scanning" && <div className="scanner-target" aria-hidden="true" />}
      </div>
      {mode === "starting" && <p className="muted small" role="status">Starting camera…</p>}
      {mode === "scanning" && <p className="muted small" role="status">{hint ?? "Hold the QR code inside the square."}</p>}
      {mode === "denied" && <p className="banner info small">Camera access is off. Allow it for this site in your browser settings, use your phone&apos;s camera app, or paste a link below.</p>}
      {mode === "busy" && <p className="banner info small">Another app is using the camera. Close it and reload, or paste a link below.</p>}
      {mode === "unavailable" && <p className="banner info small">This browser can&apos;t use the camera here. Use your phone&apos;s camera app to scan a Hi Again code, or paste a link below.</p>}
      <form noValidate onSubmit={(e) => { e.preventDefault(); setError(null); if (!open(paste)) setError("That isn't a Hi Again profile code or link."); }}>
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
