'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitted(true);
      setIsLoading(false);
      toast.success('Reset link sent!');
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4 relative overflow-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#1D9E75_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-[0.03]" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-corp-blue-50/20 via-transparent to-timber-50/20 pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <Link href="/" className="flex items-center gap-3 mb-4 group">
            <svg className="w-12 h-12 transition-transform duration-500 group-hover:rotate-[360deg]" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="17" stroke="url(#fg_fp)" strokeWidth="1.5"/>
              <rect x="15.5" y="10" width="5" height="12" rx="2.5" fill="url(#fg_fp)"/>
              <polygon points="18,6 10,15.5 26,15.5" fill="url(#fg_fp)"/>
              <rect x="14" y="24" width="8" height="2" rx="1" fill="#1D9E75"/>
              <rect x="11" y="28" width="14" height="2" rx="1" fill="#94A3B8"/>
              <defs>
                <linearGradient id="fg_fp" x1="0" y1="0" x2="36" y2="36">
                  <stop offset="0%" stopColor="#534AB7"/>
                  <stop offset="100%" stopColor="#1D9E75"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="text-3xl font-bold text-corp-blue-900 tracking-tight">Élancé</span>
          </Link>
          <div className="h-1 w-12 bg-timber-400 rounded-full" />
        </div>

        <Card className="border-corp-blue-100/50 shadow-2xl shadow-corp-blue-900/5 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl">
          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <CardHeader className="space-y-4 p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-corp-blue-50 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-9 h-9 text-corp-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-corp-blue-900">Vérifiez vos emails</CardTitle>
                  <CardDescription className="text-sand-400 font-medium mt-2">
                    Nous avons envoyé un lien de réinitialisation à<br />
                    <span className="font-bold text-corp-blue-600 underline decoration-timber-400/30 underline-offset-4">{email}</span>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-4">
                <p className="text-sm text-sand-400 text-center font-medium leading-relaxed">
                  Vous n'avez pas reçu l'email ? Vérifiez vos spams ou{' '}
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-corp-blue-600 font-bold hover:text-corp-blue-800 transition-colors"
                  >
                    réessayez avec une autre adresse
                  </button>
                </p>
              </CardContent>
              <CardFooter className="p-8 pt-6">
                <Button asChild variant="outline" className="w-full h-12 border-corp-blue-100 text-corp-blue-600 hover:bg-corp-blue-50 font-bold">
                  <Link href="/login" className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Retour à la connexion
                  </Link>
                </Button>
              </CardFooter>
            </motion.div>
          ) : (
            <>
              <CardHeader className="space-y-2 p-8 pb-6">
                <CardTitle className="text-2xl font-bold text-center text-corp-blue-900">Mot de passe oublié ?</CardTitle>
                <CardDescription className="text-center text-sand-400 font-medium">
                  Saisissez votre email et nous vous enverrons un lien de réinitialisation.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="px-8 space-y-4">
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-sm font-bold text-corp-blue-900 ml-1">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-sand-300" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="nom@entreprise.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-xl bg-sand-50 border-corp-blue-100 pl-12 focus:border-corp-blue-600 focus:ring-corp-blue-600 outline-none transition-all font-medium"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-8 pt-8 flex flex-col gap-6">
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-corp-blue-600 text-white hover:bg-corp-blue-800 font-bold shadow-lg shadow-corp-blue-600/20 text-[1rem] transition-all duration-300 active:scale-95"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : null}
                    Envoyer le lien
                  </Button>
                  <Link 
                    href="/login" 
                    className="flex items-center justify-center gap-2 text-sm font-bold text-sand-400 hover:text-corp-blue-600 transition-all group"
                  >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Retour à la connexion
                  </Link>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

