import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

// ─── Base URL ─────────────────────────────────────────────────────────────────
const SITE_URL = "https://acya.site";

// ─── Root Metadata ────────────────────────────────────────────────────────────
// All public pages inherit from this and may override specific fields.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Élancé | ERP Nouvelle Génération — Produits, Services, Chantiers & Production",
    template: "%s | Élancé by ACYA",
  },
  description:
    "Solution ERP SaaS tout-en-un pour le négoce bois, la gestion des produits et services, la production d'atelier et les chantiers en Tunisie. Connectez achats, stocks, prestations, ventes et comptabilité avec Élancé.",
  keywords: [
    "ERP",
    "ERP Tunisie",
    "Gestion des articles",
    "Produits et services",
    "Articles de service",
    "Facturation des services",
    "Facturation produits et services",
    "Facture mixte",
    "Gestion des ventes",
    "Gestion de stock",
    "logiciel ERP bois",
    "gestion de chantier",
    "logiciel chantier BTP",
    "logiciel gestion chantier",
    "suivi de chantier",
    "ERP BTP",
    "logiciel négoce bois",
    "Gestion de production",
    "Logiciel de gestion de production",
    "Production industrielle",
    "Suivi de production",
    "Gestion des matières premières",
    "Ordre de fabrication",
    "ERP production Tunisie",
    "Logiciel ERP Tunisie",
    "gestion achats ventes",
    "logiciel entreprise Tunisie",
    "Bois",
    "Construction",
    "Chantiers BTP",
    "Élancé",
    "ACYA",
    "Software as a Service",
    "SaaS ERP",
    "chantiers Tunisie",
    "bois matériaux construction",
  ],
  authors: [{ name: "ACYA Consulting", url: SITE_URL }],
  creator: "ACYA Consulting",
  publisher: "ACYA Consulting",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    siteName: "Élancé by ACYA",
    title: "Élancé — ERP SaaS pour le bois, les chantiers et la production",
    description:
      "Gérez vos achats, ventes, stock, chantiers BTP, production et facturation depuis un seul ERP SaaS. Conçu pour le secteur bois et construction en Tunisie.",
    url: SITE_URL,
    locale: "fr_TN",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Élancé — ERP SaaS pour le bois, les chantiers et la production en Tunisie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Élancé — ERP SaaS pour le bois, les chantiers et la production",
    description:
      "Gérez vos achats, ventes, stock, chantiers BTP, production et facturation depuis un seul ERP SaaS. Conçu pour le secteur bois et construction en Tunisie.",
    images: ["/og-image.png"],
    creator: "@acya_consulting",
    site: "@acya_consulting",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

// ─── JSON-LD Structured Data ──────────────────────────────────────────────────
// Organization + WebSite + SoftwareApplication schemas for rich results
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "ACYA Consulting",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.svg`,
        width: 40,
        height: 40,
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+216-99-218-866",
        contactType: "customer support",
        email: "acya.consulting@gmail.com",
        areaServed: "TN",
        availableLanguage: ["French", "Arabic"],
      },
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Élancé by ACYA",
      description:
        "ERP SaaS spécialisé pour les entreprises du bois, de la construction et du négoce en Tunisie.",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "fr-TN",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Élancé",
      alternateName: "Élancé by ACYA",
      url: SITE_URL,
      description:
        "ERP SaaS tout-en-un pour les professionnels du bois, de la construction et du négoce en Tunisie. Gestion des chantiers BTP, stock multi-dépôts, achats, ventes, production d'atelier et facturation connectée à Qwerty.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "450",
        priceCurrency: "TND",
        priceValidUntil: "2027-12-31",
        description: "Accès annuel illimité à tous les modules Élancé",
      },
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "fr-TN",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${dmSans.variable} font-sans antialiased selection:bg-corp-blue-600/20`}
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col bg-background text-foreground">
            {children}
          </div>
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
