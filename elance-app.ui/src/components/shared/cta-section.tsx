'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-24 px-6 md:px-10 bg-forest-900 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-timber-400/10 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="max-w-[800px] mx-auto text-center relative z-10"
      >
        <div className="inline-block text-[0.75rem] font-bold tracking-[0.2em] text-timber-400 uppercase mb-6">
          Contactez-nous aujourd'hui
        </div>
        <h2 className="font-heading text-[2.2rem] md:text-[3.2rem] text-white leading-[1.1] mb-8 tracking-tight">
          Prêt à propulser votre entreprise <br className="hidden md:block" /> vers de <em className="italic text-timber-400 not-italic">nouveaux sommets</em> ?
        </h2>
        <p className="text-[1rem] md:text-[1.1rem] leading-relaxed text-white/60 mb-12 max-w-[600px] mx-auto">
          Demandez une démonstration personnalisée et découvrez comment Élancé s'adapte à vos processus métier pour une efficacité optimale.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-5">
          <Button asChild className="h-16 px-10 rounded-xl bg-forest-600 text-white hover:bg-forest-800 hover:scale-105 active:scale-95 text-[1rem] font-bold shadow-2xl shadow-forest-900/40 transition-all duration-300">
            <Link href="/register">Planifier une démo gratuite</Link>
          </Button>
          <Button asChild variant="outline" className="h-16 px-10 rounded-xl border-white/20 text-white hover:bg-white/10 hover:border-white transition-all duration-300 text-[1rem] font-bold">
            <Link href="#contact">Nous contacter</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
