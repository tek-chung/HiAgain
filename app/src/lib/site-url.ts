import "server-only";
import { headers } from "next/headers";
import { configuredSiteUrl } from "@/lib/config";

/** Base URL for QR codes: NEXT_PUBLIC_SITE_URL, otherwise the current request's origin. */
export async function siteUrl(): Promise<string> {
  const configured = configuredSiteUrl();
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
