'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, CheckCircle2, Lock, KeyRound, Loader2 } from 'lucide-react';
import { authService } from '@/services/auth.service';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      setStep('reset');
    }
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.warning('Veuillez saisir un e-mail valide.');
      return;
    }
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setStep('request'); // stays on page but displays a success instruction or we transition
      toast.success('Lien de réinitialisation envoyé !');
      // Transition to code input if they want to enter it manually
      setStep('reset');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.warning('Veuillez saisir votre code de validation.');
      return;
    }
    if (newPassword.length < 6) {
      toast.warning('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        token: token.trim().toUpperCase(),
        newPassword,
        confirmPassword
      });
      toast.success('Votre mot de passe a été réinitialisé !');
      setStep('success');
    } catch (error: any) {
      toast.error(error.response?.data || error.response?.data?.message || 'Code invalide ou expiré.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CardHeader className="space-y-4 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">Mot de passe modifié !</CardTitle>
            <CardDescription className="text-slate-500 font-medium mt-2">
              Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
            </CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="p-8 pt-6">
          <Button asChild className="w-full h-12 bg-[#0D1F3C] hover:bg-[#162B4D] text-white font-bold rounded-xl transition-all duration-300">
            <Link href="/login" className="gap-2">
              Retour à la connexion
            </Link>
          </Button>
        </CardFooter>
      </motion.div>
    );
  }

  if (step === 'reset') {
    return (
      <>
        <CardHeader className="space-y-2 p-8 pb-6">
          <CardTitle className="text-2xl font-bold text-center text-slate-900">Nouveau mot de passe</CardTitle>
          <CardDescription className="text-center text-slate-500 font-medium">
            Saisissez le code reçu par e-mail et définissez votre nouveau mot de passe.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleResetPassword}>
          <CardContent className="px-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token" className="text-sm font-bold text-slate-700 ml-1">Code de validation (reçu par email)</Label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="token"
                  type="text"
                  placeholder="Ex: F75A5633"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 pl-12 uppercase font-mono font-bold tracking-widest outline-none transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-bold text-slate-700 ml-1">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 pl-12 outline-none transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-bold text-slate-700 ml-1">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 pl-12 outline-none transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-8 pt-8 flex flex-col gap-6">
            <Button 
              type="submit" 
              className="w-full h-12 bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-600/20 text-[1rem] transition-all duration-300 active:scale-95"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              Mettre à jour le mot de passe
            </Button>
            <div className="flex justify-between w-full text-xs font-bold text-slate-500">
              <button 
                type="button" 
                onClick={() => setStep('request')}
                className="hover:text-[#0D1F3C] transition-all"
              >
                Renvoyer le code
              </button>
              <Link 
                href="/login" 
                className="flex items-center gap-2 hover:text-[#0D1F3C] transition-all group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Retour à la connexion
              </Link>
            </div>
          </CardFooter>
        </form>
      </>
    );
  }

  return (
    <>
      <CardHeader className="space-y-2 p-8 pb-6">
        <CardTitle className="text-2xl font-bold text-center text-slate-900">Mot de passe oublié ?</CardTitle>
        <CardDescription className="text-center text-slate-500 font-medium">
          Saisissez votre email et nous vous enverrons un lien de réinitialisation.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleRequestReset}>
        <CardContent className="px-8 space-y-4">
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="nom@entreprise.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-slate-50 border-slate-200 pl-12 focus:border-emerald-600 focus:ring-emerald-600 outline-none transition-all font-medium"
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-8 pt-8 flex flex-col gap-6">
          <Button 
            type="submit" 
            className="w-full h-12 bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-600/20 text-[1rem] transition-all duration-300 active:scale-95"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : null}
            Envoyer le lien
          </Button>
          <div className="flex justify-between w-full text-xs font-bold text-slate-500">
            <button 
              type="button" 
              onClick={() => setStep('reset')}
              className="hover:text-[#0D1F3C] transition-all"
            >
              J'ai déjà un code
            </button>
            <Link 
              href="/login" 
              className="flex items-center gap-2 hover:text-[#0D1F3C] transition-all group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Retour à la connexion
            </Link>
          </div>
        </CardFooter>
      </form>
    </>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e2e8f0_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-70" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-100 via-transparent to-emerald-50 pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 mb-2 group">
            <span className="text-3xl font-bold text-[#0D1F3C] tracking-tight">Élancé</span>
          </Link>
          <div className="h-1 w-12 bg-emerald-500 rounded-full" />
        </div>

        <Card className="border-slate-200/50 shadow-2xl shadow-slate-900/5 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl">
          <Suspense fallback={
            <div className="p-8 text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
              <p className="text-slate-500 text-sm">Chargement du formulaire...</p>
            </div>
          }>
            <ForgotPasswordContent />
          </Suspense>
        </Card>
      </motion.div>
    </div>
  );
}
