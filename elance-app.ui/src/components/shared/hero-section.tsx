'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight, CheckCircle2, TrendingUp, Package, ShoppingCart,
  Users, BarChart3, Truck, FileText, Zap, Shield, Globe, ChevronLeft, ChevronRight
} from 'lucide-react';

// ─── Animated bar chart ───────────────────────────────────────────────────────
function BarChart({ data, color }: { data: number[]; color: string }) {
  return (
    <div className="flex items-end gap-0.5 h-14">
      {data.map((h, i) => (
        <motion.div
          key={i}
          className={`flex-1 rounded-sm ${color} opacity-80`}
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ delay: 0.3 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ─── KPI stat card ────────────────────────────────────────────────────────────
function StatCard({ label, value, change, color, delay }: {
  label: string; value: string; change: string; color: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-left"
    >
      <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-white font-bold text-[1.1rem] leading-none">{value}</div>
      <div className={`text-[10px] font-bold mt-1.5 ${color}`}>{change}</div>
    </motion.div>
  );
}

// ─── Activity row ─────────────────────────────────────────────────────────────
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
      <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-white/50" />
      </div>
      <p className="text-[11px] text-white/60 flex-1 truncate">{text}</p>
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${badgeColor}`}>{badge}</span>
    </motion.div>
  );
}

// ─── Background slide configs ─────────────────────────────────────────────────
const SLIDES = [
  { bg: '#0D1F3C', accent: '#1E3A6E' },
  { bg: '#0F2027', accent: '#203A43' },
  { bg: '#1a1035', accent: '#2d1b69' },
];

// ─── Main Hero ────────────────────────────────────────────────────────────────
export function HeroSection() {
  const [slide, setSlide] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="relative min-h-screen w-full overflow-hidden text-white transition-colors duration-1000"
      style={{ backgroundColor: SLIDES[slide].bg }}
    >
      {/* ── Background mesh + glow ── */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
      <AnimatePresence initial={false}>
        <motion.div
          key={slide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 blur-[200px] rounded-full scale-150"
          style={{ backgroundColor: SLIDES[slide].accent }}
        />
      </AnimatePresence>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(59,130,246,0.10)' }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.08)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-10" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.2), transparent)' }} />

      {/* ── Main grid ── */}
      <div className="relative z-20 flex min-h-screen items-center px-6 lg:px-16 xl:px-20 pt-24 pb-28">
        <div className="mx-auto w-full max-w-7xl grid lg:grid-cols-2 gap-14 xl:gap-20 items-center">

          {/* LEFT: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : -30 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-8 text-left"
          >


            {/* H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-white">
              Pilotez votre entreprise{' '}
              <span style={{ color: '#60A5FA' }}>intelligemment</span>,{' '}
              en temps réel.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg leading-relaxed max-w-xl font-medium" style={{ color: 'rgba(255,255,255,0.70)' }}>
              ACYA centralise vos ventes, achats, stocks, chantiers, équipe et flotte logistique, avec une connexion directe vers votre expert-comptable sur Qwerty.
            </p>

            {/* Trust checks */}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {['Gestion M³ & Chantiers BTP', 'Facturation & Écosystème Qwerty', 'Stock multi-dépôts', 'Zéro double-saisie'].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.70)' }}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#3B82F6' }} />
                  {item}
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/enterprise-registration"
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-full px-8 text-base font-bold text-white transition-all hover:scale-105"
                style={{ background: '#3B82F6', boxShadow: '0 20px 40px -8px rgba(59,130,246,0.35)' }}
              >
                Essai Gratuit 14 Jours
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="#tarifs"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border px-8 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.20)', background: 'rgba(255,255,255,0.05)' }}
              >
                Découvrir l'offre (450 DT)
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              {[
                { val: '500+', label: 'Entreprises actives' },
                { val: '99.9%', label: 'Disponibilité SLA' },
                { val: '< 2s', label: 'Temps de réponse' },
              ].map(({ val, label }) => (
                <div key={label}>
                  <div className="text-2xl font-black text-white">{val}</div>
                  <div className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: Product Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }}
            transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
            className="hidden lg:block relative group"
          >
            {/* Glow */}
            <div className="absolute -inset-8 rounded-full opacity-60 group-hover:opacity-90 transition-opacity duration-1000 blur-[80px]" style={{ background: 'rgba(59,130,246,0.15)' }} />

            {/* Browser card */}
            <div className="relative rounded-[2rem] overflow-hidden backdrop-blur-md transition-all duration-700 group-hover:scale-[1.01]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 60px 120px -20px rgba(0,0,0,0.6)' }}>

              {/* Browser top bar */}
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(248,113,113,0.6)' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(251,191,36,0.6)' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(52,211,153,0.6)' }} />
                </div>
                <div className="flex-1 mx-4 rounded-full px-4 py-1.5 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <Shield className="w-3 h-3 shrink-0" style={{ color: '#34D399' }} />
                  <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.40)' }}>app.elance.acya.site</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-black rounded-full px-2.5 py-1 uppercase tracking-widest" style={{ color: '#34D399', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </div>
              </div>

              {/* App body */}
              <div className="flex h-[460px]">

                {/* Sidebar */}
                <div className="w-[185px] p-4 flex flex-col gap-1 shrink-0" style={{ borderRight: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.20)' }}>
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <svg className="w-6 h-6 shrink-0" viewBox="0 0 40 40" fill="none">
                      <defs>
                        <linearGradient id="hg1" x1="0" y1="0" x2="40" y2="40">
                          <stop offset="0%" stopColor="#93C5FD"/>
                          <stop offset="100%" stopColor="#3B82F6"/>
                        </linearGradient>
                        <linearGradient id="hg2" x1="0" y1="0" x2="40" y2="40">
                          <stop offset="0%" stopColor="#3B82F6"/>
                          <stop offset="100%" stopColor="#2563EB"/>
                        </linearGradient>
                        <linearGradient id="hg3" x1="0" y1="0" x2="40" y2="40">
                          <stop offset="0%" stopColor="#2563EB"/>
                          <stop offset="100%" stopColor="#1D4ED8"/>
                        </linearGradient>
                      </defs>
                      <path d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z" fill="url(#hg1)" />
                      <path d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z" fill="url(#hg2)" />
                      <path d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z" fill="url(#hg3)" />
                    </svg>
                    <span className="text-white text-sm font-bold tracking-tight">Élancé</span>
                  </div>
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
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      style={active
                        ? { background: 'rgba(59,130,246,0.20)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.20)' }
                        : { color: 'rgba(255,255,255,0.40)' }
                      }
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {label}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 p-5 overflow-hidden flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-white tracking-tight">Tableau de bord</h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Données en temps réel</span>
                      </div>
                    </div>
                    <div className="text-[9px] font-bold px-2.5 py-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.30)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>Juin 2026</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <StatCard label="Chiffre d'affaires" value="284K TND" change="↑ +18%" color="text-emerald-400" delay={0.4} />
                    <StatCard label="Commandes" value="1 247" change="34 en cours" color="text-blue-400" delay={0.5} />
                    <StatCard label="Stock" value="98 m³" change="13 alertes" color="text-amber-400" delay={0.6} />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="rounded-xl p-3 flex flex-col gap-2"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.50)' }}>Ventes 12 mois</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: '#34D399', background: 'rgba(52,211,153,0.10)' }}>↑18.4%</span>
                      </div>
                      <BarChart data={[38, 52, 44, 65, 58, 75, 62, 82, 70, 88, 74, 95]} color="bg-blue-500" />
                      <div className="flex justify-between mt-1">
                        {['Jan', 'Mar', 'Juin'].map(m => (
                          <span key={m} className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>{m}</span>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.75 }}
                      className="rounded-xl p-3 flex flex-col gap-0.5"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.50)' }}>Activité récente</span>
                      <ActivityItem icon={ShoppingCart} text="Commande #2847 — SICOUB" badge="Vente" badgeColor="bg-blue-500/20 text-blue-400" delay={0.8} />
                      <ActivityItem icon={Truck} text="BL #1204 — 24 m³ Chêne" badge="Achat" badgeColor="bg-amber-500/20 text-amber-400" delay={0.88} />
                      <ActivityItem icon={FileText} text="Facture #5582 — 3 200 TND" badge="Finance" badgeColor="bg-emerald-500/20 text-emerald-400" delay={0.96} />
                      <ActivityItem icon={Zap} text="Alerte stock — Seuil Min" badge="Stock" badgeColor="bg-rose-500/20 text-rose-400" delay={1.04} />
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="absolute top-0 right-0 h-full w-px" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.15), transparent)' }} />
              <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)' }} />
            </div>

            {/* Floating badges */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -left-10 flex items-center gap-2.5 rounded-2xl px-4 py-3 backdrop-blur-md shadow-xl z-30"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.20)' }}>
                <TrendingUp className="w-4 h-4" style={{ color: '#60A5FA' }} />
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.40)' }}>ROI Client</div>
                <div className="text-base font-black text-white">+28%</div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
              className="absolute -bottom-4 -right-10 flex items-center gap-2.5 rounded-2xl px-4 py-3 backdrop-blur-md shadow-xl z-30"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.20)' }}>
                <Globe className="w-4 h-4" style={{ color: '#34D399' }} />
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.40)' }}>Multi-devises</div>
                <div className="text-sm font-black text-white">TND · EUR · USD</div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>

      {/* ── Slide navigation ── */}
      <div className="absolute bottom-20 right-8 z-30 flex items-center gap-3 lg:bottom-16">
        <div className="flex gap-2 mr-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
              style={{ width: i === slide ? '2rem' : '1rem', background: i === slide ? '#3B82F6' : 'rgba(255,255,255,0.20)' }}
            />
          ))}
        </div>
        <button
          onClick={() => setSlide(s => (s - 1 + SLIDES.length) % SLIDES.length)}
          className="flex h-10 w-12 items-center justify-center rounded-l-lg text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
          style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setSlide(s => (s + 1) % SLIDES.length)}
          className="flex h-10 w-12 items-center justify-center rounded-r-lg text-white transition-colors cursor-pointer"
          style={{ background: '#3B82F6', boxShadow: '0 8px 20px rgba(59,130,246,0.25)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Bottom compliance strip ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 hidden lg:flex items-center gap-8 px-8 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <Shield className="w-3.5 h-3.5" />
          Certifié & Conforme
        </div>
        <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.10)' }} />
        {['🔒 Données chiffrées AES-256', '🇹🇳 Hébergement souverain', '📊 Conformité fiscale TN', '⚡ Uptime 99.9% garanti'].map(item => (
          <div key={item} className="text-[10px] font-semibold whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.40)' }}>{item}</div>
        ))}
      </div>

    </section>
  );
}
