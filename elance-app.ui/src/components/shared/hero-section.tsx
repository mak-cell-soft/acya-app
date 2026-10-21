'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Truck,
  FileText,
  Shield,
  Globe,
  Factory,
  Building2,
  HardHat
} from 'lucide-react';

// ─── Animated bar chart ───────────────────────────────────────────────────────
// Tabular layout with Cerulean Blue gradient bars and Neon Rose peak accents
function BarChart({ data }: { data: number[] }) {
  return (
    <div className="flex items-end gap-1 h-14 pt-2">
      {data.map((h, i) => {
        const isPeak = i === data.length - 1;
        return (
          <motion.div
            key={i}
            className={`flex-1 rounded-sm transition-opacity ${
              isPeak
                ? 'bg-gradient-to-t from-[#007BA7] via-[#0096CC] to-[#FF2E88]'
                : 'bg-gradient-to-t from-[#007BA7]/80 to-[#0096CC]'
            } opacity-90 hover:opacity-100`}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: 0.2 + i * 0.03, duration: 0.45, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

// ─── KPI stat card ────────────────────────────────────────────────────────────
// Concentric border radius, subtle hover feedback, tabular numbers
function StatCard({
  label,
  value,
  change,
  color,
  delay
}: {
  label: string;
  value: string;
  change: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-[#131316]/90 border border-[#A1A1AA]/20 hover:border-[#A1A1AA]/35 rounded-xl p-3 text-left transition-colors shadow-sm"
    >
      <div className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-[#F5F7FA] font-bold text-[1.12rem] leading-none tabular-nums tracking-tight">
        {value}
      </div>
      <div className={`text-[10px] font-bold mt-1.5 ${color}`}>{change}</div>
    </motion.div>
  );
}

// ─── Activity row ─────────────────────────────────────────────────────────────
// Crisp typography and high-contrast badge pills
function ActivityItem({
  icon: Icon,
  text,
  badge,
  badgeColor,
  delay
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  badge: string;
  badgeColor: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center gap-2.5 py-1.5 border-b border-white/5 last:border-0"
    >
      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-[#A1A1AA]" />
      </div>
      <p className="text-[11px] font-medium text-[#F5F7FA] flex-1 truncate">{text}</p>
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${badgeColor}`}>{badge}</span>
    </motion.div>
  );
}

// ─── Main Hero ────────────────────────────────────────────────────────────────
export function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen w-full overflow-hidden text-[#F5F7FA] bg-[#0A0A0B]">
      {/* ── RéVA Subtle Hero Background Visual ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <Image
          src="/logo-reva.jpeg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_35%] lg:object-[65%_35%] opacity-20 select-none"
        />
        {/* Jet Black gradient overlay ensuring high contrast & brand cohesion */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B] via-[#0A0A0B]/85 to-[#0A0A0B]/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0B]/75 via-transparent to-[#0A0A0B]" />
      </div>

      {/* Subtle micro-grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(245,247,250,0.8) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Controlled ambient lighting: Cerulean Blue (#007BA7) & Neon Rose (#FF2E88) */}
      <div
        className="absolute top-0 left-1/3 -translate-x-1/2 w-[720px] h-[320px] rounded-full blur-[140px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(0,123,167,0.18) 0%, rgba(255,46,136,0.06) 60%, transparent 80%)' }}
      />
      <div
        className="absolute top-1/2 right-10 w-[500px] h-[380px] rounded-full blur-[150px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(0,123,167,0.14) 0%, transparent 75%)' }}
      />

      {/* Bottom fade transition to page content */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to top, #0A0A0B, transparent)' }}
      />

      {/* ── Main content grid ── */}
      <div className="relative z-20 flex min-h-screen items-center px-4 sm:px-6 lg:px-12 xl:px-16 pt-32 lg:pt-36 pb-28">
        <div className="mx-auto w-full max-w-[1260px] grid lg:grid-cols-12 gap-10 xl:gap-14 items-center">

          {/* LEFT: Copy, 3 Business Pillars & CTAs (7 cols on Desktop) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : -20 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="lg:col-span-7 space-y-6 text-left"
          >
            <div className="flex flex-col items-start gap-3.5">
              {/* Mobile / Tablet attribution: compact and neatly integrated */}
              <div className="lg:hidden flex items-center gap-2 px-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A1A1AA]">
                  Développé par
                </span>
                <a
                  href="https://reva-consulte.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="RÉVA Consulting (ouvre un nouvel onglet)"
                  title="Visiter le site de RÉVA Consulting"
                  className="inline-flex items-center rounded-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007BA7]"
                >
                  <Image
                    src="/logo-reva-navbar.png"
                    alt="RÉVA Consulting"
                    width={2103}
                    height={748}
                    priority
                    className="h-6 w-auto object-contain"
                  />
                </a>
              </div>

              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0A0A0B]/90 border border-[#007BA7]/40 text-[#F5F7FA] text-xs font-semibold backdrop-blur-md shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-[#FF2E88] animate-pulse" />
                <span className="tracking-wider uppercase text-[10.5px] font-bold text-[#F5F7FA]">
                  ERP POUR LES ENTREPRISES TUNISIENNES
                </span>
              </div>
            </div>

            {/* Primary H1 */}
            <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] xl:text-[3rem] font-black tracking-[-0.03em] leading-[1.12] text-[#F5F7FA] [text-wrap:balance]">
              BTP, production, chantiers : pilotez toute votre activité avec{' '}
              <span className="bg-gradient-to-r from-[#007BA7] via-[#0096CC] to-[#FF2E88] bg-clip-text text-transparent">
                Élancé
              </span>
              .
            </h1>

            {/* Supporting paragraph */}
            <p className="text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl font-normal text-[#A1A1AA] [text-wrap:pretty]">
              Centralisez vos achats, vos stocks, vos opérations de fabrication et le suivi de vos chantiers dans un ERP conçu pour les réalités des entreprises tunisiennes.
            </p>

            {/* ── Three Business Pillars (Interactive Cards) ── */}
            <div className="pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* CARD A — BTP & Construction */}
                <Link
                  href="#modules"
                  className="group/card relative flex flex-col justify-between p-3.5 rounded-2xl bg-[#131316]/75 border border-[#007BA7]/35 hover:border-[#007BA7] hover:bg-[#131316]/95 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007BA7] motion-reduce:transform-none shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#007BA7]/15 border border-[#007BA7]/30 flex items-center justify-center text-[#007BA7] group-hover/card:scale-105 transition-transform">
                        <Building2 className="w-4 h-4 text-[#007BA7]" />
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#A1A1AA] group-hover/card:text-[#007BA7] transition-colors" />
                    </div>
                    <div className="text-xs sm:text-[13px] font-bold text-[#F5F7FA] group-hover/card:text-[#007BA7] transition-colors leading-tight">
                      BTP & Construction
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-snug mt-1.5 [text-wrap:pretty]">
                      Gérez vos matériaux, vos stocks et les ressources de votre activité.
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-semibold text-[#007BA7] flex items-center gap-1">
                    <span>Voir le catalogue & stock</span>
                  </div>
                </Link>

                {/* CARD B — Production industrielle */}
                <Link
                  href="#production"
                  className="group/card relative flex flex-col justify-between p-3.5 rounded-2xl bg-[#131316]/75 border border-[#FF2E88]/35 hover:border-[#FF2E88] hover:bg-[#131316]/95 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E88] motion-reduce:transform-none shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#FF2E88]/15 border border-[#FF2E88]/30 flex items-center justify-center text-[#FF2E88] group-hover/card:scale-105 transition-transform">
                        <Factory className="w-4 h-4 text-[#FF2E88]" />
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#A1A1AA] group-hover/card:text-[#FF2E88] transition-colors" />
                    </div>
                    <div className="text-xs sm:text-[13px] font-bold text-[#F5F7FA] group-hover/card:text-[#FF2E88] transition-colors leading-tight">
                      Production industrielle
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-snug mt-1.5 [text-wrap:pretty]">
                      Suivez vos ordres de fabrication, les matières consommées et les coûts de production.
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-semibold text-[#FF2E88] flex items-center gap-1">
                    <span>Explorer l'atelier & OF</span>
                  </div>
                </Link>

                {/* CARD C — Gestion de chantier */}
                <Link
                  href="/solutions/gestion-chantier"
                  className="group/card relative flex flex-col justify-between p-3.5 rounded-2xl bg-[#131316]/75 border border-[#007BA7]/35 hover:border-[#007BA7] hover:bg-[#131316]/95 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007BA7] motion-reduce:transform-none shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#007BA7]/15 border border-[#007BA7]/30 flex items-center justify-center text-[#007BA7] group-hover/card:scale-105 transition-transform">
                        <HardHat className="w-4 h-4 text-[#007BA7]" />
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-[#FF2E88] bg-[#FF2E88]/10 border border-[#FF2E88]/20">
                        Solution
                      </span>
                    </div>
                    <div className="text-xs sm:text-[13px] font-bold text-[#F5F7FA] group-hover/card:text-[#007BA7] transition-colors leading-tight">
                      Gestion de chantier
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-snug mt-1.5 [text-wrap:pretty]">
                      Suivez vos équipes, vos matériaux, vos dépenses et l'avancement de vos chantiers.
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-semibold text-[#007BA7] flex items-center gap-1">
                    <span>Découvrir la solution</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Calls to Action */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/enterprise-registration"
                className="group inline-flex h-12 sm:h-13 items-center justify-center gap-2.5 rounded-xl px-7 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-[#007BA7] via-[#0086B6] to-[#007BA7] hover:from-[#006E96] hover:to-[#005B7C] border border-[#007BA7]/60 shadow-[0_8px_20px_-4px_rgba(0,123,167,0.5),0_0_0_1px_rgba(255,255,255,0.15)_inset] transition-all duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E88]"
              >
                <span>Démarrer mon essai gratuit</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="#tarifs"
                className="inline-flex h-12 sm:h-13 items-center justify-center gap-2 rounded-xl border border-[#A1A1AA]/30 hover:border-[#A1A1AA]/60 px-6 text-sm sm:text-base font-semibold text-[#F5F7FA] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md transition-all duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007BA7]"
              >
                Découvrir les modules et tarifs
              </Link>
            </div>

            {/* Key Statistics */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 pt-5 border-t border-[#A1A1AA]/15">
              {[
                { val: '500+', label: 'Entreprises actives' },
                { val: '99.9%', label: 'Disponibilité SLA' },
                { val: '< 2s', label: 'Temps de réponse' },
              ].map(({ val, label }) => (
                <div key={label} className="flex flex-col">
                  <div className="text-xl sm:text-2xl font-black tracking-tight text-[#F5F7FA] tabular-nums">
                    {val}
                  </div>
                  <div className="text-[11px] sm:text-xs font-medium text-[#A1A1AA] mt-0.5">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: RÉVA Branding & Product Showcase Mockup (5 cols on Desktop) */}
          <div className="hidden lg:flex flex-col gap-4 w-full lg:col-span-5">
            {/* RÉVA branding block */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : -10 }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              className="flex items-center justify-end pr-1"
            >
              <div className="flex flex-col items-end gap-1.5 group/reva">
                <span className="text-[10px] xl:text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A1A1AA] transition-colors group-hover/reva:text-[#F5F7FA]">
                  Développé par
                </span>
                <a
                  href="https://reva-consulte.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="RÉVA Consulting (ouvre un nouvel onglet)"
                  title="Visiter le site de RÉVA Consulting"
                  className="px-3.5 py-1.5 rounded-xl bg-[#131316]/80 border border-[#A1A1AA]/20 backdrop-blur-md shadow-sm hover:border-[#007BA7]/50 transition-all duration-300 inline-block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007BA7]"
                >
                  <Image
                    src="/logo-reva-navbar.png"
                    alt="RÉVA Consulting"
                    width={2103}
                    height={748}
                    priority
                    className="h-9 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover/reva:scale-[1.02]"
                  />
                </a>
              </div>
            </motion.div>

            {/* Product Showcase Mockup Frame */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
              transition={{ duration: 0.75, delay: 0.15, ease: 'easeOut' }}
              className="relative group"
            >
              {/* Ambient backlight glow */}
              <div
                className="absolute -inset-4 rounded-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-700 blur-[50px] pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, rgba(0,123,167,0.25) 0%, rgba(255,46,136,0.1) 60%, transparent 80%)'
                }}
              />

              {/* Browser card window */}
              <div className="relative rounded-2xl overflow-hidden bg-[#0A0A0B]/95 border border-[#A1A1AA]/20 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),0_0_30px_-10px_rgba(0,123,167,0.25)] backdrop-blur-xl transition-all duration-500 ring-1 ring-white/5">
                {/* Browser window header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-[#0A0A0B] border-b border-[#A1A1AA]/15">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>

                  {/* Address bar */}
                  <div className="flex-1 mx-3 rounded-full px-3.5 py-1 flex items-center gap-2 bg-[#131316] border border-[#A1A1AA]/15 shadow-inner">
                    <Shield className="w-3 h-3 shrink-0 text-emerald-400" />
                    <span className="text-[10px] font-mono font-medium text-[#A1A1AA]">app.elance.acya.site</span>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-1.5 text-[8.5px] font-extrabold rounded-full px-2 py-0.5 uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </div>
                </div>

                {/* App UI interior */}
                <div className="flex h-[450px]">
                  {/* Sidebar */}
                  <div className="w-[165px] p-3 flex flex-col gap-1 shrink-0 bg-[#0A0A0B] border-r border-[#A1A1AA]/15">
                    {/* Sidebar Brand Lockup */}
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <svg className="w-5 h-5 shrink-0 drop-shadow-[0_1px_4px_rgba(0,123,167,0.6)]" viewBox="0 0 40 40" fill="none">
                        <defs>
                          <linearGradient id="sb_g1" x1="0" y1="0" x2="40" y2="40">
                            <stop offset="0%" stopColor="#93C5FD" />
                            <stop offset="100%" stopColor="#007BA7" />
                          </linearGradient>
                          <linearGradient id="sb_g2" x1="0" y1="0" x2="40" y2="40">
                            <stop offset="0%" stopColor="#007BA7" />
                            <stop offset="100%" stopColor="#005B7C" />
                          </linearGradient>
                          <linearGradient id="sb_g3" x1="0" y1="0" x2="40" y2="40">
                            <stop offset="0%" stopColor="#005B7C" />
                            <stop offset="100%" stopColor="#0A0A0B" />
                          </linearGradient>
                        </defs>
                        <path d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z" fill="url(#sb_g1)" />
                        <path d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z" fill="url(#sb_g2)" />
                        <path d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z" fill="url(#sb_g3)" />
                      </svg>
                      <span className="text-[#F5F7FA] text-xs font-bold tracking-tight">Élancé</span>
                    </div>

                    {/* Nav links */}
                    {[
                      { icon: BarChart3, label: 'Tableau de bord', active: true },
                      { icon: ShoppingCart, label: 'Ventes', active: false },
                      { icon: Package, label: 'Achats & Stock', active: false },
                      { icon: Factory, label: 'Production (OF)', active: false },
                      { icon: HardHat, label: 'Chantiers BTP', active: false },
                      { icon: Truck, label: 'Flotte & Livraisons', active: false },
                      { icon: FileText, label: 'Facturation mixte', active: false },
                      { icon: Users, label: 'Équipe & RH', active: false },
                    ].map(({ icon: Icon, label, active }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                          active
                            ? 'bg-[#007BA7]/20 text-[#F5F7FA] border border-[#007BA7]/40 shadow-xs'
                            : 'text-[#A1A1AA] hover:text-[#F5F7FA] hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`w-3 h-3 shrink-0 ${active ? 'text-[#007BA7]' : 'text-[#A1A1AA]'}`} />
                        <span className="truncate">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Main Dashboard Area */}
                  <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3.5 bg-[#0F0F12]/80">
                    {/* Section header: uses <div> instead of <h2> for clean heading semantics */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-[#F5F7FA] tracking-tight">Tableau de bord</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#007BA7] opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#007BA7]" />
                          </span>
                          <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                            Données en temps réel
                          </span>
                        </div>
                      </div>
                      <div className="text-[9.5px] font-semibold px-2 py-0.5 rounded-md text-[#A1A1AA] bg-white/5 border border-white/10">
                        Tunisie · 2026
                      </div>
                    </div>

                    {/* Stat cards row */}
                    <div className="grid grid-cols-3 gap-2">
                      <StatCard label="Chiffre d'affaires" value="284K TND" change="↑ +18%" color="text-emerald-400" delay={0.3} />
                      <StatCard label="Commandes" value="1 247" change="34 en cours" color="text-[#007BA7]" delay={0.4} />
                      <StatCard label="Stock (M³)" value="98 m³" change="13 alertes" color="text-amber-300" delay={0.5} />
                    </div>

                    {/* Graphs & activity row */}
                    <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
                      {/* Sales chart card */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55 }}
                        className="bg-[#131316]/90 border border-[#A1A1AA]/20 rounded-xl p-2.5 flex flex-col justify-between shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#A1A1AA]">Ventes 12 mois</span>
                          <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded text-emerald-300 bg-emerald-500/15 border border-emerald-400/25">
                            ↑ 18.4%
                          </span>
                        </div>
                        <BarChart data={[38, 52, 44, 65, 58, 75, 62, 82, 70, 88, 74, 95]} />
                        <div className="flex justify-between mt-1 px-1">
                          {['Jan', 'Mar', 'Juin', 'Sept', 'Déc'].map(m => (
                            <span key={m} className="text-[8.5px] font-semibold text-[#A1A1AA]">{m}</span>
                          ))}
                        </div>
                      </motion.div>

                      {/* Recent activity card */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="bg-[#131316]/90 border border-[#A1A1AA]/20 rounded-xl p-2.5 flex flex-col gap-0.5 shadow-xs"
                      >
                        <span className="text-[9.5px] font-bold uppercase tracking-wider mb-1 text-[#A1A1AA]">Activité récente</span>
                        <ActivityItem icon={ShoppingCart} text="Commande #2847 — SICOUB" badge="Vente" badgeColor="bg-[#007BA7]/20 text-[#007BA7] border border-[#007BA7]/30" delay={0.65} />
                        <ActivityItem icon={Factory} text="OF #084 — 35 Portes massives" badge="Atelier" badgeColor="bg-[#FF2E88]/20 text-[#FF2E88] border border-[#FF2E88]/30" delay={0.7} />
                        <ActivityItem icon={Truck} text="BL #1204 — 24 m³ Chêne" badge="Achat" badgeColor="bg-amber-500/20 text-amber-300 border border-amber-400/20" delay={0.75} />
                        <ActivityItem icon={FileText} text="Facture #5582 — Portes & Pose" badge="Mixte" badgeColor="bg-emerald-500/20 text-emerald-300 border border-emerald-400/20" delay={0.8} />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge 1 - Top Left */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-3 -left-5 flex items-center gap-2 rounded-xl px-3 py-2 bg-[#0A0A0B]/95 border border-[#007BA7]/30 backdrop-blur-xl shadow-xl z-30"
              >
                <div className="w-6 h-6 rounded-lg bg-[#007BA7]/20 border border-[#007BA7]/30 flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-[#007BA7]" />
                </div>
                <div>
                  <div className="text-[8.5px] font-bold uppercase tracking-wider text-[#A1A1AA]">Rentabilité</div>
                  <div className="text-xs font-black text-[#F5F7FA] leading-tight">+28% ROI</div>
                </div>
              </motion.div>

              {/* Floating badge 2 - Bottom Right */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-3 -right-5 flex items-center gap-2 rounded-xl px-3 py-2 bg-[#0A0A0B]/95 border border-[#FF2E88]/30 backdrop-blur-xl shadow-xl z-30"
              >
                <div className="w-6 h-6 rounded-lg bg-[#FF2E88]/20 border border-[#FF2E88]/30 flex items-center justify-center">
                  <Globe className="w-3 h-3 text-[#FF2E88]" />
                </div>
                <div>
                  <div className="text-[8.5px] font-bold uppercase tracking-wider text-[#A1A1AA]">Multi-devises</div>
                  <div className="text-[11px] font-black text-[#F5F7FA] leading-tight">TND · EUR · USD</div>
                </div>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* ── Bottom compliance trust strip (Desktop) ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 hidden lg:flex items-center gap-8 px-8 py-3 bg-[#0A0A0B]/90 border-t border-[#A1A1AA]/15 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] shrink-0">
          <Shield className="w-3.5 h-3.5 text-[#007BA7]" />
          Conforme & Sécurisé
        </div>
        <div className="w-px h-4 bg-[#A1A1AA]/20" />
        {[
          '🔒 Données chiffrées AES-256',
          '🇹🇳 Hébergement souverain & données protégées',
          '📊 Conforme réglementation & fiscalité TN',
          '⚡ Passerelle comptable Qwerty certifiée'
        ].map(item => (
          <div key={item} className="text-[11px] font-medium text-[#A1A1AA] whitespace-nowrap">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
