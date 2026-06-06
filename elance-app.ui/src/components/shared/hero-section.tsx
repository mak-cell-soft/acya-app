'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Check, Sparkles, TrendingUp, Layers, ShieldCheck, Play, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HeroSection() {
  const [activeTab, setActiveTab] = useState<'interactive' | 'mockup'>('interactive');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    }
  };

  const floatAnimation = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 5,
        ease: 'easeInOut' as const,
        repeat: Infinity
      }
    }
  };

  const floatAnimationDelayed = {
    animate: {
      y: [0, -12, 0],
      transition: {
        duration: 6,
        ease: 'easeInOut' as const,
        repeat: Infinity,
        delay: 1
      }
    }
  };

  const orbitAnimation = {
    animate: {
      rotate: 360,
      transition: {
        duration: 25,
        ease: 'linear' as const,
        repeat: Infinity
      }
    }
  };

  return (
    <section className="relative min-h-[95vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 pt-32 pb-20">
      {/* Premium Multi-layered Glow Mesh */}
      <div className="absolute top-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.08)_0%,transparent_65%)] pointer-events-none blur-[60px]" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.06)_0%,transparent_65%)] pointer-events-none blur-[60px]" />

      {/* Decorative Interactive Grid in background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      <div className="max-w-[1250px] mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center w-full relative z-10">

        {/* Left Side: Advanced Copywriting & Conversion Triggers */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-6 space-y-8 text-center lg:text-left"
        >


          {/* Majestic Heading with Dual-Tone Gradients */}
          <motion.h1 variants={itemVariants} className="text-[2.6rem] sm:text-[3.2rem] md:text-[3.8rem] lg:text-[4rem] leading-[1.1] text-slate-900 font-extrabold tracking-tight">
            Propulsez la gestion de votre négoce et <span className="bg-gradient-to-r from-corp-blue-600 via-corp-blue-700 to-corp-cyan bg-clip-text text-transparent">vos chantiers</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-[1.05rem] md:text-[1.12rem] leading-relaxed text-slate-600 max-w-[560px] mx-auto lg:mx-0 font-medium">
            Élancé automatise vos flux de matières (M³), achats, ventes, facturation BTP et flotte logistique au sein du premier ERP conçu par ACYA Consulting.
          </motion.p>

          {/* Trust Value Propositions Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[500px] mx-auto lg:mx-0 pt-2 text-left">
            {[
              { icon: <TrendingUp size={18} className="text-corp-blue-600" />, text: "ROI Chantiers accru de 28%" },
              { icon: <Layers size={18} className="text-corp-cyan" />, text: "Métrique M³ automatisée" },
              { icon: <ShieldCheck size={18} className="text-emerald-500" />, text: "Conforme BTP & Factur-X" },
              { icon: <Sparkles size={18} className="text-amber-500" />, text: "Zéro double-saisie garantie" }
            ].map((prop, idx) => (
              <div key={idx} className="flex items-center gap-2.5 bg-white border border-slate-100 rounded-xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.015)] transition-all hover:border-corp-blue-100 hover:shadow-md hover:scale-[1.02]">
                <div className="p-1.5 rounded-lg bg-slate-50">
                  {prop.icon}
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">{prop.text}</span>
              </div>
            ))}
          </motion.div>

          {/* Action CTAs with Interactive Anchors */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
            <Button asChild className="h-14 px-8 bg-gradient-to-r from-corp-blue-600 to-corp-blue-800 hover:from-corp-blue-500 hover:to-corp-blue-700 text-white font-bold text-[1rem] transition-all duration-300 shadow-lg shadow-corp-blue-900/15 hover:scale-[1.03] active:scale-[0.97] group">
              <Link href="/register" className="flex items-center gap-2">
                Essai Gratuit 14 Jours
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-14 px-8 border-slate-200 bg-white text-slate-700 hover:border-corp-blue-600 hover:text-corp-blue-600 text-[1rem] font-bold transition-all duration-300 shadow-sm hover:scale-[1.02] active:scale-[0.98] group">
              <Link href="#modules" className="flex items-center gap-2">
                <Play size={16} className="fill-current text-slate-400 group-hover:text-corp-blue-600" />
                Voir la Démo Vidéo
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Right Side: Spectacular Interactive SaaS Dashboard Mockup */}
        <div className="lg:col-span-6 flex flex-col items-center w-full relative">

          {/* Animated decorative ring behind dashboard */}
          <motion.div
            variants={orbitAnimation}
            animate="animate"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-dashed border-corp-blue-200/40 rounded-full pointer-events-none hidden md:block"
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-tr from-corp-blue-500/5 to-corp-cyan/5 blur-3xl rounded-full pointer-events-none" />

          {/* Main Elevated Glassmorphic Dashboard Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, type: 'spring', stiffness: 70 }}
            className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-[0_30px_100px_-20px_rgba(3,10,28,0.1)] overflow-hidden relative z-10"
          >
            {/* Window header representing high-fidelity software */}
            <div className="bg-slate-50/80 border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-400" />
                <span className="w-3.5 h-3.5 rounded-full bg-amber-400" />
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-400" />
              </div>

              {/* Premium Tab Switcher */}
              <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 shadow-inner">
                <button
                  onClick={() => setActiveTab('interactive')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[0.72rem] font-bold transition-all duration-300 cursor-pointer",
                    activeTab === 'interactive'
                      ? "bg-white text-corp-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Planification
                </button>
                <button
                  onClick={() => setActiveTab('mockup')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[0.72rem] font-bold transition-all duration-300 cursor-pointer",
                    activeTab === 'mockup'
                      ? "bg-white text-corp-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Vue Globale
                </button>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-lg px-4.5 py-1 text-[0.72rem] text-slate-500 font-bold tracking-wide w-40 text-center shadow-inner flex items-center justify-center gap-1.5 self-end sm:self-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                app.elance.acya.fr
              </div>
            </div>

            {/* Dynamic Tab Body */}
            <AnimatePresence mode="wait">
              {activeTab === 'interactive' ? (
                <motion.div
                  key="interactive-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 md:p-8 space-y-6"
                >
                  {/* Top stats block */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "M³ Stockés", val: "1,840 m³", pct: "+12.4%", color: "text-corp-blue-600" },
                      { label: "Ventes Bois", val: "94,200 €", pct: "+8.2%", color: "text-emerald-500" },
                      { label: "Urgences BTP", val: "2 alertes", pct: "Stable", color: "text-rose-500" }
                    ].map((st, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-left">
                        <span className="text-[0.68rem] font-bold text-slate-400 uppercase tracking-wider block">{st.label}</span>
                        <span className="text-sm sm:text-[1.15rem] font-extrabold text-slate-800 block mt-1 leading-none">{st.val}</span>
                        <span className={cn("text-[0.65rem] font-extrabold block mt-1.5", st.color)}>{st.pct}</span>
                      </div>
                    ))}
                  </div>

                  {/* Chart Mock Row */}
                  <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-5 text-left space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Planification des Livraisons Chantiers</span>
                      <span className="text-[0.7rem] font-extrabold text-corp-blue-600 bg-corp-blue-50 px-2.5 py-1 rounded-md">Temps Réel</span>
                    </div>
                    {/* Visual SVG Chart Bar lines */}
                    <div className="h-28 flex items-end justify-between gap-3 pt-4">
                      {[45, 65, 80, 55, 95, 70, 85, 110, 90, 105].map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center group cursor-pointer">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${val}%` }}
                            transition={{ delay: 0.1 + i * 0.04, duration: 0.8, ease: 'easeOut' }}
                            className={cn(
                              "w-full rounded-t-md transition-all duration-300 relative group-hover:brightness-105 shadow-sm",
                              i === 7 ? "bg-corp-cyan" : "bg-corp-blue-600"
                            )}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[0.62rem] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none leading-none">
                              {val * 12}m³
                            </div>
                          </motion.div>
                          <span className="text-[0.6rem] font-bold text-slate-400 mt-2 block">J-{10 - i}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Connected Active Trucks List */}
                  <div className="bg-white border border-slate-150 rounded-2xl p-4 text-left space-y-3.5 shadow-sm">
                    <span className="text-xs font-extrabold text-slate-800 block">Flotte de Livraison active (ACYA-Log)</span>
                    <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="font-bold text-slate-800">Camion #04 (Pin & Sapin)</span>
                      </div>
                      <span className="font-bold text-slate-500">En transit (14.2 M³)</span>
                      <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">98% Livré</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="mockup-tab"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 bg-slate-50/50 relative overflow-hidden group/img aspect-[4/3] flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-corp-blue-500/5 to-transparent pointer-events-none z-10" />
                  <img
                    src="/elance_saas_metrics.png"
                    alt="Élancé ERP Tableau de Bord"
                    className="w-full h-full object-cover rounded-2xl border border-slate-200/60 shadow-md group-hover/img:scale-[1.015] transition-transform duration-700 ease-out"
                  />

                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Floating Metric Badge 1: ROI */}
          <motion.div
            variants={floatAnimation}
            animate="animate"
            className="absolute top-[18%] left-[-8%] hidden md:flex items-center gap-3 bg-white border border-slate-150 rounded-2xl p-4.5 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.06)] z-20 hover:scale-105 transition-transform cursor-default"
          >
            <div className="w-10 h-10 rounded-xl bg-corp-blue-50 flex items-center justify-center text-corp-blue-600">
              <TrendingUp size={22} />
            </div>
            <div className="text-left leading-none">
              <span className="text-[0.68rem] font-bold text-slate-400 uppercase tracking-wider block">ROI Client</span>
              <span className="text-[1.2rem] font-black text-slate-900 mt-1 block">+28%</span>
            </div>
          </motion.div>

          {/* Floating Metric Badge 2: Multi-Sector */}
          <motion.div
            variants={floatAnimationDelayed}
            animate="animate"
            className="absolute bottom-[12%] right-[-8%] hidden md:flex items-center gap-3 bg-white border border-slate-150 rounded-2xl p-4.5 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.06)] z-20 hover:scale-105 transition-transform cursor-default"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-corp-cyan">
              <Layers size={22} />
            </div>
            <div className="text-left leading-none">
              <span className="text-[0.68rem] font-bold text-slate-400 uppercase tracking-wider block">Volume Scié</span>
              <span className="text-[1.12rem] font-black text-slate-900 mt-1 block">4,812 M³ / mois</span>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}

