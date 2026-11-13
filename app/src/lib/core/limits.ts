// Text limits from the prototype (reference §11, v1.42): prompts 180, answers/requests 1,500.
export const LIMITS = {
  prompt: 180,
  contribution: 1500,
  note: 2000,
  displayName: 80,
  headline: 120,
} as const;

export function countChars(text: string): number {
  // Count user-perceived characters approximately by code points (not UTF-16 units).
  return Array.from(text).length;
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}
