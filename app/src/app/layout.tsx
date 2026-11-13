import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { createClient, getViewer } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Hi Again", template: "%s · Hi Again" },
  description: "Don't just meet. Meet again.",
  manifest: "/manifest.webmanifest",
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
  const viewer = await getViewer();
  let unread = 0;
  if (viewer) {
    const { data } = await (await createClient())!.rpc("unread_activity_count");
    unread = typeof data === "number" ? data : 0;
  }
  return (
    <html lang="en-GB">
      <body>
        <Shell signedIn={Boolean(viewer)} unread={unread}>{children}</Shell>
      </body>
    </html>
  );
}
