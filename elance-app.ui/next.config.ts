import type { NextConfig } from "next";

// NOTE: Do NOT set turbopack.root here — it overrides webpack's module resolution
// root and causes CSS @import "tailwindcss" to be resolved from the monorepo root
// (acya-app) instead of this project's node_modules (elance-app.ui/node_modules).
const nextConfig: NextConfig = {};

export default nextConfig;
