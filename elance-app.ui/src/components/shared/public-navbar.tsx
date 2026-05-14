'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/use-auth-store';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function PublicNavbar() {
  const { isAuthenticated } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    { name: 'Modules', href: '#modules' },
    { name: 'Chantiers', href: '#chantiers' },
    { name: 'Pourquoi Élancé', href: '#pourquoi' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
      isScrolled 
        ? "bg-sand-50/90 backdrop-blur-xl border-b border-forest-100 py-3 shadow-[0_2px_20px_rgba(11,59,36,0.05)]" 
        : "bg-transparent py-5"
    )}>
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <svg className="w-8 h-8 md:w-9 md:h-9 transition-transform duration-500 group-hover:rotate-[360deg]" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="17" stroke="url(#ng_nav_refine)" strokeWidth="1.5"/>
              <rect x="15.5" y="10" width="5" height="12" rx="2.5" fill="url(#ng_nav_refine)"/>
              <polygon points="18,6 10,15.5 26,15.5" fill="url(#ng_nav_refine)"/>
              <rect x="14" y="24" width="8" height="2" rx="1" fill="#1D9E75"/>
              <rect x="11" y="28" width="14" height="2" rx="1" fill="#94A3B8"/>
              <defs>
                <linearGradient id="ng_nav_refine" x1="0" y1="0" x2="36" y2="36">
                  <stop offset="0%" stopColor="#534AB7"/>
                  <stop offset="100%" stopColor="#1D9E75"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="text-xl md:text-2xl font-bold font-heading text-forest-800 tracking-tight transition-colors group-hover:text-forest-600">
            Élancé
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10 ml-auto">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href}
              className="text-[0.88rem] font-medium text-sand-400 hover:text-forest-600 transition-all duration-300 relative group/link"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-timber-400 transition-all duration-300 group-hover/link:w-full" />
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4 ml-10">
          <Link 
            href="/login" 
            className="text-[0.88rem] font-medium text-forest-600 hover:text-forest-800 transition-colors px-4 py-2"
          >
            Se connecter
          </Link>
          <Button asChild className="h-10 px-6 rounded-lg bg-forest-600 text-white hover:bg-forest-800 hover:scale-105 transition-all duration-300 shadow-md shadow-forest-600/10 active:scale-95">
            <Link href="/register">Demander une démo</Link>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 rounded-full hover:bg-forest-50 transition-colors text-forest-800"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[110] md:hidden bg-sand-50"
          >
            <div className="flex flex-col h-full p-8 pt-24 relative">
              <button 
                className="absolute top-6 right-6 p-2 text-forest-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X size={32} />
              </button>

              <div className="space-y-8">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                  >
                    <Link 
                      href={link.href}
                      className="text-4xl font-heading font-bold text-forest-900 flex items-center justify-between group"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.name}
                      <ArrowRight className="opacity-0 -translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="mt-auto space-y-4">
                <div className="h-px bg-forest-100 mb-8" />
                <Button asChild variant="outline" className="w-full h-14 text-lg border-forest-100 text-forest-600 rounded-xl">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Se connecter</Link>
                </Button>
                <Button asChild className="w-full h-14 text-lg bg-forest-600 hover:bg-forest-800 rounded-xl">
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>Demander une démo</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
