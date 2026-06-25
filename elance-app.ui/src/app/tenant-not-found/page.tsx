'use client';

import React from 'react';
import { Building2, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TenantNotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-900 text-white px-4 relative overflow-hidden font-sans">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full blur-[160px] -translate-x-1/2 -translate-y-1/2 opacity-15 -z-10 bg-red-500" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 -z-10" />

      <div className="w-full max-w-lg text-center space-y-8 animate-in fade-in slide-in-from-top-6 duration-1000">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
            <Building2 className="w-14 h-14 text-red-400" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest">
            Espace introuvable
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Cette entreprise n&apos;existe plus
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            L&apos;espace que vous tentez d&apos;accéder a été supprimé ou n&apos;a jamais été enregistré sur notre plateforme.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-rose-600" />

          <div className="space-y-5">
            <p className="text-slate-300 text-sm leading-relaxed">
              Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, contactez votre administrateur ou le support ACYA.
            </p>

            <a
              href="mailto:support@acya.site"
              className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl text-white text-sm font-semibold transition-all duration-300 border border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.98]"
            >
              <Mail className="w-4 h-4" />
              Contacter le support ACYA
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-600">
          Élancé SaaS Engine v2.0 • Propulsé par ACYA Consulting
        </p>
      </div>
    </div>
  );
}
