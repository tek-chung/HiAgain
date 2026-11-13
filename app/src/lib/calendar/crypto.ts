import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM for provider refresh tokens. The key lives only in the server environment
// (CALENDAR_TOKEN_KEY, 32 bytes base64), so a database leak alone doesn't expose calendar access.
// Format: v1.<iv>.<tag>.<ciphertext>, each base64url.

function key(): Buffer {
  const raw = process.env.CALENDAR_TOKEN_KEY ?? "";
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("CALENDAR_TOKEN_KEY must be 32 bytes, base64-encoded");
  return k;
}

export function encryptSecret(plain: string, userId: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  c.setAAD(Buffer.from(userId)); // binds the ciphertext to its account
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptSecret(token: string, userId: string): string {
  const [v, iv, tag, ct] = token.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unrecognised secret format");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAAD(Buffer.from(userId));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}
