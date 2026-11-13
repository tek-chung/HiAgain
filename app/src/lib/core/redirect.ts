// Validates a post-sign-in destination so the OAuth callback can never become an open redirect.
// Only same-origin relative paths are allowed.

const FALLBACK = "/me";

export function safeNextPath(next: string | null | undefined, fallback = FALLBACK): string {
  if (!next || typeof next !== "string") return fallback;
  if (next.length > 512) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  try {
    const u = new URL(next, "https://hiagain.invalid");
    if (u.origin !== "https://hiagain.invalid") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}

/** Adds a query parameter to a validated relative path. */
export function withParam(path: string, key: string, value: string): string {
  const u = new URL(path, "https://hiagain.invalid");
  u.searchParams.set(key, value);
  return u.pathname + u.search + u.hash;
}
