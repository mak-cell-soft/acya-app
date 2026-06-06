'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, MessageSquare, Sparkles } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-28 px-6 md:px-10 bg-gradient-to-br from-[#080E1A] via-[#0E1F42] to-[#070D18] relative overflow-hidden">
      {/* Decorative premium meshes and circles */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(6,182,212,0.1)_0%,transparent_70%)] rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(37,99,235,0.08)_0%,transparent_70%)] rounded-full blur-[80px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, type: 'spring', stiffness: 60 }}
        className="max-w-[850px] mx-auto text-center relative z-10 space-y-8"
      >

        
        <h2 className="text-[2.2rem] md:text-[3.4rem] text-white leading-[1.1] font-extrabold tracking-tight">
          Prêt à propulser votre entreprise <br className="hidden md:block" /> vers de <span className="bg-gradient-to-r from-corp-cyan via-corp-blue-300 to-corp-blue-400 bg-clip-text text-transparent">nouveaux sommets</span> ?
        </h2>
        
        <p className="text-[1.02rem] md:text-[1.12rem] leading-relaxed text-slate-400 max-w-[620px] mx-auto font-medium">
          Demandez votre démonstration personnalisée et découvrez comment Élancé s'adapte à vos processus de vente, de sciage et de dispatch logistique.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-5 pt-4">
          <Button asChild className="h-16 px-10 bg-gradient-to-r from-corp-blue-600 to-corp-blue-800 hover:from-corp-blue-500 hover:to-corp-blue-700 text-white font-bold text-[1rem] transition-all duration-300 shadow-2xl shadow-corp-blue-900/30 hover:scale-[1.03] active:scale-[0.97] group cursor-pointer">
            <Link href="/enterprise-registration" className="flex items-center gap-2">
              Planifier une démo gratuite
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-16 px-10 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white transition-all duration-300 text-[1rem] font-bold shadow-lg shadow-black/10 group cursor-pointer">
            <Link href="#contact" className="flex items-center gap-2">
              <MessageSquare size={16} className="text-slate-400 group-hover:text-corp-cyan" />
              Nous contacter
            </Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

