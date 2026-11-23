"use client";
import { useEffect, useState } from "react";
import { logFunnel } from "@/lib/funnel";

export const QR_CACHE_KEY = "hiagain:my-qr";

/** Removes the offline copy of the QR (on sign-out and account deletion). */
export function clearCachedQr(): void {
  try { localStorage.removeItem(QR_CACHE_KEY); } catch { /* storage unavailable */ }
}

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/**
 * Keeps a copy of the person's QR on this device so it shows even with no signal (the offline page
 * reads it), and offers home-screen installation so the QR is one tap away at an event.
 * The QR only encodes the public profile address, which is already public.
 */
export function QuickQr({ url, svg, name }: { url: string; svg: string; name: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try { localStorage.setItem(QR_CACHE_KEY, JSON.stringify({ url, svg, name, savedAt: new Date().toISOString() })); } catch { /* ignore */ }
  }, [url, svg, name]);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try { setDismissed(localStorage.getItem("hiagain:install-dismissed") === "1"); } catch { setDismissed(false); }
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvent(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || (!installEvent && !ios)) return null;
  const dismiss = () => { setDismissed(true); try { localStorage.setItem("hiagain:install-dismissed", "1"); } catch { /* ignore */ } };

  return (
    <div className="banner info small row spread" data-testid="install-hint">
      {installEvent ? (
        <>
          <span>Add Hi Again to your home screen: your QR opens in one tap, even without signal.</span>
          <button className="btn small" onClick={async () => { logFunnel("install_click"); await installEvent.prompt(); setInstallEvent(null); dismiss(); }}>Add</button>
        </>
      ) : (
        <>
          <span>For one-tap access to your QR, even without signal: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</span>
          <button className="btn small plain" onClick={dismiss} aria-label="Dismiss">✕</button>
        </>
      )}
    </div>
  );
}
