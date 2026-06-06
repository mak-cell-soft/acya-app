'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/use-auth-store';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/auth.service';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPanel, setShowForgotPanel] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authService.login({ login: email, password });
      
      if (response.isSuccess) {
        toast.success(`Authentification avec succès à ${response.enterpriseName || ''}`);
        router.push('/dashboard');
      } else {
        toast.warning(response.message || "Identifiants invalides");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible de joindre le serveur. Vérifiez votre connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      toast.warning("Veuillez saisir un email valide.");
      return;
    }

    setIsForgotLoading(true);
    try {
      const res = await authService.forgotPassword(forgotEmail);
      setResetToken(res.token);
      toast.success(res.message || "Code généré avec succès");
    } catch (error) {
      toast.error("Une erreur est survenue lors de la génération du code.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-corp-blue-50 via-[#EBF1FA] to-[#F8FAFF] px-4 relative overflow-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-corp-blue-200)_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-corp-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-corp-blue-50/50 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <Link href="/" className="group transition-transform hover:scale-105">
            <svg className="w-16 h-16 md:w-20 md:h-20 drop-shadow-xl transition-transform duration-700 group-hover:scale-105" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          </Link>
          <h1 className="text-3xl font-bold text-corp-blue-900 mt-6 tracking-tight">Élancé</h1>
        </div>

        <Card className="border-corp-blue-100 shadow-[0_20px_60px_rgba(11,59,36,0.08)] bg-card/80 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="space-y-2 pt-10 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-corp-blue-900">Bienvenue</CardTitle>
            <CardDescription className="text-center text-sand-400">
              Connectez-vous à votre espace professionnel
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="grid gap-6 px-8">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-corp-blue-800 font-bold ml-1">Email Professionnel</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@entreprise.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" title="password" className="text-corp-blue-800 font-bold ml-1">Mot de passe</Label>
                <div className="relative flex items-center">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-12"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-sand-400 hover:text-corp-blue-750 transition-colors p-1"
                    title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between ml-1">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="remember" 
                    className="w-4 h-4 rounded border-corp-blue-100 text-corp-blue-600 focus:ring-corp-blue-600 cursor-pointer" 
                  />
                  <label htmlFor="remember" className="text-xs text-sand-600 cursor-pointer">Se souvenir de moi</label>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowForgotPanel(!showForgotPanel)}
                  className="text-xs text-timber-600 hover:text-timber-800 font-bold hover:underline transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {/* Forgot Password Panel - Dynamic Transition */}
              <motion.div 
                initial={false}
                animate={{ height: showForgotPanel ? 'auto' : 0, opacity: showForgotPanel ? 1 : 0 }}
                className="overflow-hidden bg-sand-50/80 rounded-2xl border border-sand-100"
              >
                <div className="p-4 space-y-3">
                  <p className="text-xs text-sand-600">Entrez votre email pour générer un code de réinitialisation.</p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="votre@email.com" 
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="h-10 bg-background border-border text-sm"
                    />
                    <Button 
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isForgotLoading}
                      className="h-10 bg-corp-blue-600 hover:bg-corp-blue-700 text-xs px-4"
                    >
                      {isForgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Générer"}
                    </Button>
                  </div>
                  {resetToken && (
                    <div className="mt-3 p-3 bg-card rounded-lg border border-border animate-in fade-in slide-in-from-top-2">
                      <div className="text-[10px] uppercase tracking-wider text-corp-blue-600 font-bold mb-1">Votre code :</div>
                      <div className="text-lg font-mono font-bold text-center tracking-widest text-corp-blue-900 bg-background py-2 rounded">
                        {resetToken}
                      </div>
                      <p className="text-[10px] text-sand-400 mt-2 text-center">
                        Valide pendant 15 minutes.
                      </p>
                      <Link 
                        href={`/forgot-password?token=${resetToken}`}
                        className="mt-3 block w-full text-center py-2 bg-sand-100 hover:bg-sand-200 text-corp-blue-900 text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                      >
                        Aller à la réinitialisation
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            </CardContent>
            <CardFooter className="flex flex-col gap-6 px-8 pb-10 pt-4">
              <Button
                type="submit"
                className="w-full h-14 bg-corp-blue-600 text-white text-lg font-bold shadow-lg shadow-corp-blue-600/20 hover:bg-corp-blue-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                Se Connecter
              </Button>
              <div className="text-center text-sm text-sand-400">
                Nouveau sur la plateforme ?{' '}
                <Link href="#" className="text-corp-blue-600 font-bold hover:text-corp-blue-800 hover:underline transition-all">
                  Contactez-nous
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

