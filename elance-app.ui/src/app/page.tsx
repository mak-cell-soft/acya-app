import { HeroSection } from "@/components/shared/hero-section";
import { PublicNavbar } from "@/components/shared/public-navbar";

export default function Home() {
  return (
    <main className="flex-1 overflow-x-hidden min-h-screen bg-background selection:bg-primary/30">
      <PublicNavbar />
      <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-black dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />
      <HeroSection />
    </main>
  );
}
