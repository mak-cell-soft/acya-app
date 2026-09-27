import type { Metadata } from "next";

/**
 * Layout for the authenticated SaaS application area.
 * All pages under /dashboard, /chantiers, /articles, etc. are private.
 * Setting noindex here via Next.js metadata prevents search engine indexing.
 *
 * Note: robots.ts also disallows these paths at the crawler level.
 * Both layers work together for defense in depth.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
