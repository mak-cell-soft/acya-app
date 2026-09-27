import type { MetadataRoute } from 'next';

/**
 * Next.js App Router robots.ts
 * Generates /robots.txt at build time.
 *
 * Strategy:
 *  - Allow all public marketing / informational pages
 *  - Block all authenticated SaaS application routes
 *  - Block internal API routes and Next.js internals
 *  - Reference the sitemap for crawler discovery
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://acya.site';

  return {
    rules: [
      {
        // Public crawlers: allow public pages, disallow authenticated app
        userAgent: '*',
        allow: [
          '/',
          '/contact',
          '/privacy',
          '/mentions-legales',
          '/solutions/',
          '/enterprise-registration',
        ],
        disallow: [
          // Authenticated SaaS application routes
          '/dashboard',
          '/chantiers',
          '/articles',
          '/customers',
          '/suppliers',
          '/purchases',
          '/sales',
          '/stock',
          '/inventory',
          '/production',
          '/analytics',
          '/accounting',
          '/settings',
          '/team',
          '/vehicles',
          '/login',
          '/forgot-password',
          '/suspended',
          '/tenant-not-found',

          // Next.js internals & API
          '/api/',
          '/_next/',
          '/api/print-locale',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
