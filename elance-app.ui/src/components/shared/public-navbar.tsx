'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/use-auth-store';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// NOTE: Public navbar for the ACYA public landing pages.
// Designed with a compact profile, subtle micro-badges, and high visual hierarchy.
export function PublicNavbar() {
  const { isAuthenticated } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [isMainDomain, setIsMainDomain] = useState(true);

  // Intent: Track scroll position to transition from transparent dark aesthetic to crisp light backdrop
  useEffect(() => {
    const handleScroll = () => {
      // Intent: Trigger background shift early (scrollY > 15) for smooth perceived transition
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);

    // Intent: Tenant domain detection to toggle between Registration and Login routes
    const hostname = window.location.hostname;
    const searchParams = new URLSearchParams(window.location.search);
    const hasTenantQuery = searchParams.has('tenant');
    const main = (hostname === 'acya.site' || hostname === 'www.acya.site' || hostname === 'localhost' || hostname === '127.0.0.1') && !hasTenantQuery;
    setIsMainDomain(main);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intent: Prevent background scrolling while the mobile navigation drawer is active
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  // NOTE: Navigation configuration. 'isNew' flags represent recently launched modules.
  const navLinks = [
    { name: 'Modules', href: '#modules' },
    { name: 'Chantiers', href: '#chantiers' },
    { name: 'Intégration Qwerty', href: '#integration-qwerty', isNew: true },
    { name: 'App Mobile', href: '#mobile-app', isNew: true },
    { name: 'Tarifs', href: '#tarifs' },
    { name: 'Pourquoi ACYA', href: '#pourquoi' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col w-full pointer-events-auto">
      {/* ── Top Announcement Banner: Compact 1-line layout with subtle micro-indicator ── */}
      <AnimatePresence initial={false}>
        {isBannerVisible && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full bg-gradient-to-r from-corp-blue-700 via-corp-blue-600 to-corp-cyan text-white text-[11px] sm:text-xs py-1.5 px-4 relative flex items-center justify-center font-sans tracking-tight shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 text-center pr-7 max-w-full truncate">
              {/* Micro pulse status dot */}
              <span className="flex h-1.5 w-1.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded leading-none shrink-0">
                Nouveau
              </span>
              <span className="font-medium text-white/95 truncate">
                Intégration directe avec Qwerty pour vos comptables & offre à 450 DT / an.
              </span>
              <Link 
                href="#integration-qwerty" 
                className="underline font-bold hover:text-cyan-200 transition-colors ml-1 inline-flex items-center gap-0.5 shrink-0 group/banner"
              >
                Découvrir
                <ArrowRight size={11} className="transition-transform group-hover/banner:translate-x-0.5" />
              </Link>
            </div>
            {/* Banner dismiss button */}
            <button 
              onClick={() => setIsBannerVisible(false)}
              className="absolute right-3 p-1 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors flex items-center justify-center"
              aria-label="Fermer l'annonce"
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Compact Navbar ── */}
      <nav className={cn(
        "w-full transition-all duration-300",
        // Intent: Reduced vertical padding (py-2 when scrolled, py-2.5 / py-3 unscrolled) for a sleek, non-intrusive height
        isScrolled 
          ? "bg-white/95 backdrop-blur-xl border-b border-slate-200/80 py-2 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]" 
          : "bg-slate-950/35 backdrop-blur-md border-b border-white/10 py-2.5 sm:py-3"
      )}>
        <div className="max-w-[1240px] mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8">
          {/* Logo & Brand Identity */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className={cn(
              "relative flex items-center justify-center p-1 rounded-lg transition-all duration-300",
              isScrolled 
                ? "bg-corp-blue-50/70" 
                : "bg-white/[0.08] border border-white/15 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
            )}>
              {/* Structural SVG Logo: Compact 28px/30px sizing */}
              <svg 
                className={cn(
                  "w-7 h-7 sm:w-[30px] sm:h-[30px] transition-transform duration-300 group-hover:scale-105 shrink-0",
                  !isScrolled && "drop-shadow-[0_2px_6px_rgba(59,130,246,0.4)]"
                )} 
                viewBox="0 0 40 40" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="logo_grad_1" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#93C5FD"/>
                    <stop offset="100%" stopColor="#3B82F6"/>
                  </linearGradient>
                  <linearGradient id="logo_grad_2" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#3B82F6"/>
                    <stop offset="100%" stopColor="#2563EB"/>
                  </linearGradient>
                  <linearGradient id="logo_grad_3" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#2563EB"/>
                    <stop offset="100%" stopColor="#1D4ED8"/>
                  </linearGradient>
                </defs>
                <path d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z" fill="url(#logo_grad_1)" />
                <path d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z" fill="url(#logo_grad_2)" />
                <path d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z" fill="url(#logo_grad_3)" />
              </svg>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-xl sm:text-[1.35rem] font-black font-heading tracking-tight transition-colors duration-300 leading-none",
                isScrolled 
                  ? "text-slate-900 group-hover:text-corp-blue-600" 
                  : "text-white group-hover:text-blue-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
              )}>
                Élancé
              </span>
              {/* Secondary ACYA Brand Badge: Subtly proportioned to not compete with logo text */}
              <span className={cn(
                "text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded leading-none transition-colors duration-300",
                isScrolled 
                  ? "bg-slate-100 text-slate-600 border border-slate-200" 
                  : "bg-blue-500/20 text-cyan-300 border border-cyan-400/30"
              )}>
                ACYA
              </span>
            </div>
          </Link>

          {/* Desktop Navigation: Compact gap and refined font sizing for single-row stability across 1366px-1920px */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-6.5 ml-auto">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                className={cn(
                  "text-[0.84rem] xl:text-[0.88rem] font-semibold transition-colors duration-200 relative group/link py-1 px-0.5 flex items-center gap-1.5 whitespace-nowrap",
                  isScrolled 
                    ? "text-slate-600 hover:text-corp-blue-600" 
                    : "text-slate-200 hover:text-white"
                )}
              >
                <span>{link.name}</span>
                {/* Micro-badge: Natural inline pill that does not increase line height */}
                {link.isNew && (
                  <span className={cn(
                    "text-[8.5px] font-bold px-1.5 py-[1.5px] rounded-full uppercase tracking-wider leading-none shrink-0 transition-colors",
                    isScrolled 
                      ? "bg-corp-blue-50 text-corp-blue-600 border border-corp-blue-100" 
                      : "bg-cyan-400/15 text-cyan-300 border border-cyan-400/25"
                  )}>
                    New
                  </span>
                )}
                {/* Hover indicator underline */}
                <span className={cn(
                  "absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] transition-all duration-250 group-hover/link:w-full rounded-full",
                  isScrolled ? "bg-corp-blue-600" : "bg-gradient-to-r from-blue-400 to-cyan-400"
                )} />
              </Link>
            ))}
          </div>

          {/* Action Button: Compact, modern CTA */}
          <div className="hidden lg:flex items-center ml-6 xl:ml-8 shrink-0">
            <Button asChild className={cn(
              "h-8.5 px-4.5 rounded-lg text-xs font-bold transition-all duration-200 relative overflow-hidden group active:scale-[0.96] shadow-sm",
              isScrolled
                ? "bg-gradient-to-r from-corp-blue-600 to-corp-blue-800 text-white hover:from-corp-blue-500 hover:to-corp-blue-700 shadow-corp-blue-900/10"
                : "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_2px_12px_rgba(59,130,246,0.3)] border border-white/20"
            )}>
              <Link href={isMainDomain ? "/enterprise-registration" : "/login"} className="flex items-center gap-1.5">
                {isMainDomain ? "Inscription" : "Connexion"}
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                {/* Subtle light reflection on hover */}
                <span 
                  className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" 
                  style={{ transform: 'skewX(-20deg)' }} 
                />
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle Button: Accessible 40x40 touch target */}
          <button 
            className={cn(
              "lg:hidden p-2 rounded-lg transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center shrink-0",
              isScrolled ? "text-slate-800 hover:bg-slate-100" : "text-white hover:bg-white/10"
            )}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-0 z-[110] lg:hidden bg-white/98 backdrop-blur-2xl border-l border-corp-blue-100/50 flex flex-col"
            >
              {/* Ambient Background Glows */}
              <div className="absolute top-[10%] right-[-10%] w-[280px] h-[280px] rounded-full bg-corp-blue-500/5 blur-[100px] pointer-events-none" />
              <div className="absolute bottom-[20%] left-[-20%] w-[280px] h-[280px] rounded-full bg-corp-cyan/5 blur-[100px] pointer-events-none" />

              <div className="flex flex-col h-full p-6 sm:p-8 pt-20 relative z-10">
                {/* Close Button */}
                <button 
                  className="absolute top-5 right-5 p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Fermer le menu"
                >
                  <X size={20} />
                </button>

                {/* Nav links with clean badges in drawer */}
                <div className="space-y-5 my-auto overflow-y-auto py-4">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.05 }}
                    >
                      <Link 
                        href={link.href}
                        className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 hover:text-corp-blue-600 flex items-center justify-between group transition-colors duration-200 py-1"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="flex items-center gap-2.5">
                          {link.name}
                          {link.isNew && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-corp-blue-50 text-corp-blue-600 border border-corp-blue-100">
                              Nouveau
                            </span>
                          )}
                        </span>
                        <ArrowRight className="opacity-0 -translate-x-3 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 text-corp-blue-600" size={22} />
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Mobile Drawer Bottom Action */}
                <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                  <Button asChild className="w-full h-12 text-base bg-gradient-to-r from-corp-blue-600 to-corp-blue-800 hover:from-corp-blue-500 hover:to-corp-blue-700 text-white font-bold shadow-md shadow-corp-blue-900/10 rounded-xl">
                    <Link href={isMainDomain ? "/enterprise-registration" : "/login"} onClick={() => setIsMobileMenuOpen(false)}>
                      {isMainDomain ? "Inscription" : "Connexion"}
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
}


