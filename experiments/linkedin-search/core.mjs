export function profileUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 600) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.port) return null;
    if (!/^(?:www\.|[a-z]{2,3}\.)?linkedin\.com$/i.test(u.hostname)) return null;
    const match = u.pathname.match(/^\/in\/([^/]+)\/?$/);
    if (!match || !/^[\p{L}\p{N}_%.-]+$/u.test(match[1]) || /%(?![0-9a-f]{2})/i.test(match[1])) return null;
    const handle = decodeURIComponent(match[1]);
    if (!/^[\p{L}\p{N}_.-]+$/u.test(handle) || /^\.+$/.test(handle)) return null;
    // Keep the indexed host; discard tracking, query strings and fragments.
    return `https://${u.hostname.toLowerCase()}/in/${match[1]}`;
  } catch { return null; }
}

export function cleanText(value, max = 240) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normaliseName(value) {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function searchQuery(name, context = '') {
  // Never interpolate a name into a guessed URL. Strip search syntax from input.
  const safe = value => cleanText(value, 100).replace(/["\\:()<>]/g, ' ');
  return `site:linkedin.com/in/ "${safe(name)}" ${safe(context)}`.trim();
}

export function candidatesFromResults(results, name) {
  const tokens = normaliseName(name).match(/[\p{L}\p{N}]+/gu) || [];
  if (!tokens.length) return [];
  const seen = new Set();
  const candidates = [];
  for (const result of results || []) {
    const url = profileUrl(result.url);
    if (!url) continue;
    const identity = new URL(url).pathname.toLowerCase();
    if (seen.has(identity)) continue;
    const title = cleanText(result.title, 160).replace(/\s*[|–-]\s*LinkedIn\s*$/i, '');
    // Name must appear in the result title, not merely in a post or snippet.
    const words = normaliseName(title).match(/[\p{L}\p{N}]+/gu) || [];
    if (!tokens.every(token => (token.match(/[\p{L}\p{N}]+/gu) || []).every(word => words.includes(word)))) continue;
    seen.add(identity);
    candidates.push({ title, url, description: cleanText(result.description, 220) });
    if (candidates.length === 5) break;
  }
  return candidates;
}
