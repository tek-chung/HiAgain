import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { createClient, getViewerId } from "@/lib/supabase/server";
import { configuredSiteUrl } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: "Hi Again", template: "%s · Hi Again" },
  description: "Don't just meet. Meet again.",
  manifest: "/manifest.webmanifest",
  // Lets link previews (WhatsApp, LinkedIn, iMessage) find the absolute image address.
  metadataBase: new URL(configuredSiteUrl() ?? "https://hiagain.link"),
  openGraph: { siteName: "Hi Again", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#1b201d" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewerId = await getViewerId();
  let unread = 0;
  if (viewerId) {
    const { data } = await (await createClient())!.rpc("unread_activity_count");
    unread = typeof data === "number" ? data : 0;
  }
  return (
    <html lang="en-GB">
      <body>
        <Shell signedIn={Boolean(viewerId)} unread={unread}>{children}</Shell>
      </body>
    </html>
  );
}
