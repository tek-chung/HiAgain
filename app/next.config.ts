import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets the signed-in end-to-end check build separately from the normal build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  experimental: {
    // Bottom-tab pages are prefetched in full and reused for 30 s, so switching tabs is instant.
    // Any change the person makes calls router.refresh(), which clears this cache.
    staleTimes: { dynamic: 0, static: 30 },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
