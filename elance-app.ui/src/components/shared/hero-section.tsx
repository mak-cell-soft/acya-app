'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-[#F5F5F0] via-[#EAF3EE] to-[#F0E8DC] pt-20">
      {/* Background Circles */}
      <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full bg-[radial-gradient(circle,var(--color-forest-600)/0.07_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[5%] w-[200px] h-[200px] md:w-[400px] md:h-[400px] rounded-full bg-[radial-gradient(circle,var(--color-timber-400)/0.08_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-16 md:py-32 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center lg:text-left space-y-6 md:space-y-8"
        >
          <div className="inline-flex items-center gap-2 bg-forest-50 border border-forest-100 rounded-full px-4 py-1.5 text-[0.75rem] md:text-[0.78rem] font-bold tracking-[0.08em] text-forest-600 uppercase">
            <span className="w-2 h-2 rounded-full bg-timber-400 animate-pulse" />
            ERP nouvelle génération
          </div>
          <h1 className="font-heading text-[2.2rem] sm:text-[2.8rem] md:text-[3.4rem] lg:text-[3.8rem] leading-[1.1] text-forest-900 font-bold tracking-tight">
            Gérez toute votre entreprise depuis <em className="italic text-timber-400 not-italic">une seule plateforme</em>
          </h1>
          <p className="text-[1rem] md:text-[1.1rem] leading-relaxed text-sand-400 max-w-[520px] mx-auto lg:mx-0">
            Élancé centralise vos achats, ventes, chantiers, flotte et comptabilité dans un ERP conçu pour les entreprises du secteur du bois et des matériaux.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
            <Button asChild className="h-14 px-8 rounded-xl bg-forest-600 text-white hover:bg-forest-800 hover:scale-[1.02] active:scale-[0.98] text-[1rem] font-bold transition-all duration-300 shadow-xl shadow-forest-600/20">
              <Link href="/register">Demander une démo gratuite</Link>
            </Button>
            <Button asChild variant="outline" className="h-14 px-8 rounded-xl border-forest-100 text-forest-600 hover:border-forest-600 hover:bg-forest-50 text-[1rem] font-bold transition-all duration-300">
              <Link href="#modules">Découvrir les modules →</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="flex flex-col items-center w-full"
        >
          <div className="group relative bg-white rounded-[32px] border border-forest-100 p-8 md:p-12 text-center shadow-[0_20px_80px_rgba(11,59,36,0.08),0_2px_10px_rgba(0,0,0,0.02)] w-full max-w-[540px] transition-transform duration-500 hover:scale-[1.01]">
            <div className="mb-6 overflow-hidden">
              <svg className="w-full h-auto max-w-[260px] mx-auto transition-transform duration-700 group-hover:scale-110" viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="lg1_hero_perfect" x1="0" y1="0" x2="260" y2="200" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#534AB7"/>
                    <stop offset="100%" stopColor="#1D9E75"/>
                  </linearGradient>
                </defs>
                <circle cx="130" cy="72" r="52" stroke="url(#lg1_hero_perfect)" strokeWidth="2.2"/>
                <rect x="124" y="36" width="10" height="48" rx="5" fill="url(#lg1_hero_perfect)"/>
                <polygon points="129,22 109,46 149,46" fill="url(#lg1_hero_perfect)"/>
                <rect x="122" y="88" width="16" height="5" rx="2.5" fill="#1D9E75"/>
                <rect x="115" y="98" width="30" height="5" rx="2.5" fill="#94A3B8"/>
                <text x="130" y="155" textAnchor="middle" fontFamily="Georgia,serif" fontSize="36" fontWeight="700" fill="#3C3489" letterSpacing="5">Élancé</text>
                <rect x="72" y="163" width="44" height="1.5" rx="0.75" fill="#534AB7" opacity="0.3"/>
                <rect x="122" y="163" width="66" height="2" rx="1" fill="url(#lg1_hero_perfect)"/>
                <rect x="194" y="163" width="44" height="1.5" rx="0.75" fill="#1D9E75" opacity="0.3"/>
                <text x="130" y="188" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="9.5" fill="#888780" letterSpacing="3">PROPULSEZ VOTRE ENTREPRISE</text>
              </svg>
            </div>
            <p className="text-[0.7rem] tracking-[0.12em] text-forest-100 font-bold uppercase mt-2 opacity-60">BY ACYA CONSULTING · ACHIEVE YOUR AMBITION</p>
          </div>

          <div className="grid grid-cols-3 bg-forest-100 gap-[1px] rounded-2xl overflow-hidden mt-8 w-full max-w-[540px] border border-forest-100 shadow-lg">
            <div className="bg-white/80 backdrop-blur-md p-5 text-center transition-colors hover:bg-forest-50">
              <div className="font-heading text-[1.8rem] text-forest-800 font-bold">8+</div>
              <div className="text-[0.72rem] text-sand-400 font-bold tracking-wide mt-1 uppercase">Modules</div>
            </div>
            <div className="bg-white/80 backdrop-blur-md p-5 text-center transition-colors hover:bg-forest-50">
              <div className="font-heading text-[1.8rem] text-forest-800 font-bold">100%</div>
              <div className="text-[0.72rem] text-sand-400 font-bold tracking-wide mt-1 uppercase">Secteur bois</div>
            </div>
            <div className="bg-white/80 backdrop-blur-md p-5 text-center transition-colors hover:bg-forest-50">
              <div className="font-heading text-[1.8rem] text-forest-800 font-bold">M³</div>
              <div className="text-[0.72rem] text-sand-400 font-bold tracking-wide mt-1 uppercase">Automatisé</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
