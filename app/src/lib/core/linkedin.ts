// Validation and normalisation for an owner-supplied LinkedIn profile link.
// Only personal profile URLs (/in/<slug>) on linkedin.com over HTTPS are accepted.
// The result is an ordinary link; nothing here proves the profile belongs to the owner.

export type LinkedInResult =
  | { ok: true; url: string }
  | { ok: false; reason: "empty" | "not_url" | "not_linkedin" | "not_profile" | "bad_slug" };

const SLUG = /^[A-Za-z0-9\-_%]{3,100}$/;

export function normaliseLinkedInUrl(input: string): LinkedInResult {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "empty" };
  let candidate = raw;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) candidate = "https://" + candidate.replace(/^\/+/, "");
  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return { ok: false, reason: "not_url" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, reason: "not_url" };
  if (u.username || u.password || (u.port && u.port !== "443")) return { ok: false, reason: "not_linkedin" };
  const host = u.hostname.toLowerCase();
  const isLinkedIn = host === "linkedin.com" || host === "www.linkedin.com" || /^[a-z]{2}\.linkedin\.com$/.test(host);
  if (!isLinkedIn) return { ok: false, reason: "not_linkedin" };
  const segments = u.pathname.split("/").filter(Boolean);
  if (segments.length < 2 || segments[0].toLowerCase() !== "in") return { ok: false, reason: "not_profile" };
  const slug = segments[1];
  if (!SLUG.test(slug)) return { ok: false, reason: "bad_slug" };
  // Canonical form: https://www.linkedin.com/in/<slug>  (drops locale subdomain, query, hash, trailing parts)
  return { ok: true, url: `https://www.linkedin.com/in/${slug}` };
}

export function linkedInErrorMessage(reason: Exclude<LinkedInResult, { ok: true }>["reason"]): string {
  switch (reason) {
    case "empty":
      return "Paste your LinkedIn profile link.";
    case "not_url":
    case "not_linkedin":
      return "That doesn't look like a LinkedIn link.";
    case "not_profile":
      return "Use your personal profile link — it contains /in/.";
    case "bad_slug":
      return "That profile link looks incomplete.";
  }
}
