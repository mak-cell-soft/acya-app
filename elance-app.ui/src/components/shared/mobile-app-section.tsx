'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Lock, 
  TrendingUp, 
  Truck, 
  HardHat, 
  Layers, 
  Wifi, 
  Battery, 
  BellRing,
  Activity,
  ScanLine,
  FileSpreadsheet,
  Check,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileRequestDialog } from '@/components/shared/mobile-request-dialog';

// ─── Key Features Data ────────────────────────────────────────────────────────
const mobileFeatures = [
  {
    icon: <Smartphone className="w-5 h-5 text-corp-cyan" />,
    title: "Application native",
    desc: "Une expérience ultra-rapide et fluide conçue spécialement pour l'ergonomie mobile.",
    tag: "Performance 60fps"
  },
  {
    icon: (
      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.64-.78 1.08-1.86.96-2.95-1 .04-2.16.66-2.83 1.44-.59.67-1.12 1.77-.98 2.82 1.12.09 2.21-.57 2.85-1.31z"/>
      </svg>
    ),
    title: "Disponible sur iOS",
    desc: "Compatible avec iPhone et iPad, intégrant la gestuelle fluide et les notifications Apple.",
    tag: "iOS & iPadOS"
  },
  {
    icon: (
      <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9996.4482.9996.9993.0001.5511-.4486.9997-.9996.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8563 8.125 12 8.125s-3.5902.286-5.1368.8297L4.8409 5.4517a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/>
      </svg>
    ),
    title: "Disponible sur Android",
    desc: "Accessible sur l'ensemble de vos smartphones et tablettes Android en toute fluidité.",
    tag: "Android 10+"
  },
  {
    icon: <Zap className="w-5 h-5 text-amber-400" />,
    title: "Accès en temps réel",
    desc: "Consultez vos ventes, stocks en M³, chantiers et plannings où que vous soyez.",
    tag: "Direct Sync"
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-corp-cyan" />,
    title: "Connexion sécurisée",
    desc: "Vos données restent protégées avec le même niveau de sécurité et de chiffrement que le Web.",
    tag: "Chiffrement SSL"
  },
  {
    icon: <Lock className="w-5 h-5 text-indigo-400" />,
    title: "Sur demande entreprise",
    desc: "Accès privé configuré sur mesure pour les besoins et les rôles de vos équipes.",
    tag: "Déploiement Dédié"
  }
];

