'use client';

import React from 'react';
import { useTenantStore } from '@/store/use-tenant-store';
import { ShieldAlert, Mail, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function SuspendedPage() {
  const name = useTenantStore((state: any) => state.name);
  const logoUrl = useTenantStore((state: any) => state.logoUrl);
  const primaryColor = useTenantStore((state: any) => state.primaryColor) || '#3B82F6';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-900 text-white px-4 relative overflow-hidden font-sans">
      {/* Dynamic background glow */}
      <div 
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2 opacity-20 -z-10 transition-colors duration-1000"
        style={{ backgroundColor: primaryColor }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 -z-10" />

      <div className="w-full max-w-lg text-center space-y-8 animate-in fade-in slide-in-from-top-6 duration-1000">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center space-y-4">
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="h-16 md:h-20 object-contain drop-shadow-2xl" />
          ) : (
            <div 
              className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl transition-transform hover:scale-105 duration-300"
              style={{ color: primaryColor }}
            >
              <ShieldAlert className="w-12 h-12" />
            </div>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight mt-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            {name}
          </h1>
        </div>

        {/* Notice Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div 
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ backgroundColor: primaryColor }}
          />
          
          <div className="space-y-6">
            <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-slate-100">Espace Temporairement Suspendu</h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
                Votre accès à la plateforme Élancé a été suspendu. Cela est généralement dû à une expiration de période d'essai ou à une facture impayée.
              </p>
            </div>

            <div className="h-px bg-white/[0.06] w-full" />

            <div className="flex flex-col gap-3">
              <a 
                href="mailto:support@acya.site" 
                className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl text-white text-sm font-semibold transition-all duration-300 border border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.98]"
              >
                <Mail className="w-4 h-4" />
                Contacter le support client
              </a>
              <Link 
                href="/login" 
                className="text-xs text-slate-500 hover:text-slate-350 hover:underline transition-colors mt-2"
              >
                Retourner à la page de connexion
              </Link>
            </div>
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
