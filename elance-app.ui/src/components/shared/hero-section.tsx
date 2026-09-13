'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight, CheckCircle2, TrendingUp, Package, ShoppingCart,
  Users, BarChart3, Truck, FileText, Zap, Shield, Globe, ChevronLeft, ChevronRight
} from 'lucide-react';

// ─── Animated bar chart ───────────────────────────────────────────────────────
// Uses tabular layout with crisp cyan-to-blue gradient bars for SaaS clarity
function BarChart({ data }: { data: number[] }) {
  return (
    <div className="flex items-end gap-1 h-14 pt-2">
      {data.map((h, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-sm bg-gradient-to-t from-blue-600 via-blue-500 to-cyan-400 opacity-90 hover:opacity-100 transition-opacity"
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ delay: 0.3 + i * 0.04, duration: 0.5, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ─── KPI stat card ────────────────────────────────────────────────────────────
// Concentric border radius, subtle hover feedback, tabular numbers
function StatCard({ label, value, change, color, delay }: {
  label: string; value: string; change: string; color: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className="bg-slate-800/80 border border-white/10 hover:border-white/20 rounded-xl p-3 text-left transition-colors shadow-sm"
    >
      <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-white font-bold text-[1.15rem] leading-none tabular-nums tracking-tight">{value}</div>
      <div className={`text-[10px] font-bold mt-1.5 ${color}`}>{change}</div>
    </motion.div>
  );
}

// ─── Activity row ─────────────────────────────────────────────────────────────
// Crisp typography and high-contrast badge pills
function ActivityItem({ icon: Icon, text, badge, badgeColor, delay }: {
  icon: any; text: string; badge: string; badgeColor: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="flex items-center gap-2.5 py-1.5 border-b border-white/5 last:border-0"
    >
      <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-300" />
      </div>
      <p className="text-[11px] font-medium text-slate-200 flex-1 truncate">{text}</p>
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${badgeColor}`}>{badge}</span>
    </motion.div>
  );
}

// ─── Background slide configs ─────────────────────────────────────────────────
// Brightened, luminous sapphire navy palette for an authentic modern SaaS feel
const SLIDES = [
  { bg: '#0A1224', accent: '#1D4ED8', glow: 'rgba(59,130,246,0.22)' },
  { bg: '#081528', accent: '#0284C7', glow: 'rgba(6,182,212,0.20)' },
  { bg: '#0B1733', accent: '#2563EB', glow: 'rgba(99,102,241,0.20)' },
];

// ─── Main Hero ────────────────────────────────────────────────────────────────
export function HeroSection() {
  const [slide, setSlide] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 7000);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="relative min-h-screen w-full overflow-hidden text-white transition-colors duration-1000"
      style={{ backgroundColor: SLIDES[slide].bg }}
    >
      {/* ── Atmospheric background mesh & light glows ── */}
      {/* Subtle micro-grid */}
      <div 
        className="absolute inset-0 opacity-[0.06] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', 
          backgroundSize: '30px 30px' 
        }} 
      />

      {/* Dynamic ambient color glow */}
      <AnimatePresence initial={false}>
        <motion.div
          key={slide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 blur-[160px] rounded-full scale-125 pointer-events-none"
          style={{ backgroundColor: SLIDES[slide].accent }}
        />
      </AnimatePresence>

      {/* Top radiant light beam */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] rounded-full blur-[120px] pointer-events-none" 
        style={{ background: SLIDES[slide].glow }} 
      />

      {/* Secondary atmospheric glows for spatial depth */}
      <div 
        className="absolute top-24 right-[-5%] w-[550px] h-[550px] rounded-full blur-[140px] pointer-events-none" 
        style={{ background: 'rgba(59,130,246,0.18)' }} 
      />
      <div 
        className="absolute bottom-10 left-[-5%] w-[450px] h-[450px] rounded-full blur-[130px] pointer-events-none" 
        style={{ background: 'rgba(6,182,212,0.12)' }} 
      />

      {/* Bottom fade transition to page content */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-36 pointer-events-none z-10" 
        style={{ background: 'linear-gradient(to top, rgba(10,18,36,0.9), transparent)' }} 
      />

      {/* ── Main content grid ── */}
      <div className="relative z-20 flex min-h-screen items-center px-6 lg:px-14 xl:px-20 pt-32 lg:pt-36 pb-28">
        <div className="mx-auto w-full max-w-[1260px] grid lg:grid-cols-2 gap-12 xl:gap-16 items-center">

          {/* LEFT: Copy & Value Proposition */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : -25 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className="space-y-7 text-left"
          >
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/15 text-cyan-300 text-xs font-semibold backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              ERP Nouvelle Génération & Intégration Fiscale
            </div>

            {/* H1 - High visual hierarchy, text-wrap balance */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] xl:text-[3.75rem] font-black tracking-[-0.03em] leading-[1.08] text-white [text-wrap:balance]">
              Pilotez votre entreprise{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-sky-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(56,189,248,0.35)]">
                intelligemment
              </span>,{' '}
              en temps réel.
            </h1>

            {/* Subtitle - Increased contrast & readability */}
            <p className="text-base sm:text-lg leading-relaxed max-w-xl font-normal text-slate-200/90 [text-wrap:pretty]">
              ACYA centralise vos ventes, achats, stocks, chantiers, équipe et flotte logistique, avec une connexion directe vers votre expert-comptable sur Qwerty.
            </p>

            {/* Trust checks (Feature points) */}
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 pt-1">
              {[
                'Gestion M³ & Chantiers BTP',
                'Facturation & Écosystème Qwerty',
                'Stock multi-dépôts',
                'Zéro double-saisie',
              ].map(item => (
                <div key={item} className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-3">
              <Link
                href="/enterprise-registration"
                className="group inline-flex h-13 sm:h-14 items-center justify-center gap-2.5 rounded-xl px-8 text-base font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.5),0_0_0_1px_rgba(255,255,255,0.25)_inset] transition-all duration-200 active:scale-[0.96]"
              >
                <span>Essai Gratuit 14 Jours</span>
                <ArrowRight className="w-4.5 h-4.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="#tarifs"
                className="inline-flex h-13 sm:h-14 items-center justify-center gap-2 rounded-xl border border-white/20 hover:border-white/40 px-7 text-base font-semibold text-slate-100 hover:text-white bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-md shadow-sm transition-all duration-200 active:scale-[0.96]"
              >
                Découvrir l'offre (450 DT)
              </Link>
            </div>

            {/* Key Statistics - Clean separation and tabular numerals */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-6 border-t border-white/10">
              {[
                { val: '500+', label: 'Entreprises actives' },
                { val: '99.9%', label: 'Disponibilité SLA' },
                { val: '< 2s', label: 'Temps de réponse' },
              ].map(({ val, label }) => (
                <div key={label} className="flex flex-col">
                  <div className="text-2xl sm:text-3xl font-black tracking-tight text-white tabular-nums">
                    {val}
                  </div>
                  <div className="text-xs font-medium text-slate-300 mt-1">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: Product Showcase Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 25 }}
            transition={{ duration: 0.85, delay: 0.15, ease: 'easeOut' }}
            className="hidden lg:block relative group"
          >
            {/* Ambient backlight glow */}
            <div 
              className="absolute -inset-6 rounded-3xl opacity-70 group-hover:opacity-90 transition-opacity duration-700 blur-[70px] pointer-events-none" 
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(6,182,212,0.15) 50%, transparent 80%)' }} 
            />

            {/* Browser card window */}
            <div 
              className="relative rounded-2xl overflow-hidden bg-slate-900/90 border border-white/20 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8),0_0_40px_-10px_rgba(59,130,246,0.35)] backdrop-blur-xl transition-all duration-500 group-hover:scale-[1.008] ring-1 ring-white/10"
            >
              {/* Browser window header */}
              <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-950/60 border-b border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                
                {/* Address bar */}
                <div className="flex-1 mx-4 rounded-full px-4 py-1.5 flex items-center gap-2 bg-slate-900/80 border border-white/10 shadow-inner">
                  <Shield className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span className="text-[11px] font-mono font-medium text-slate-300">app.elance.acya.site</span>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-1.5 text-[9px] font-extrabold rounded-full px-2.5 py-1 uppercase tracking-widest text-emerald-300 bg-emerald-500/15 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </div>
              </div>

              {/* App UI interior */}
              <div className="flex h-[465px]">

                {/* Sidebar */}
                <div className="w-[185px] p-4 flex flex-col gap-1.5 shrink-0 bg-slate-950/70 border-r border-white/10">
                  {/* Sidebar Brand Lockup */}
                  <div className="flex items-center gap-2.5 mb-4 px-1">
                    <svg className="w-6 h-6 shrink-0 drop-shadow-[0_1px_4px_rgba(59,130,246,0.6)]" viewBox="0 0 40 40" fill="none">
                      <defs>
                        <linearGradient id="sb_g1" x1="0" y1="0" x2="40" y2="40">
                          <stop offset="0%" stopColor="#93C5FD"/>
                          <stop offset="100%" stopColor="#3B82F6"/>
                        </linearGradient>
                        <linearGradient id="sb_g2" x1="0" y1="0" x2="40" y2="40">
                          <stop offset="0%" stopColor="#3B82F6"/>
                          <stop offset="100%" stopColor="#2563EB"/>
                        </linearGradient>
                        <linearGradient id="sb_g3" x1="0" y1="0" x2="40" y2="40">
                          <stop offset="0%" stopColor="#2563EB"/>
                          <stop offset="100%" stopColor="#1D4ED8"/>
                        </linearGradient>
                      </defs>
                      <path d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z" fill="url(#sb_g1)" />
                      <path d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z" fill="url(#sb_g2)" />
                      <path d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z" fill="url(#sb_g3)" />
                    </svg>
                    <span className="text-white text-sm font-bold tracking-tight">Élancé</span>
                  </div>

                  {/* Nav links */}
                  {[
                    { icon: BarChart3, label: 'Tableau de bord', active: true },
                    { icon: ShoppingCart, label: 'Ventes', active: false },
                    { icon: Package, label: 'Achats', active: false },
                    { icon: Truck, label: 'Livraisons', active: false },
                    { icon: FileText, label: 'Facturation', active: false },
                    { icon: Users, label: 'Équipe', active: false },
                    { icon: TrendingUp, label: 'Analytics', active: false },
                  ].map(({ icon: Icon, label, active }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? 'bg-blue-600/30 text-blue-200 border border-blue-400/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-blue-300' : 'text-slate-400'}`} />
                      {label}
                    </div>
                  ))}
                </div>

                {/* Main Dashboard Area */}
                <div className="flex-1 p-5 overflow-hidden flex flex-col gap-4 bg-slate-900/60">
                  {/* Section header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-white tracking-tight">Tableau de bord</h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                          Données en temps réel
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold px-2.5 py-1 rounded-lg text-slate-300 bg-white/10 border border-white/10">
                      Juin 2026
                    </div>
                  </div>

                  {/* Stat cards row */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <StatCard label="Chiffre d'affaires" value="284K TND" change="↑ +18%" color="text-emerald-400" delay={0.4} />
                    <StatCard label="Commandes" value="1 247" change="34 en cours" color="text-blue-300" delay={0.5} />
                    <StatCard label="Stock" value="98 m³" change="13 alertes" color="text-amber-300" delay={0.6} />
                  </div>

                  {/* Graphs & activity row */}
                  <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
                    {/* Sales chart card */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="bg-slate-800/80 border border-white/10 rounded-xl p-3 flex flex-col justify-between shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Ventes 12 mois</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-emerald-300 bg-emerald-500/15 border border-emerald-400/25">
                          ↑ 18.4%
                        </span>
                      </div>
                      <BarChart data={[38, 52, 44, 65, 58, 75, 62, 82, 70, 88, 74, 95]} />
                      <div className="flex justify-between mt-1 px-1">
                        {['Jan', 'Mar', 'Juin', 'Sept', 'Déc'].map(m => (
                          <span key={m} className="text-[9px] font-semibold text-slate-400">{m}</span>
                        ))}
                      </div>
                    </motion.div>

                    {/* Recent activity card */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.75 }}
                      className="bg-slate-800/80 border border-white/10 rounded-xl p-3 flex flex-col gap-0.5 shadow-sm"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-300">Activité récente</span>
                      <ActivityItem icon={ShoppingCart} text="Commande #2847 — SICOUB" badge="Vente" badgeColor="bg-blue-500/20 text-blue-300 border border-blue-400/20" delay={0.8} />
                      <ActivityItem icon={Truck} text="BL #1204 — 24 m³ Chêne" badge="Achat" badgeColor="bg-amber-500/20 text-amber-300 border border-amber-400/20" delay={0.88} />
                      <ActivityItem icon={FileText} text="Facture #5582 — 3 200 TND" badge="Finance" badgeColor="bg-emerald-500/20 text-emerald-300 border border-emerald-400/20" delay={0.96} />
                      <ActivityItem icon={Zap} text="Alerte stock — Seuil Min" badge="Stock" badgeColor="bg-rose-500/20 text-rose-300 border border-rose-400/20" delay={1.04} />
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge 1 - Top Left */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-3.5 -left-6 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 bg-slate-900/90 border border-white/15 backdrop-blur-xl shadow-xl z-30 ring-1 ring-white/5"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-500/25 border border-blue-400/30 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-blue-300" />
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-300">ROI Client</div>
                <div className="text-sm font-black text-white leading-tight">+28%</div>
              </div>
            </motion.div>

            {/* Floating badge 2 - Bottom Right */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -bottom-3.5 -right-6 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 bg-slate-900/90 border border-white/15 backdrop-blur-xl shadow-xl z-30 ring-1 ring-white/5"
            >
              <div className="w-7 h-7 rounded-lg bg-cyan-500/25 border border-cyan-400/30 flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-cyan-300" />
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Multi-devises</div>
                <div className="text-xs font-black text-white leading-tight">TND · EUR · USD</div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>

      {/* ── Slide mood navigation (bottom right) ── */}
      <div className="absolute bottom-16 right-8 z-30 hidden sm:flex items-center gap-2">
        <div className="flex gap-1.5 mr-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
              style={{ 
                width: i === slide ? '1.75rem' : '0.75rem', 
                background: i === slide ? '#3B82F6' : 'rgba(255,255,255,0.25)' 
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => setSlide(s => (s - 1 + SLIDES.length) % SLIDES.length)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 border border-white/15 bg-white/5 transition-colors cursor-pointer"
          aria-label="Previous theme"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setSlide(s => (s + 1) % SLIDES.length)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-colors cursor-pointer"
          aria-label="Next theme"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Bottom compliance trust strip ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 hidden lg:flex items-center gap-8 px-8 py-3.5 bg-slate-950/60 border-t border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 shrink-0">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          Certifié & Conforme
        </div>
        <div className="w-px h-5 bg-white/15" />
        {[
          '🔒 Données chiffrées AES-256', 
          '🇹🇳 Hébergement souverain', 
          '📊 Conformité fiscale TN', 
          '⚡ Uptime 99.9% garanti'
        ].map(item => (
          <div key={item} className="text-[11px] font-semibold text-slate-300 whitespace-nowrap">
            {item}
          </div>
        ))}
      </div>

    </section>
  );
}
