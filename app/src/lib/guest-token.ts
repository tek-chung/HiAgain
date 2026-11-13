"use client";
// A random per-browser token for anonymous guest visits. Only a hash of (token + profile ID) ever
// leaves the browser, so the same guest can't be linked across different profile owners.

const KEY = "hiagain:guestToken";

function token(): string | null {
  try {
    let t = localStorage.getItem(KEY);
    if (!t) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      t = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(KEY, t);
    }
    return t;
  } catch {
    return null; // storage blocked: the visit simply isn't recorded
  }
}

export async function guestHashFor(publicId: string): Promise<string | null> {
  const t = token();
  if (!t || !crypto.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${t}:${publicId}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
