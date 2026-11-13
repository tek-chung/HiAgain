// Public profile identifiers are opaque, URL-safe and 12 characters long
// (generated in the database from 9 random bytes, base64url-encoded).
export const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;

export function isValidPublicId(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_ID_PATTERN.test(value);
}

export function profilePath(publicId: string): string {
  return `/p/${publicId}`;
}


// Name-based handles: lowercase letters and digits in hyphen-separated words, e.g. "tek-chung-2".
export const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// App pages that are never handles (kept in step with is_reserved_handle() in the database).
const APP_PATHS = new Set(["me", "people", "activity", "scan", "sign-in", "auth", "api", "calendar", "p", "in"]);

export function isValidHandle(value: unknown): value is string {
  return typeof value === "string" && value.length <= 60 && HANDLE_PATTERN.test(value) && !APP_PATHS.has(value);
}

/** A profile's shareable address: hiagain.link/<handle>, or the ID form for profiles without one. */
export function shareUrl(siteUrl: string, profile: { handle: string | null; publicId: string }): string {
  const base = siteUrl.endsWith("/") ? siteUrl : siteUrl + "/";
  return new URL(profile.handle ? profile.handle : profilePath(profile.publicId).slice(1), base).toString();
}

/**
 * Turns a scanned or pasted Hi Again link into the in-app path to open: /<handle> or /p/<id>.
 * Any address of the app is accepted (custom domain, Vercel, previews), but only the path is used,
 * so the profile always opens on this site and a code can't send anyone elsewhere.
 */
// Addresses that serve Hi Again, for name-based links (a bare /<word> is too common to trust elsewhere).
function isHiAgainHost(host: string, currentHost?: string): boolean {
  const h = host.toLowerCase();
  return h === currentHost?.toLowerCase() || h === "hiagain.link" || h === "www.hiagain.link" ||
    (h.startsWith("hi-again") && h.endsWith(".vercel.app")) || h === "localhost" || h.startsWith("localhost:");
}

export function profilePathFromScan(text: string, currentHost?: string): string | null {
  const raw = text.trim();
  if (isValidPublicId(raw)) return profilePath(raw);
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const byId = /^\/p\/([A-Za-z0-9_-]{12})\/?$/.exec(u.pathname);
  if (byId) return profilePath(byId[1]);
  const byHandle = /^\/([a-z0-9-]{1,60})\/?$/.exec(u.pathname.toLowerCase());
  if (byHandle && isValidHandle(byHandle[1]) && isHiAgainHost(u.host, currentHost)) return `/${byHandle[1]}`;
  return null;
}
