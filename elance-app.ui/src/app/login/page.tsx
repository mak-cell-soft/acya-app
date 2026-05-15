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
import { Sparkles, Loader2 } from 'lucide-react';
import { authService } from '@/services/auth.service';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // In a real scenario, you would pass { email, password }
      // const response = await authService.login({ email, password });
      // login(response.user, response.token);

      // For now, we simulate but use the structure we've set up
      await new Promise(resolve => setTimeout(resolve, 1000));

      login(
        { id: '1', email, name: email.split('@')[0] || 'John Doe' },
        'sample-jwt-token'
      );

      toast.success('Bienvenue !');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4 relative overflow-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-forest-100)_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-forest-50/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-timber-100/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <Link href="/" className="group transition-transform hover:scale-105">
            <svg className="w-16 h-16 md:w-20 md:h-20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="17" stroke="url(#ng_login)" strokeWidth="1.5" />
              <rect x="15.5" y="10" width="5" height="12" rx="2.5" fill="url(#ng_login)" />
              <polygon points="18,6 10,15.5 26,15.5" fill="url(#ng_login)" />
              <rect x="14" y="24" width="8" height="2" rx="1" fill="#1D9E75" />
              <rect x="11" y="28" width="14" height="2" rx="1" fill="#94A3B8" />
              <defs>
                <linearGradient id="ng_login" x1="0" y1="0" x2="36" y2="36">
                  <stop offset="0%" stopColor="#534AB7" />
                  <stop offset="100%" stopColor="#1D9E75" />
                </linearGradient>
              </defs>
            </svg>
          </Link>
          <h1 className="text-3xl font-heading font-bold text-forest-900 mt-6 tracking-tight">Élancé ERP</h1>
          <p className="text-sand-400 font-medium text-sm uppercase tracking-[0.1em] mt-1">Propulsé par ACYA Consulting</p>
        </div>

        <Card className="border-forest-100 shadow-[0_20px_60px_rgba(11,59,36,0.08)] bg-white/80 backdrop-blur-md rounded-[32px] overflow-hidden">
          <CardHeader className="space-y-2 pt-10 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-forest-900">Content de vous revoir</CardTitle>
            <CardDescription className="text-center text-sand-400">
              Connectez-vous pour accéder à votre espace
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="grid gap-6 px-8">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-forest-800 font-bold ml-1">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@entreprise.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-sand-50/50 border-forest-100 rounded-xl focus:border-forest-600 focus:ring-forest-600 transition-all px-4"
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-forest-800 font-bold">Mot de passe</Label>
                  <Link href="/forgot-password" opacity-60 className="text-xs text-timber-600 hover:text-timber-800 font-bold hover:underline transition-colors">Oublié ?</Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="h-12 bg-sand-50/50 border-forest-100 rounded-xl focus:border-forest-600 focus:ring-forest-600 transition-all px-4"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-6 px-8 pb-10 pt-4">
              <Button
                type="submit"
                className="w-full h-14 rounded-xl bg-forest-600 text-white text-lg font-bold shadow-lg shadow-forest-600/20 hover:bg-forest-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                Se connecter
              </Button>
              <div className="text-center text-sm text-sand-400">
                Pas encore de compte ?{' '}
                <Link href="#" className="text-forest-600 font-bold hover:text-forest-800 hover:underline transition-all">
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
