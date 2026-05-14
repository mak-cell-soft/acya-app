'use client';

import Link from 'next/link';

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-forest-900 pt-24 pb-12 px-6 md:px-10 relative overflow-hidden font-sans">
      {/* Subtle decorative glow */}
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-timber-400/5 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2" />
      
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-16 border-b border-white/5 relative z-10">
        <div className="space-y-6">
          <Link href="/" className="flex items-center gap-3 group">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none" className="transition-transform duration-500 group-hover:rotate-[360deg]">
              <circle cx="18" cy="18" r="17" stroke="#9FE1CB" strokeWidth="1.5"/>
              <rect x="15.5" y="10" width="5" height="12" rx="2.5" fill="#9FE1CB"/>
              <polygon points="18,6 10,15.5 26,15.5" fill="#9FE1CB"/>
              <rect x="14" y="24" width="8" height="2" rx="1" fill="#1D9E75"/>
              <rect x="11" y="28" width="14" height="2" rx="1" fill="#94A3B8"/>
            </svg>
            <span className="text-2xl font-heading font-bold text-white tracking-tight">Élancé</span>
          </Link>
          <p className="text-[0.92rem] leading-relaxed text-white/40 max-w-[280px]">
            L'ERP spécialisé pour les entreprises du secteur bois, matériaux et construction. Propulsé par ACYA Consulting.
          </p>
          <div className="flex gap-4">
            {['In', 'Tw', 'Fb'].map(s => (
              <Link key={s} href="#" className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-[0.75rem] font-bold text-white/40 hover:bg-forest-600 hover:text-white hover:border-forest-600 transition-all duration-300">
                {s}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-timber-400 mb-8">
            Modules
          </h4>
          <div className="flex flex-col gap-4">
            {['Articles & M³', 'Achats & Ventes', 'Gestion Chantiers', 'Flotte Automobile', 'Comptabilité'].map(item => (
              <Link key={item} href="#" className="text-[0.9rem] text-white/50 hover:text-white hover:translate-x-1 transition-all duration-300">
                {item}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-timber-400 mb-8">
            Secteurs
          </h4>
          <div className="flex flex-col gap-4">
            {['Négoce bois', 'Matériaux BTP', 'Construction', 'Menuiserie'].map(item => (
              <Link key={item} href="#" className="text-[0.9rem] text-white/50 hover:text-white hover:translate-x-1 transition-all duration-300">
                {item}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-timber-400 mb-8">
            ACYA Consulting
          </h4>
          <div className="flex flex-col gap-4">
            {['À propos', 'Nos références', 'Demander une démo', 'Contact'].map(item => (
              <Link key={item} href="#" className="text-[0.9rem] text-white/50 hover:text-white hover:translate-x-1 transition-all duration-300">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto pt-10 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
        <p className="text-[0.75rem] text-white/20 font-bold uppercase tracking-widest">
          © {currentYear} ACYA Consulting. Tous droits réservés.
        </p>
        <div className="flex items-center gap-6">
          <Link href="#" className="text-[0.72rem] text-white/20 hover:text-white transition-colors font-bold uppercase tracking-widest">Confidentialité</Link>
          <Link href="#" className="text-[0.72rem] text-white/20 hover:text-white transition-colors font-bold uppercase tracking-widest">Mentions Légales</Link>
          <span className="text-[0.7rem] font-bold uppercase tracking-widest text-timber-400/60 border border-timber-600/10 px-3 py-1.5 rounded-xl">
            AChieve Your Ambition
          </span>
        </div>
      </div>
    </footer>
  );
}
