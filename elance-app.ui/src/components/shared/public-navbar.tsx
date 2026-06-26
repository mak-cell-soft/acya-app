'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/use-auth-store';
import { Menu, X, ArrowRight, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function PublicNavbar() {
  const { isAuthenticated } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  const navLinks = [
    { name: 'Modules', href: '#modules', isNew: true },
    { name: 'Chantiers', href: '#chantiers' },
    { name: 'Pourquoi Élancé', href: '#pourquoi' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col w-full">
      {/* Top Marketing Banner */}
      <AnimatePresence>
        {isBannerVisible && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="w-full bg-gradient-to-r from-corp-blue-600 via-corp-blue-700 to-corp-cyan text-white text-xs md:text-sm py-2.5 px-4 relative flex items-center justify-center font-sans tracking-wide shadow-sm"
          >
            <div className="flex items-center gap-2 text-center pr-8">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              <span className="font-bold flex items-center gap-1.5">
                Nouveau :
              </span>
              <span className="font-medium text-white/95">
                Élancé v2.0 est arrivé avec la planification de flotte et la gestion des M³ automatisée.
              </span>
              <Link href="#modules" className="underline font-bold hover:text-cyan-200 transition-colors ml-1.5 flex items-center gap-0.5 group/banner">
                Découvrir
                <ArrowRight size={13} className="inline-block transition-transform group-hover/banner:translate-x-0.5" />
              </Link>
            </div>
            <button 
              onClick={() => setIsBannerVisible(false)}
              className="absolute right-4 p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              aria-label="Fermer"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navbar */}
      <nav className={cn(
        "w-full transition-all duration-500",
        isScrolled 
          ? "bg-white/85 backdrop-blur-xl border-b border-corp-blue-100/50 py-3 shadow-[0_10px_35px_-10px_rgba(37,99,235,0.06)]" 
          : "bg-transparent py-5"
      )}>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 md:px-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center">
              {/* Structural SVG Logo */}
              <svg className="w-8.5 h-8.5 md:w-9.5 md:h-9.5 transition-transform duration-700 group-hover:scale-110 drop-shadow-sm" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo_grad_1" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#60A5FA"/>
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
            <span className="text-xl md:text-2xl font-bold font-heading tracking-tight text-slate-900 group-hover:text-corp-blue-600 transition-colors duration-300">
              Élancé
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 ml-auto">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                className="text-[0.88rem] font-bold text-slate-600 hover:text-corp-blue-600 transition-all duration-300 relative group/link py-1.5 px-1 flex items-center gap-1.5"
              >
                {link.name}

                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] transition-all duration-300 group-hover/link:w-full rounded-full bg-corp-blue-600" />
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4 ml-10">
            <Button asChild className="h-10 px-6 rounded-lg text-white font-bold transition-all duration-300 relative overflow-hidden group shadow-md hover:shadow-lg active:scale-95 hover:scale-[1.03] bg-gradient-to-r from-corp-blue-600 to-corp-blue-800 hover:from-corp-blue-500 hover:to-corp-blue-700">
              <Link href="/enterprise-registration" className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                Inscription
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" style={{ transform: 'skewX(-20deg)' }} />
              </Link>
            </Button>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 transition-colors hover:bg-slate-100 text-slate-800"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-0 z-[110] md:hidden bg-white/95 backdrop-blur-2xl border-l border-corp-blue-100/50"
            >
              {/* Ambient Background Glows */}
              <div className="absolute top-[10%] right-[-10%] w-[320px] h-[320px] rounded-full bg-corp-blue-500/5 blur-[110px] pointer-events-none" />
              <div className="absolute bottom-[20%] left-[-20%] w-[320px] h-[320px] rounded-full bg-corp-cyan/5 blur-[110px] pointer-events-none" />

              <div className="flex flex-col h-full p-8 pt-24 relative z-10">
                <button 
                  className="absolute top-6 right-6 p-2.5 bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X size={24} />
                </button>

                <div className="space-y-8 my-auto">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.08 }}
                    >
                      <Link 
                        href={link.href}
                        className="text-3xl sm:text-4xl font-heading font-bold text-slate-800 hover:text-corp-blue-600 flex items-center justify-between group transition-colors duration-300"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="flex items-center gap-3">
                          {link.name}

                        </span>
                        <ArrowRight className="opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 text-corp-blue-600" size={28} />
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-auto space-y-4">
                  <div className="h-px bg-slate-100 mb-8" />
                  <Button asChild className="w-full h-14 text-lg bg-gradient-to-r from-corp-blue-600 to-corp-blue-800 hover:from-corp-blue-500 hover:to-corp-blue-700 text-white font-bold shadow-md shadow-corp-blue-900/10">
                    <Link href="/enterprise-registration" onClick={() => setIsMobileMenuOpen(false)}>Inscription</Link>
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

