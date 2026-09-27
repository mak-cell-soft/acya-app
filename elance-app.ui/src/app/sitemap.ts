import type { MetadataRoute } from 'next';

/**
 * Next.js App Router sitemap.ts
 * Generates /sitemap.xml at build time.
 *
 * Only includes canonical public pages that should be indexed by Google.
 * Private/authenticated application routes are intentionally excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = 'https://acya.site';
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/solutions/gestion-chantier`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.95,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/enterprise-registration`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/mentions-legales`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
