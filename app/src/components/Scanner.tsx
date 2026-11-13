"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { profilePathFromScan } from "@/lib/core/public-id";

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
  const debug = useSearchParams().get("debug") === "1";
  const [diag, setDiag] = useState<string>("");

  const open = (text: string) => {
    const path = profilePathFromScan(text, window.location.host);
    if (!path) return false;
    router.push(path);
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
        // Ask for HD: small codes on another phone's screen need the pixels.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
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
      // Continuous autofocus where the camera supports it (mostly Android).
      try {
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as { focusMode?: string[] };
        if (caps.focusMode?.includes("continuous")) await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] });
      } catch { /* not supported */ }

      let detector: Detector | null = null;
      try {
        const formats = (await window.BarcodeDetector?.getSupportedFormats?.()) ?? [];
        if (window.BarcodeDetector && formats.includes("qr_code")) detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      } catch { detector = null; }
      // jsQR backs up the native detector too (some native detectors miss on-screen codes).
      const jsQR = (await import("jsqr")).default;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      let lastHint = 0;
      let frame = 0;
      let lastRead = "";

      // Scan exactly what the square viewfinder shows (the centred square of the camera frame),
      // alternating a detailed pass for small, distant codes with a lighter pass for large, close ones.
      const decodeVisibleSquare = (detailed: boolean): string | null => {
        if (!ctx) return null;
        const w = v.videoWidth, h = v.videoHeight;
        const side = Math.min(w, h);
        const sx = Math.round((w - side) / 2), sy = Math.round((h - side) / 2);
        const out = Math.min(side, detailed ? 1080 : 600);
        canvas.width = canvas.height = out;
        ctx.drawImage(v, sx, sy, side, side, 0, 0, out, out);
        const img = ctx.getImageData(0, 0, out, out);
        return jsQR(img.data, out, out, { inversionAttempts: "attemptBoth" })?.data ?? null;
      };

      const tick = async () => {
        if (stopped) return;
        if (v.readyState >= 2 && v.videoWidth) {
          frame++;
          let found: string | null = null;
          try {
            if (detector) found = (await detector.detect(v))[0]?.rawValue ?? null;
            if (!found) found = decodeVisibleSquare(frame % 2 === 1);
          } catch { /* frame not ready */ }
          if (found) {
            lastRead = found.slice(0, 80);
            if (open(found)) { stop(); return; }
            if (Date.now() - lastHint > 3000) { setHint("That QR code isn't a Hi Again profile."); lastHint = Date.now(); }
          }
          if (debug && frame % 5 === 0) {
            setDiag(`${detector ? "native" : "jsQR"} · ${v.videoWidth}×${v.videoHeight} · frames ${frame}${lastRead ? ` · read: ${lastRead}` : ""}`);
          }
        }
        timer = window.setTimeout(tick, 120);
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
      </div>
      {mode === "starting" && <p className="muted small" role="status">Starting camera…</p>}
      {mode === "scanning" && <p className="muted small" role="status">{hint ?? "Point your camera at a Hi Again QR code — anywhere in the square."}</p>}
      {debug && <p className="small" style={{ fontFamily: "monospace" }} data-testid="scan-debug">{diag || "starting…"}</p>}
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
