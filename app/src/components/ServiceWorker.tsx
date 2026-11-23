"use client";
import { useEffect } from "react";

/** Registers the small service worker that shows the saved QR when there's no connection. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { /* optional enhancement */ });
  }, []);
  return null;
}
