import type { NextConfig } from "next";

// NOTE: Do NOT set turbopack.root here — it overrides webpack's module resolution
// root and causes CSS @import "tailwindcss" to be resolved from the monorepo root
// (acya-app) instead of this project's node_modules (elance-app.ui/node_modules).
const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
