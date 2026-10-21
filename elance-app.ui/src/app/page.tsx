import type { Metadata } from "next";
import { HeroSection } from "@/components/shared/hero-section";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { ModulesSection } from "@/components/shared/modules-section";
import { ProductionSection } from "@/components/shared/production-section";
import { ChantierSection } from "@/components/shared/chantier-section";
import { QwertyIntegrationSection } from "@/components/shared/qwerty-integration-section";
import { WhySection } from "@/components/shared/why-section";
import { MobileAppSection } from "@/components/shared/mobile-app-section";
import { PricingSection } from "@/components/shared/pricing-section";
import { FAQSection } from "@/components/shared/faq-section";
import { CTASection } from "@/components/shared/cta-section";
import { PublicFooter } from "@/components/shared/public-footer";

export const metadata: Metadata = {
  title: "Élancé ERP Tunisie | Gestion BTP, Production & Chantiers",
  description:
    "Gérez votre entreprise avec Élancé ERP en Tunisie : achats, stocks, BTP, suivi de chantier et production industrielle. Découvrez nos modules et nos offres.",
  alternates: {
    canonical: "https://acya.site",
  },
  openGraph: {
    title: "Élancé ERP Tunisie | Gestion BTP, Production & Chantiers",
    description:
      "Gérez votre entreprise avec Élancé ERP en Tunisie : achats, stocks, BTP, suivi de chantier et production industrielle. Découvrez nos modules et nos offres.",
    url: "https://acya.site",
    siteName: "Élancé by ACYA",
    locale: "fr_TN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Élancé ERP Tunisie — Solution BTP, Production & Chantiers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Élancé ERP Tunisie | Gestion BTP, Production & Chantiers",
    description:
      "Gérez votre entreprise avec Élancé ERP en Tunisie : achats, stocks, BTP, suivi de chantier et production industrielle.",
    images: ["/og-image.png"],
  },
};

export default function Home() {
  return (
    <main className="flex-1 overflow-x-hidden min-h-screen bg-background selection:bg-corp-blue-500/20">
      <PublicNavbar />
      <HeroSection />
      <ModulesSection />
      <ProductionSection />
      <ChantierSection />
      <QwertyIntegrationSection />
      <WhySection />
      <MobileAppSection />
      <PricingSection />
      {/* TODO: Re-enable once real client testimonials/approvals are collected */}
      {/* <TestimonialSection /> */}
      <FAQSection />
      <CTASection />
      <PublicFooter />
    </main>
  );
}