export function MobileAppSection() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <section 
      id="mobile-app" 
      className="py-28 px-6 md:px-10 bg-gradient-to-br from-[#060D1A] via-[#0B1A3B] to-[#050B17] relative overflow-hidden font-sans text-white border-t border-corp-blue-900/40"
    >
      {/* ── Atmospheric Ambient Lighting ── */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(37,99,235,0.12)_0%,transparent_70%)] rounded-full blur-[100px] pointer-events-none -translate-x-1/3" />
      <div className="absolute bottom-10 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(6,182,212,0.12)_0%,transparent_70%)] rounded-full blur-[120px] pointer-events-none translate-x-1/4" />
      
      {/* Subtle Blueprint Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-50" />

      {/* ── Main Container ── */}
      <div className="max-w-[1280px] mx-auto relative z-10">

        {/* ── Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* LEFT COLUMN: Marketing Copy, Features, and CTA                 */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 space-y-8 text-left">
            
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-corp-blue-500/20 via-corp-cyan/20 to-corp-blue-600/20 border border-corp-cyan/30 text-xs font-black uppercase tracking-wider text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            >
              <span className="w-2 h-2 rounded-full bg-corp-cyan animate-ping" />
              <span>Nouveau — Application Mobile</span>
              <span className="text-white/40 font-normal">|</span>
              <span className="text-white/80 font-bold normal-case text-[11px] flex items-center gap-1.5">
                iOS & Android
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-3"
            >
              <h2 className="text-[2.4rem] sm:text-[3.2rem] font-black tracking-tight leading-[1.08] text-white">
                ACYA, partout avec vous.{' '}
                <span className="bg-gradient-to-r from-corp-cyan via-blue-300 to-corp-blue-400 bg-clip-text text-transparent block mt-1">
                  Votre entreprise dans votre poche.
                </span>
              </h2>

              <p className="text-[1.02rem] sm:text-[1.12rem] text-slate-300 font-medium leading-relaxed max-w-xl">
                Avec l'application mobile native ACYA, restez connecté à votre activité où que vous soyez. Disponible sur iOS et Android, elle vous permet d'accéder instantanément aux informations essentielles de votre entreprise depuis votre smartphone.
              </p>
            </motion.div>

            {/* Hierarchy Banner: Web Platform -> Native Mobile -> Everywhere */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-center justify-between gap-2 max-w-lg text-xs font-bold text-slate-300"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Plateforme Web</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex items-center gap-2 text-cyan-300">
                <Smartphone className="w-3.5 h-3.5" />
                <span>App Native</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
                <span>Partout avec vous</span>
              </div>
            </motion.div>

            {/* Feature Cards Grid (6 items) */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2"
            >
              {mobileFeatures.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-corp-blue-500/40 hover:bg-white/[0.06] transition-all duration-300 space-y-2 group shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
                      {item.tag}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[0.92rem] font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5 font-medium">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Explanatory Note on Availability Upon Request */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-corp-blue-500/10 border border-corp-blue-500/20 text-xs text-slate-300 leading-relaxed font-medium"
            >
              <Sparkles className="w-4 h-4 text-corp-cyan shrink-0 mt-0.5" />
              <p>
                <strong className="text-white font-bold">Disponible sur demande :</strong> L'application mobile ACYA est délivrée sur demande pour les entreprises clientes souhaitant équiper leurs dirigeants, commerciaux et chefs d'équipe sur le terrain.
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
            >
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="h-14 px-8 bg-gradient-to-r from-corp-blue-600 via-corp-blue-700 to-corp-cyan hover:from-corp-blue-500 hover:to-cyan-400 text-white font-extrabold text-[0.98rem] rounded-xl shadow-[0_15px_35px_-5px_rgba(37,99,235,0.4)] active:scale-[0.96] transition-all cursor-pointer flex items-center justify-center gap-2.5 group"
              >
                <span>Demander l'application mobile</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-14 px-6 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 text-sm font-bold rounded-xl transition-all"
              >
                <Link href="/contact?subject=application-mobile" className="flex items-center gap-2">
                  <span>Nous contacter</span>
                </Link>
              </Button>
            </motion.div>

          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* RIGHT COLUMN: Realistic Dual Phone Mockups (iOS & Android)      */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 relative flex justify-center items-center mt-10 lg:mt-0">
            
            {/* Center glow behind phones */}
            <div className="absolute w-[400px] h-[400px] bg-corp-blue-600/20 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute w-[300px] h-[300px] bg-corp-cyan/20 rounded-full blur-[80px] pointer-events-none -bottom-10" />

            {/* ── Mockups Container ── */}
            <div className="relative w-full max-w-[560px] flex items-center justify-center gap-4 sm:gap-6 py-6">

              {/* ────────────────────────────────────────────────────────── */}
              {/* PHONE 1: iOS Device (iPhone 16 Pro Style)                  */}
              {/* ────────────────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 40, rotate: -2 }}
                whileInView={{ opacity: 1, y: 0, rotate: -1.5 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, type: 'spring', stiffness: 60 }}
                whileHover={{ y: -6, rotate: 0, transition: { duration: 0.3 } }}
                className="w-[260px] sm:w-[275px] shrink-0 relative z-20 rounded-[44px] p-3 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.15)] ring-1 ring-white/10"
              >
                {/* Outer Titanium Edge Reflection */}
                <div className="absolute inset-0 rounded-[44px] pointer-events-none border border-white/20" />

                {/* iOS Screen Canvas */}
                <div className="relative rounded-[36px] bg-[#0A1124] overflow-hidden text-white border border-black/40 flex flex-col h-[530px] select-none shadow-inner font-sans">
                  
                  {/* Status Bar */}
                  <div className="pt-3 px-5 flex items-center justify-between text-[11px] font-bold text-white/80 z-30">
                    <span>9:41</span>
                    {/* Dynamic Island */}
                    <div className="w-24 h-5 rounded-full bg-black flex items-center justify-between px-2.5 shadow-md">
                      <div className="w-2 h-2 rounded-full bg-corp-blue-500 animate-pulse" />
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white/10" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Wifi className="w-3 h-3 text-white/90" />
                      <span className="text-[9px] font-black text-cyan-400">5G</span>
                      <Battery className="w-3.5 h-3.5 text-white/90" />
                    </div>
                  </div>

                  {/* iOS App Top Bar */}
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-corp-blue-500 to-corp-blue-700 flex items-center justify-center text-white shadow-sm font-black text-xs">
                        É
                      </div>
                      <div>
                        <div className="text-[11px] font-extrabold text-white leading-tight">Élancé Mobile</div>
                        <div className="text-[9px] text-cyan-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Bois du Sud SARL
                        </div>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/80 relative">
                      <BellRing className="w-3.5 h-3.5" />
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-corp-cyan" />
                    </div>
                  </div>

                  {/* App Inner Body: Live Executive Dashboard */}
                  <div className="p-3.5 space-y-3 flex-1 overflow-hidden">
                    
                    {/* Main Metric Card */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-corp-blue-600/30 via-corp-blue-800/40 to-black/60 border border-corp-blue-500/30 shadow-lg relative overflow-hidden">
                      <div className="text-[9px] font-black text-cyan-300 uppercase tracking-wider flex items-center justify-between">
                        <span>Chiffre d'Affaires • Aujourd'hui</span>
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                      </div>
                      <div className="text-xl font-black text-white mt-1 tabular-nums">
                        142 850 DT
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-400 font-bold">
                        <span>+14.2%</span>
                        <span className="text-white/40 font-normal">vs semaine passée</span>
                      </div>
                    </div>

                    {/* Quick Action Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Scanner', icon: ScanLine, color: 'text-cyan-400 bg-cyan-500/10' },
                        { label: 'Devis M³', icon: FileSpreadsheet, color: 'text-corp-blue-400 bg-blue-500/10' },
                        { label: 'Stock Live', icon: Activity, color: 'text-emerald-400 bg-emerald-500/10' }
                      ].map((btn, i) => (
                        <div 
                          key={i} 
                          className="p-2 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-1 text-center"
                        >
                          <div className={`p-1.5 rounded-lg ${btn.color}`}>
                            <btn.icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-bold text-white/90">{btn.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Volume M³ Wood Chartlet */}
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-300 mb-2">
                        <span>Volume Bois Livré</span>
                        <span className="text-cyan-400 tabular-nums font-black">842 M³</span>
                      </div>
                      <div className="flex items-end gap-1 h-8">
                        {[40, 65, 80, 50, 95, 75, 100].map((h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-sm ${i === 6 ? 'bg-corp-cyan' : 'bg-corp-blue-500/60'}`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Live Recent Transactions */}
                    <div className="space-y-1.5">
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-1">
                        Dernières validations
                      </div>
                      {[
                        { title: 'Maghreb Bois', detail: 'BL #4892 • Validé', amount: '14 200 DT', status: 'text-emerald-400' },
                        { title: 'Comptoir Forestier', detail: 'Devis #104 • Envoyé', amount: '8 950 DT', status: 'text-cyan-400' }
                      ].map((row, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-white">{row.title}</div>
                            <div className="text-[8px] text-slate-400">{row.detail}</div>
                          </div>
                          <div className={`text-[10px] font-bold tabular-nums ${row.status}`}>
                            {row.amount}
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* iOS Device Home Indicator */}
                  <div className="pb-2 pt-1 flex justify-center">
                    <div className="w-28 h-1 bg-white/40 rounded-full" />
                  </div>

                  {/* Subtle iOS Platform Badge */}
                  <div className="absolute bottom-4 right-4 px-2 py-0.5 rounded-full bg-black/60 border border-white/15 backdrop-blur-md text-[8px] font-bold text-white/90 flex items-center gap-1">
                    <span>iOS App</span>
                  </div>

                </div>
              </motion.div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* PHONE 2: Android Flagship (Chantier & Logistics Focus)     */}
              {/* ────────────────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 50, rotate: 3 }}
                whileInView={{ opacity: 1, y: 15, rotate: 2 }}
                viewport={{ once: true }}
                transition={{ duration: 0.85, delay: 0.15, type: 'spring', stiffness: 60 }}
                whileHover={{ y: 8, rotate: 0, transition: { duration: 0.3 } }}
                className="w-[260px] sm:w-[275px] shrink-0 relative z-10 rounded-[40px] p-3 bg-gradient-to-b from-slate-800 via-slate-900 to-black shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.12)] ring-1 ring-emerald-500/20"
              >
                {/* Android Chassis Glow */}
                <div className="absolute inset-0 rounded-[40px] pointer-events-none border border-emerald-500/20" />

                {/* Android Screen Canvas */}
                <div className="relative rounded-[32px] bg-[#07111E] overflow-hidden text-white border border-black/50 flex flex-col h-[530px] select-none shadow-inner font-sans">
                  
                  {/* Status Bar with Centered Camera Dot */}
                  <div className="pt-2.5 px-4 flex items-center justify-between text-[11px] font-bold text-white/70 z-30">
                    <span>10:15</span>
                    {/* Punch Hole Camera */}
                    <div className="w-3.5 h-3.5 rounded-full bg-black border border-white/20 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-bold">
                      <span className="text-emerald-400">LTE</span>
                      <span>89%</span>
                    </div>
                  </div>

                  {/* Android Top Header */}
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/5">
                    <div>
                      <div className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                        <HardHat className="w-3 h-3" />
                        Terrain & Chantiers
                      </div>
                      <div className="text-xs font-black text-white">Supervision Active</div>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      En direct
                    </div>
                  </div>

                  {/* Android Body: Chantiers & Missions */}
                  <div className="p-3.5 space-y-3 flex-1 overflow-hidden">
                    
                    {/* Active Chantier Card */}
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-black border border-emerald-500/30 space-y-2 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white">Résidence Les Pins</span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          Avancement 78%
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full w-[78%]" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[9px] text-slate-300 font-medium">
                        <div className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>4 ouvriers pointés</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-cyan-400" />
                          <span>12.5 M³ livrés</span>
                        </div>
                      </div>
                    </div>

                    {/* Fleet & Delivery Dispatch Card */}
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-corp-cyan" />
                          <span>Camion #04 • Volvo</span>
                        </div>
                        <span className="text-[8px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                          En transit
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-tight">
                        Mission Sfax — 18 M³ Bois Rouge importé. Arrivée estimée 11:45.
                      </p>
                    </div>

                    {/* Stock Alert Pill */}
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <div className="text-[9px] font-bold text-amber-300">Alerte Réapprovisionnement</div>
                        <div className="text-[8px] text-slate-300">Chêne Massif Sec • Reste 8.2 M³ au dépôt</div>
                      </div>
                    </div>

                    {/* Sync Confirmation Row */}
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-[9px] text-slate-400">
                      <span>Synchronisation Qwerty</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        À jour
                      </span>
                    </div>

                  </div>

                  {/* Android Bottom Navigation Pill */}
                  <div className="pb-2 pt-1 flex justify-center">
                    <div className="w-16 h-1 bg-white/30 rounded-full" />
                  </div>

                  {/* Subtle Android Platform Badge */}
                  <div className="absolute bottom-4 right-4 px-2 py-0.5 rounded-full bg-black/60 border border-emerald-500/20 backdrop-blur-md text-[8px] font-bold text-emerald-400 flex items-center gap-1">
                    <span>Android App</span>
                  </div>

                </div>
              </motion.div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* Floating Overlays: Live Notification & Fast Sync Pills     */}
              {/* ────────────────────────────────────────────────────────── */}
              {/* Floating Live Push Notification */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute -top-4 left-0 sm:-left-6 z-30 p-3 rounded-2xl bg-slate-900/90 border border-corp-cyan/40 backdrop-blur-xl shadow-[0_15px_30px_rgba(0,0,0,0.6)] flex items-center gap-3 max-w-[260px]"
              >
                <div className="w-8 h-8 rounded-xl bg-corp-cyan/20 border border-corp-cyan/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <BellRing className="w-4 h-4 animate-bounce" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-bold text-white flex items-center gap-1">
                    <span>Bon validé</span>
                    <span className="text-cyan-400 font-black">• 18 450 DT</span>
                  </div>
                  <div className="text-[8px] text-slate-300 truncate">
                    Ste Bois & Dérivés • Synchronisé
                  </div>
                </div>
              </motion.div>

              {/* Floating Live Sync Speed Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="absolute -bottom-2 right-0 sm:-right-4 z-30 px-3.5 py-2 rounded-2xl bg-[#08152B]/90 border border-corp-blue-400/40 backdrop-blur-xl shadow-[0_15px_30px_rgba(0,0,0,0.6)] flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-corp-cyan animate-pulse" />
                <div className="text-left">
                  <span className="text-[10px] font-black text-white block leading-none">Sync Cloud ↔ Mobile</span>
                  <span className="text-[8px] font-bold text-cyan-300">Latence &lt; 500ms</span>
                </div>
              </motion.div>

            </div>

          </div>

        </div>

      </div>

      {/* ── Mobile Access Request Dialog Modal ── */}
      <MobileRequestDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />

    </section>
  );
}
