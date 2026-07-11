'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/use-auth-store';
import { useTenantStore } from '@/store/use-tenant-store';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Eye, EyeOff, TrendingUp, Package, ShoppingCart, Users, ArrowRight, CheckCircle2, BarChart3, Truck, FileText } from 'lucide-react';
import { authService } from '@/services/auth.service';

// ─── Animated KPI Card ───────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, delay }: { label: string; value: string; sub: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-md"
    >
      <div className={`text-[10px] font-bold uppercase tracking-widest ${color} mb-1 opacity-80`}>{label}</div>
      <div className="text-white font-bold text-lg leading-none">{value}</div>
      <div className="text-white/40 text-[10px] mt-1">{sub}</div>
    </motion.div>
  );
}

// ─── Mini chart bars ─────────────────────────────────────────────────────────
function MiniChart({ heights, color }: { heights: number[]; color: string }) {
  return (
    <div className="flex items-end gap-0.5 h-10">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className={`w-2 rounded-sm ${color}`}
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ delay: 0.8 + i * 0.06, duration: 0.4, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────
function ActivityRow({ icon: Icon, text, badge, badgeColor, delay }: { icon: any; text: string; badge: string; badgeColor: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-2.5 py-1.5"
    >
      <div className="w-6 h-6 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
        <Icon className="w-3 h-3 text-white/60" />
      </div>
      <p className="text-[11px] text-white/65 flex-1 truncate">{text}</p>
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
    </motion.div>
  );
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPanel, setShowForgotPanel] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const logoUrl = useTenantStore((state: any) => state.logoUrl);
  const tenantStatus = useTenantStore((state: any) => state.status);
  const isTenantInactive = tenantStatus === 'Suspended' || tenantStatus === 'Expired';

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        try {
          const userDetails = authService.getUserDetail(urlToken);
          if (userDetails) {
            useAuthStore.getState().login(userDetails, urlToken);
            toast.success("Connexion automatique réussie !");
            router.push('/dashboard');
          } else {
            toast.error("Le jeton d'impersonnalisation est invalide.");
          }
        } catch (e) {
          toast.error("Erreur lors de la connexion automatique.");
        }
      }
    }
  }, [router]);

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
    <div className="flex min-h-screen bg-[#F5F7FA]">

      {/* ─── LEFT PANEL: Product Showcase ────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#0D1F3C] flex-col">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        
        {/* Gradient overlays */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#3B82F6]/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#1E40AF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#60A5FA]/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0D1F3C] to-transparent pointer-events-none z-10" />

        {/* Brand header */}
        <div className="relative z-20 p-8 flex items-center gap-3">
          <svg className="w-8 h-8 shrink-0" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lg1" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#93C5FD"/>
                <stop offset="100%" stopColor="#3B82F6"/>
              </linearGradient>
              <linearGradient id="lg2" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#3B82F6"/>
                <stop offset="100%" stopColor="#2563EB"/>
              </linearGradient>
              <linearGradient id="lg3" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#2563EB"/>
                <stop offset="100%" stopColor="#1D4ED8"/>
              </linearGradient>
            </defs>
            <path d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z" fill="url(#lg1)" />
            <path d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z" fill="url(#lg2)" />
            <path d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z" fill="url(#lg3)" />
          </svg>
          <span className="text-white font-bold text-lg tracking-tight">Élancé <span className="text-[#60A5FA] font-medium">ERP</span></span>
        </div>

        {/* Central content */}
        <div className="relative z-20 flex-1 flex flex-col justify-center px-10 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="space-y-8 max-w-[520px] w-full mx-auto"
          >
            {/* Headline */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-[#60A5FA] uppercase tracking-widest">Plateforme ERP SaaS</p>
              <h2 className="text-2xl font-bold text-white leading-snug">
                Gérez votre entreprise<br/>
                <span className="text-[#60A5FA]">intelligemment, en temps réel.</span>
              </h2>
              <p className="text-sm text-white/45 leading-relaxed">
                Ventes, achats, stock, comptabilité et équipe — tout centralisé dans un seul espace de travail.
              </p>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Chiffre d'affaires" value="284K TND" sub="+18% ce mois" color="text-[#34D399]" delay={0.2} />
              <KpiCard label="Commandes" value="1 247" sub="en cours: 34" color="text-[#60A5FA]" delay={0.3} />
              <KpiCard label="Stock restant" value="98 m³" sub="13 alertes basses" color="text-[#F59E0B]" delay={0.4} />
            </div>

            {/* Revenue Mini Chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-[#60A5FA]" />
                  <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Ventes — 12 derniers mois</span>
                </div>
                <span className="text-[10px] text-[#34D399] font-bold bg-[#34D399]/15 px-2 py-0.5 rounded-full">↑ 18.4%</span>
              </div>
              <div className="flex items-end justify-between gap-1">
                <MiniChart 
                  heights={[40, 55, 45, 70, 60, 80, 65, 85, 72, 90, 78, 95]} 
                  color="bg-[#3B82F6]"
                />
                <div className="text-right pl-4">
                  <div className="text-xs text-white/40">Ce mois</div>
                  <div className="text-lg font-bold text-white">42K TND</div>
                </div>
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-white/8">
                {[['Jan', '28K TND'], ['Mar', '35K TND'], ['Juin', '42K TND']].map(([m, v]) => (
                  <div key={m} className="text-[10px]">
                    <span className="text-white/30">{m} </span>
                    <span className="text-white/70 font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#34D399]"></span>
                </span>
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Activité récente</span>
              </div>
              <div className="divide-y divide-white/5">
                <ActivityRow icon={ShoppingCart} text="Commande #CO-2847 — SICOUB Matériaux" badge="Vente" badgeColor="bg-[#3B82F6]/20 text-[#60A5FA]" delay={0.75} />
                <ActivityRow icon={Truck} text="Réception BL #BL-1204 — 24 m³ Chêne" badge="Achat" badgeColor="bg-[#F59E0B]/20 text-[#F59E0B]" delay={0.82} />
                <ActivityRow icon={FileText} text="Facture #FAC-5582 générée — 3 200 TND" badge="Finance" badgeColor="bg-[#34D399]/20 text-[#34D399]" delay={0.89} />
              </div>
            </motion.div>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="flex flex-wrap gap-2"
            >
              {[
                { icon: Package, label: 'Stock & Dépôts' },
                { icon: Users, label: 'Gestion Équipe' },
                { icon: TrendingUp, label: 'Analytiques' },
                { icon: CheckCircle2, label: 'Multi-devises' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[10px] font-semibold text-white/50 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  <Icon className="w-3 h-3" />
                  {label}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Login Form ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative bg-[#F5F7FA]">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#0D1F3C 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Link href="/" className="group">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
              ) : (
                <div className="flex items-center gap-2.5 group-hover:scale-105 transition-transform duration-300">
                  <svg className="w-9 h-9" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="rg1" x1="0" y1="0" x2="40" y2="40">
                        <stop offset="0%" stopColor="#60A5FA"/>
                        <stop offset="100%" stopColor="#3B82F6"/>
                      </linearGradient>
                      <linearGradient id="rg2" x1="0" y1="0" x2="40" y2="40">
                        <stop offset="0%" stopColor="#3B82F6"/>
                        <stop offset="100%" stopColor="#2563EB"/>
                      </linearGradient>
                      <linearGradient id="rg3" x1="0" y1="0" x2="40" y2="40">
                        <stop offset="0%" stopColor="#2563EB"/>
                        <stop offset="100%" stopColor="#1D4ED8"/>
                      </linearGradient>
                    </defs>
                    <path d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z" fill="url(#rg1)" />
                    <path d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z" fill="url(#rg2)" />
                    <path d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z" fill="url(#rg3)" />
                  </svg>
                  <div>
                    <div className="text-[#0D1F3C] font-bold text-xl tracking-tight leading-none">Élancé</div>
                    <div className="text-[#3B82F6] text-[10px] font-semibold tracking-widest uppercase">ERP Platform</div>
                  </div>
                </div>
              )}
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-[#0D1F3C] tracking-tight mb-1.5">Bon retour 👋</h1>
            <p className="text-sm text-[#64748B] font-medium">Connectez-vous à votre espace professionnel.</p>
          </div>

          {/* Inactive Tenant Warning */}
          {isTenantInactive && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold text-center">
              Votre entreprise est désactivée. Contactez l'administrateur.
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-[#0D1F3C]">
                Adresse e-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@entreprise.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isTenantInactive}
                className="h-11 rounded-xl border-[#DDE2EC] bg-white text-[#0D1F3C] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:ring-[#3B82F6]/15 focus:ring-2 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold text-[#0D1F3C]">
                  Mot de passe
                </Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPanel(!showForgotPanel)}
                  className="text-[11px] font-semibold text-[#3B82F6] hover:text-[#2563EB] hover:underline transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isTenantInactive}
                  className="h-11 rounded-xl border-[#DDE2EC] bg-white text-[#0D1F3C] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:ring-[#3B82F6]/15 focus:ring-2 transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors p-1"
                  title={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-[#DDE2EC] text-[#3B82F6] focus:ring-[#3B82F6] cursor-pointer accent-[#3B82F6]"
              />
              <label htmlFor="remember" className="text-xs text-[#64748B] cursor-pointer select-none">
                Se souvenir de moi
              </label>
            </div>

            {/* Forgot Password Panel */}
            <AnimatePresence initial={false}>
              {showForgotPanel && (
                <motion.div
                  key="forgot"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl space-y-3">
                    <p className="text-xs text-[#475569] leading-relaxed">
                      Saisissez votre email pour recevoir un code de réinitialisation.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="votre@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="h-9 text-sm bg-white border-[#BFDBFE] rounded-lg focus:border-[#3B82F6]"
                      />
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={isForgotLoading}
                        className="h-9 px-4 bg-[#3B82F6] text-white text-xs font-bold rounded-lg hover:bg-[#2563EB] transition-[transform,background-color] duration-200 ease-out active:scale-[0.96] shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {isForgotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Générer"}
                      </button>
                    </div>
                    {resetToken && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 bg-white rounded-lg border border-[#BFDBFE] space-y-2"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-[#3B82F6] font-bold">Votre code :</div>
                        <div className="text-base font-mono font-bold text-center tracking-[0.2em] text-[#0D1F3C] py-1.5 bg-[#F8FAFF] rounded">
                          {resetToken}
                        </div>
                        <p className="text-[10px] text-[#94A3B8] text-center">Valide pendant 15 minutes.</p>
                        <Link
                          href={`/forgot-password?token=${resetToken}`}
                          className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#3B82F6] text-[10px] font-bold uppercase tracking-wider rounded transition-[transform,background-color] duration-200 ease-out active:scale-[0.96]"
                        >
                          Aller à la réinitialisation <ArrowRight className="w-3 h-3" />
                        </Link>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || isTenantInactive}
              className="w-full h-12 bg-[#0D1F3C] hover:bg-[#162B4D] text-white font-bold text-sm rounded-full shadow-lg shadow-[#0D1F3C]/20 hover:shadow-xl hover:shadow-[#0D1F3C]/25 hover:scale-[1.015] active:scale-[0.96] transition-[transform,background-color,color,box-shadow] duration-200 ease-out cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Se Connecter <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-[11px] text-[#94A3B8] mt-8 font-medium">
            Pas encore sur la plateforme ?{' '}
            <Link href="#" className="font-bold text-[#3B82F6] hover:text-[#2563EB] hover:underline transition-colors">
              Contactez-nous
            </Link>
          </p>

          {/* Trust badges */}
          <div className="mt-8 flex items-center justify-center gap-5">
            {[['🔒', 'Connexion sécurisée SSL'], ['🇹🇳', 'Crée en Tunisie'], ['📊', 'RGPD Conforme']].map(([icon, label]) => (
              <div key={label as string} className="flex flex-col items-center gap-0.5">
                <span className="text-base">{icon}</span>
                <span className="text-[9px] text-[#94A3B8] font-medium text-center leading-tight">{label as string}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
