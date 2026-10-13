'use client';

import React from 'react';
import Image from 'next/image';
import { ShieldCheck, HardHat, Trees, Factory, CheckCircle2 } from 'lucide-react';

interface AuthBrandPanelProps {
  className?: string;
}

/**
 * Premium Brand Experience Panel for Élancé ERP authentication pages.
 * Integrates public/og-image.png within a dark navy brand atmosphere.
 */
export function AuthBrandPanel({ className = '' }: AuthBrandPanelProps) {
  return (
    <aside
      aria-label="Présentation Élancé ERP"
      className={`hidden lg:flex lg:w-[48%] xl:w-[50%] min-h-screen bg-[#060D1E] text-white flex-col justify-between p-8 xl:p-12 relative overflow-hidden select-none border-r border-white/5 ${className}`}
    >
      {/* ─── Ambient lighting & textures ──────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft cyan glow in top-right to match og-image accent */}
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] bg-cyan-500/12 rounded-full blur-[110px]" />
        
        {/* Soft royal blue glow in bottom-left */}
        <div className="absolute -bottom-32 -left-32 w-[460px] h-[460px] bg-blue-600/15 rounded-full blur-[120px]" />

        {/* Center ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-blue-500/5 rounded-full blur-[90px]" />

        {/* Precision dotted grid texture */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Bottom subtle gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#060D1E] to-transparent" />
      </div>

      {/* ─── Top Header Pill ─────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-[11px] font-semibold text-slate-300 tracking-wide uppercase">
            Plateforme Cloud Entreprise
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Haute Sécurité TLS</span>
        </div>
      </div>

      {/* ─── Center Showcase: Illustration + Copy ────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-6 xl:py-10">
        <div className="w-full max-w-[560px] xl:max-w-[600px] mx-auto space-y-6 xl:space-y-8">
          
          {/* Main Visual: public/og-image.png */}
          <div className="relative group">
            <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.55)] border border-white/10 bg-[#070F22]/90 backdrop-blur-sm transition-transform duration-500 ease-out group-hover:scale-[1.01]">
              <Image
                src="/og-image.png"
                alt="Élancé ERP — Solution de gestion intégrée pour le bois, les chantiers BTP et la production en Tunisie"
                width={1376}
                height={768}
                priority
                sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 48vw, 50vw"
                className="w-full h-auto object-contain block select-none"
              />
            </div>
            {/* Subtle backlight reflection */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-400/10 to-blue-600/10 -z-10 blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          </div>

          {/* Value Proposition Messaging */}
          <div className="space-y-2.5">
            <h2 className="text-xl xl:text-2xl font-bold text-white tracking-tight leading-snug">
              Votre entreprise,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-cyan-200">
                plus simple à piloter.
              </span>
            </h2>
            <p className="text-xs xl:text-sm text-slate-300/80 leading-relaxed font-normal max-w-lg">
              Achats, ventes, stock et gestion opérationnelle : retrouvez votre activité dans un seul espace.
            </p>
          </div>

          {/* Industry Focus Badges */}
          <div className="flex flex-wrap gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/[0.05] border border-white/10 text-slate-300">
              <Trees className="w-3.5 h-3.5 text-amber-400" />
              <span>Négoce & Bois (m³)</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/[0.05] border border-white/10 text-slate-300">
              <HardHat className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chantiers & BTP</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/[0.05] border border-white/10 text-slate-300">
              <Factory className="w-3.5 h-3.5 text-blue-400" />
              <span>Ateliers & Production</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/[0.05] border border-white/10 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Conformité Tunisie</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Footer Reassurance ────────────────────────────────── */}
      <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Élancé ERP par ACYA Technologies</span>
        <span className="text-slate-400/80">Architecture SaaS multi-tenant isolée</span>
      </div>
    </aside>
  );
}
