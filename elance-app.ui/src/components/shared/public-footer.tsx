'use client';

import Link from 'next/link';
import { ArrowRight, Mail, Shield, CheckCircle, RefreshCw } from 'lucide-react';

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-[#F3F6FC] via-white to-[#F8FAFC] pt-24 pb-12 px-6 md:px-10 relative overflow-hidden font-sans border-t border-corp-blue-100/50">
      {/* Soft Premium Ambient Glows in light mode */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-corp-cyan/5 rounded-full blur-[130px] translate-x-1/4 -translate-y-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-corp-blue-500/5 rounded-full blur-[140px] -translate-x-1/4 translate-y-1/4 pointer-events-none" />
      
      <div className="max-w-[1250px] mx-auto relative z-10">
        
        {/* Elevated Floating Newsletter / CTA Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-corp-blue-100/80 rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_rgba(37,99,235,0.05)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-16 transition-all hover:shadow-[0_20px_60px_rgba(37,99,235,0.08)] hover:border-corp-blue-200/80">
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-corp-blue-500/10 border border-corp-blue-500/20 text-xs font-bold tracking-wider text-corp-blue-700 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-corp-cyan animate-pulse" />
              Optimisez votre rentabilité
            </div>
            <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Prêt à propulser votre entreprise ?
            </h3>
            <p className="text-[0.95rem] text-slate-600 max-w-[580px] leading-relaxed font-semibold">
              Rejoignez les leaders du secteur bois, négoce et chantiers qui automatisent leurs processus et accélèrent leur croissance avec Élancé.
            </p>
          </div>
          
          <div className="lg:col-span-5 w-full">
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="email" 
                  placeholder="Votre adresse email professionnelle"
                  className="w-full h-12 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-corp-blue-600 focus:ring-1 focus:ring-corp-blue-600/10 outline-none rounded-xl pl-11 pr-4 text-[0.88rem] text-slate-800 placeholder-slate-400/80 font-bold transition-all"
                  required
                />
              </div>
              <button 
                type="submit"
                className="h-12 px-6 bg-gradient-to-r from-corp-blue-600 to-corp-blue-800 hover:from-corp-blue-500 hover:to-corp-blue-700 text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-corp-blue-900/10 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Nous contacter
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* High-Impact Trust & Compliance Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12 mb-12 border-b border-slate-100">
          {[
            { 
              icon: <Shield className="w-6 h-6 text-corp-blue-650" />, 
              title: "Souveraineté & Sécurité", 
              desc: "Données 100% hébergées en France. Chiffrement de niveau bancaire et sauvegardes horaires." 
            },
            { 
              icon: <CheckCircle className="w-6 h-6 text-corp-cyan" />, 
              title: "Conformité & RGPD", 
              desc: "Parfaitement aligné aux exigences RGPD et aux normes de facturation BTP (Factur-X)." 
            },
            { 
              icon: <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin-slow" />, 
              title: "Uptime & Support", 
              desc: "SLA garanti à 99.9%. Service technique ultra-réactif basé en France disponible 24/7." 
            }
          ].map((trust, idx) => (
            <div key={idx} className="flex gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-corp-blue-100 transition-all">
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-center h-12 w-12 shrink-0">
                {trust.icon}
              </div>
              <div className="space-y-1 text-left">
                <h4 className="text-[0.9rem] font-bold text-slate-800">{trust.title}</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{trust.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-16 border-b border-slate-100">
          <div className="space-y-6 text-left">
            <Link href="/" className="flex items-center gap-3 group w-max">
              <svg className="w-8.5 h-8.5 transition-transform duration-700 group-hover:rotate-[360deg]" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="10" fill="url(#foot_logo_bg)" className="opacity-10" />
                <path d="M20 3L35 11.5V28.5L20 37L5 28.5V11.5L20 3" stroke="url(#foot_logo_stroke)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 9L31 17.25L27 20.25L20 15L13 20.25L9 17.25L20 9Z" fill="url(#foot_logo_stroke)"/>
                <rect x="17.5" y="18" width="5" height="11" rx="1.5" fill="url(#foot_logo_stroke)" />
                <path d="M12 25H28" stroke="url(#foot_logo_stroke)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 29H26" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="foot_logo_bg" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#2563EB"/>
                    <stop offset="100%" stopColor="#06B6D4"/>
                  </linearGradient>
                  <linearGradient id="foot_logo_stroke" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#3B82F6"/>
                    <stop offset="60%" stopColor="#2563EB"/>
                    <stop offset="100%" stopColor="#06B6D4"/>
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-2xl font-heading font-bold text-slate-800 tracking-tight">Élancé</span>
            </Link>
            <p className="text-[0.9rem] leading-relaxed text-slate-500 max-w-[280px] font-semibold">
              L'ERP de nouvelle génération spécialisé pour le secteur bois, matériaux, négoce et construction. Propulsé par ACYA Consulting.
            </p>
            <div className="flex gap-3">
              {[
                { 
                  icon: (
                    <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.8v8.37h2.8v-4.67c0-.25.02-.5.1-.68a1.14 1.14 0 0 1 1-.77c.76 0 1 .58 1 1.42v4.7h2.8M6.5 8.37a1.37 1.37 0 1 0 0-2.75 1.37 1.37 0 0 0 0 2.75M8 18.5V10.13H5.2v8.37H8" />
                    </svg>
                  ), 
                  href: "#" 
                },
                { 
                  icon: (
                    <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  ), 
                  href: "#" 
                },
                { 
                  icon: (
                    <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.95z" />
                    </svg>
                  ), 
                  href: "#" 
                }
              ].map((s, idx) => (
                <Link 
                  key={idx} 
                  href={s.href} 
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:bg-corp-blue-600 hover:text-white hover:border-corp-blue-600 hover:shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all duration-300 hover:-translate-y-0.5"
                >
                  {s.icon}
                </Link>
              ))}
            </div>
          </div>

          <div className="text-left">
            <h4 className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-corp-blue-700 mb-8">
              Modules
            </h4>
            <div className="flex flex-col gap-4">
              {['Articles & M³', 'Achats & Ventes', 'Gestion Chantiers', 'Flotte Automobile', 'Comptabilité'].map(item => (
                <Link key={item} href="#" className="text-[0.92rem] text-slate-500 hover:text-corp-blue-600 hover:translate-x-1 transition-all duration-300 w-max font-semibold">
                  {item}
                </Link>
              ))}
            </div>
          </div>

          <div className="text-left">
            <h4 className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-corp-blue-700 mb-8">
              Secteurs
            </h4>
            <div className="flex flex-col gap-4">
              {['Négoce bois', 'Matériaux BTP', 'Construction', 'Menuiserie'].map(item => (
                <Link key={item} href="#" className="text-[0.92rem] text-slate-500 hover:text-corp-blue-600 hover:translate-x-1 transition-all duration-300 w-max font-semibold">
                  {item}
                </Link>
              ))}
            </div>
          </div>

          <div className="text-left">
            <h4 className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-corp-blue-700 mb-8">
              ACYA Consulting
            </h4>
            <div className="flex flex-col gap-4">
              {['À propos', 'Nos références', 'Demander une démo', 'Contact'].map(item => (
                <Link key={item} href="#" className="text-[0.92rem] text-slate-500 hover:text-corp-blue-600 hover:translate-x-1 transition-all duration-300 w-max font-semibold">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[0.75rem] text-slate-400 font-semibold uppercase tracking-widest">
            © {currentYear} ACYA Consulting. Tous droits réservés.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            <Link href="#" className="text-[0.72rem] text-slate-400 hover:text-corp-blue-600 transition-colors font-semibold uppercase tracking-widest">Confidentialité</Link>
            <Link href="#" className="text-[0.72rem] text-slate-400 hover:text-corp-blue-600 transition-colors font-semibold uppercase tracking-widest">Mentions Légales</Link>
            <span className="text-[0.7rem] font-bold uppercase tracking-widest bg-gradient-to-r from-corp-blue-600 to-corp-cyan bg-clip-text text-transparent border border-corp-blue-500/20 px-3.5 py-1.5 rounded-xl bg-white shadow-sm">
              AChieve Your Ambition
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}


