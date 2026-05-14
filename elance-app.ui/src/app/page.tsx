import { HeroSection } from "@/components/shared/hero-section";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { ModulesSection } from "@/components/shared/modules-section";
import { ChantierSection } from "@/components/shared/chantier-section";
import { WhySection } from "@/components/shared/why-section";
import { CTASection } from "@/components/shared/cta-section";
import { PublicFooter } from "@/components/shared/public-footer";

export default function Home() {
  return (
    <main className="flex-1 overflow-x-hidden min-h-screen bg-sand-50 selection:bg-forest-600/20">
      <PublicNavbar />
      <HeroSection />
      <ModulesSection />
      <ChantierSection />
      <WhySection />
      <CTASection />
      <PublicFooter />
    </main>
  );
}
