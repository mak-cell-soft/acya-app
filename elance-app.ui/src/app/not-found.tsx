'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-forest-100/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-timber-100/10 blur-[120px] rounded-full" />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Illustration Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative aspect-square flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl rounded-[48px] border border-white/60 shadow-2xl shadow-forest-900/5 rotate-3 scale-95" />
          <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl rounded-[48px] border border-white/80 shadow-xl shadow-forest-900/5 -rotate-2" />
          
          <div className="relative z-10 w-full h-full p-8">
            <Image
              src="/elance_404_illustration.png"
              alt="404 Not Found"
              width={800}
              height={800}
              className="w-full h-full object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </motion.div>

        {/* Content Section */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-center md:text-left space-y-8"
        >
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-50 border border-forest-100 text-forest-600 text-xs font-bold uppercase tracking-widest"
            >
              <Search className="w-3 h-3" /> Erreur 404
            </motion.div>
            
            <h1 className="text-5xl md:text-6xl font-heading font-bold text-forest-900 tracking-tight leading-[1.1]">
              Page <span className="text-forest-600 underline decoration-timber-100 underline-offset-8">Introuvable</span>
            </h1>
            
            <p className="text-lg text-sand-400 font-medium leading-relaxed max-w-md mx-auto md:mx-0">
              Il semble que les données que vous recherchez aient été déplacées ou n'existent plus dans notre écosystème.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-14 rounded-2xl bg-forest-900 text-white hover:bg-forest-800 shadow-xl shadow-forest-900/20 font-bold px-8 gap-3">
              <Link href="/dashboard">
                <Home className="w-5 h-5" /> Retour au Dashboard
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 rounded-2xl border-forest-100 text-forest-900 hover:bg-forest-50 font-bold px-8 gap-3">
              <Link href="/">
                <ArrowLeft className="w-5 h-5" /> Page d'accueil
              </Link>
            </Button>
          </div>

          <div className="pt-8 border-t border-forest-50 flex items-center justify-center md:justify-start gap-8 opacity-50 grayscale transition-all hover:grayscale-0">
            <div className="text-[0.65rem] font-bold text-sand-300 uppercase tracking-widest">Technologie Élancé</div>
            <div className="w-1.5 h-1.5 rounded-full bg-timber-100" />
            <div className="text-[0.65rem] font-bold text-sand-300 uppercase tracking-widest">© 2026 ERP Pro</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
