import type { Metadata } from "next";

/**
 * Private SaaS application route — do NOT index.
 * robots.ts also blocks this path at the crawler level.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

