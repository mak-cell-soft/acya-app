'use client';

import { PublicNavbar } from "@/components/shared/public-navbar";
import { PublicFooter } from "@/components/shared/public-footer";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, Send } from "lucide-react";
import { motion } from "framer-motion";

export default function ContactPage() {
  return (
    <main className="flex flex-col min-h-screen bg-slate-50 selection:bg-corp-blue-500/20">
      <PublicNavbar />
      
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-32 md:py-40 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        
        {/* Left Side: Contact Info */}
        <div className="flex flex-col justify-center">
          <Link href="/" className="inline-flex items-center text-sm font-bold text-corp-blue-600 hover:text-corp-blue-700 mb-8 transition-colors w-max">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
              Discutons de votre <span className="text-transparent bg-clip-text bg-gradient-to-r from-corp-blue-600 to-corp-cyan">projet</span>.
            </h1>
            <p className="text-lg text-slate-600 font-medium leading-relaxed mb-12 max-w-md">
              Que ce soit pour une démonstration de l'ERP Élancé ou pour toute autre question, l'équipe ACYA Consulting est à votre écoute.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 text-corp-blue-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Email</h3>
                  <a href="mailto:medamine.klabi@gmail.com" className="text-lg font-bold text-slate-900 hover:text-corp-blue-600 transition-colors">
                    medamine.klabi@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 text-corp-blue-600">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Téléphone</h3>
                  <a href="tel:+21699218866" className="text-lg font-bold text-slate-900 hover:text-corp-blue-600 transition-colors">
                    +216 99 218 866
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 text-corp-blue-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Siège Social</h3>
                  <p className="text-lg font-bold text-slate-900">
                    ACYA Consulting<br />Tunisie
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Contact Form */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-3xl p-8 md:p-10 shadow-[0_20px_60px_rgba(37,99,235,0.05)] border border-slate-100"
        >
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Prénom</label>
                <input 
                  type="text" 
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-corp-blue-500 focus:ring-2 focus:ring-corp-blue-500/20 outline-none transition-all font-medium text-slate-800"
                  placeholder="Jean"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nom</label>
                <input 
                  type="text" 
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-corp-blue-500 focus:ring-2 focus:ring-corp-blue-500/20 outline-none transition-all font-medium text-slate-800"
                  placeholder="Dupont"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email professionnel</label>
              <input 
                type="email" 
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-corp-blue-500 focus:ring-2 focus:ring-corp-blue-500/20 outline-none transition-all font-medium text-slate-800"
                placeholder="jean@entreprise.com"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Entreprise</label>
              <input 
                type="text" 
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-corp-blue-500 focus:ring-2 focus:ring-corp-blue-500/20 outline-none transition-all font-medium text-slate-800"
                placeholder="Votre entreprise"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Message</label>
              <textarea 
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-corp-blue-500 focus:ring-2 focus:ring-corp-blue-500/20 outline-none transition-all font-medium text-slate-800 min-h-[120px] resize-y"
                placeholder="Comment pouvons-nous vous aider ?"
              />
            </div>

            <button 
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-corp-blue-600 to-corp-blue-700 hover:from-corp-blue-500 hover:to-corp-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-corp-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Envoyer le message
              <Send className="w-4 h-4" />
            </button>
          </form>
        </motion.div>

      </div>

      <PublicFooter />
    </main>
  );
}
