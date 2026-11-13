// Public profile identifiers are opaque, URL-safe and 12 characters long
// (generated in the database from 9 random bytes, base64url-encoded).
export const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;

export function isValidPublicId(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_ID_PATTERN.test(value);
}

export function profilePath(publicId: string): string {
  return `/p/${publicId}`;
}

export function profileUrl(siteUrl: string, publicId: string): string {
  return new URL(profilePath(publicId), siteUrl.endsWith("/") ? siteUrl : siteUrl + "/").toString();
}

/**
 * Extracts a public ID from a scanned or pasted Hi Again link (any address of the app, e.g. a
 * preview or custom domain), or a bare ID. Only the ID is used: the profile always opens on this
 * site, so a code pointing elsewhere can't send anyone off-site.
 */
export function publicIdFromScan(text: string): string | null {
  const raw = text.trim();
  if (isValidPublicId(raw)) return raw;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const m = /^\/p\/([A-Za-z0-9_-]{12})\/?$/.exec(u.pathname);
  return m ? m[1] : null;
}
