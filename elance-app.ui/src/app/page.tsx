import { HeroSection } from "@/components/shared/hero-section";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { ModulesSection } from "@/components/shared/modules-section";
import { ChantierSection } from "@/components/shared/chantier-section";
import { WhySection } from "@/components/shared/why-section";
import { TestimonialSection } from "@/components/shared/testimonial-section";
import { FAQSection } from "@/components/shared/faq-section";
import { CTASection } from "@/components/shared/cta-section";
import { PublicFooter } from "@/components/shared/public-footer";

export default function Home() {
  return (
    <main className="flex-1 overflow-x-hidden min-h-screen bg-background selection:bg-corp-blue-500/20">
      <PublicNavbar />
      <HeroSection />
      <ModulesSection />
      <ChantierSection />
      <WhySection />
      <TestimonialSection />
      <FAQSection />
      <CTASection />
      <PublicFooter />
    </main>
  );
}

