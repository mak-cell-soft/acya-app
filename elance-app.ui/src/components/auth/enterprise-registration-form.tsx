'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';

const NextImage =
  (Image as unknown as { default?: typeof Image }).default ?? Image;
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Building2,
  Mail,
  User,
  Lock,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  CheckCircle2,
  Factory,
  Loader2,
  BadgeInfo,
  HardHat,
  Trees,
  Coins,
  AlertCircle,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getBaseApiUrl } from '@/lib/axios';
import { TaxRegistrationDialog } from '@/components/shared/tax-registration-dialog';
import { DEVISES } from '@/lib/constants/settings';

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  defaultCurrency: 'TND' | 'EUR' | 'USD';
}

export const COUNTRIES: CountryOption[] = [
  { code: 'TN', name: 'Tunisie', dialCode: '+216', flag: '🇹🇳', defaultCurrency: 'TND' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', defaultCurrency: 'EUR' },
  { code: 'DZ', name: 'Algérie', dialCode: '+213', flag: '🇩🇿', defaultCurrency: 'EUR' },
  { code: 'MA', name: 'Maroc', dialCode: '+212', flag: '🇲🇦', defaultCurrency: 'EUR' },
  { code: 'LY', name: 'Libye', dialCode: '+218', flag: '🇱🇾', defaultCurrency: 'USD' },
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮', defaultCurrency: 'EUR' },
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳', defaultCurrency: 'EUR' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪', defaultCurrency: 'EUR' },
  { code: 'CH', name: 'Suisse', dialCode: '+41', flag: '🇨🇭', defaultCurrency: 'EUR' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', defaultCurrency: 'USD' },
  { code: 'DE', name: 'Allemagne', dialCode: '+49', flag: '🇩🇪', defaultCurrency: 'EUR' },
  { code: 'IT', name: 'Italie', dialCode: '+39', flag: '🇮🇹', defaultCurrency: 'EUR' },
  { code: 'ES', name: 'Espagne', dialCode: '+34', flag: '🇪🇸', defaultCurrency: 'EUR' },
  { code: 'GB', name: 'Royaume-Uni', dialCode: '+44', flag: '🇬🇧', defaultCurrency: 'EUR' },
  { code: 'US', name: 'États-Unis', dialCode: '+1', flag: '🇺🇸', defaultCurrency: 'USD' },
  { code: 'AE', name: 'Émirats Arabes Unis', dialCode: '+971', flag: '🇦🇪', defaultCurrency: 'USD' },
  { code: 'SA', name: 'Arabie Saoudite', dialCode: '+966', flag: '🇸🇦', defaultCurrency: 'USD' },
];

export const registrationSchema = z
  .object({
    // Step 1 — Administrator Information
    firstName: z.string().trim().min(1, 'Le prénom est requis'),
    lastName: z.string().trim().min(1, 'Le nom est requis'),
    email: z
      .string()
      .trim()
      .min(1, "L'adresse e-mail est requise")
      .email({ message: 'Veuillez saisir une adresse e-mail valide' }),
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
      .max(128, 'Le mot de passe ne doit pas dépasser 128 caractères'),
    phoneCountry: z.string().min(1, "L'indicatif pays est requis"),
    phone: z
      .string()
      .trim()
      .min(1, 'Le numéro de téléphone est requis')
      .refine(
        (val) => {
          const digits = val.replace(/\D/g, '');
          return digits.length >= 6 && digits.length <= 15;
        },
        { message: 'Veuillez saisir un numéro de téléphone valide (6 à 15 chiffres)' }
      ),

    // Step 2 — Company Configuration
    companyName: z.string().trim().min(1, "Le nom de l'entreprise est requis"),
    country: z.string().min(1, 'Le pays est requis'),
    devise: z.string().min(1, 'La devise par défaut est requise'),
    matriculeFiscal: z.string().optional(),

    // Modules (optional — users may select any combination or none)
    isWoodSelling: z.boolean(),
    isManagingConstructions: z.boolean(),
    isManagingProduction: z.boolean(),

    // Terms & Conditions
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "Vous devez accepter les conditions d'utilisation pour créer votre compte",
    }),
  });

export type RegistrationFormValues = z.infer<typeof registrationSchema>;

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: string;
  colorClass: string;
  textColorClass: string;
  checks: {
    minLength: boolean;
    mixedCase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 8,
    mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  if (!password) {
    return {
      score: 0,
      label: '',
      colorClass: 'bg-slate-200',
      textColorClass: 'text-slate-500',
      checks,
    };
  }

  let score = 0;
  if (checks.minLength) score += 1;
  if (checks.mixedCase) score += 1;
  if (checks.hasNumber) score += 1;
  if (checks.hasSpecial || password.length >= 12) score += 1;

  if (score <= 1) {
    return {
      score: 1,
      label: 'Faible',
      colorClass: 'bg-red-500',
      textColorClass: 'text-red-600',
      checks,
    };
  }
  if (score === 2) {
    return {
      score: 2,
      label: 'Moyen',
      colorClass: 'bg-amber-500',
      textColorClass: 'text-amber-600',
      checks,
    };
  }
  if (score === 3) {
    return {
      score: 3,
      label: 'Bon',
      colorClass: 'bg-corp-blue-500',
      textColorClass: 'text-corp-blue-600',
      checks,
    };
  }
  return {
    score: 4,
    label: 'Fort',
    colorClass: 'bg-emerald-500',
    textColorClass: 'text-emerald-600',
    checks,
  };
}

export const MODULE_OPTIONS = [
  {
    id: 'isWoodSelling' as const,
    title: 'Bois',
    description: 'Gérez les produits bois, articles, achats, ventes et stocks.',
    icon: Trees,
  },
  {
    id: 'isManagingConstructions' as const,
    title: 'Chantiers',
    description: 'Gérez les activités de chantier et les demandes de caisse chantier.',
    icon: HardHat,
  },
  {
    id: 'isManagingProduction' as const,
    title: 'Production',
    description: 'Gérez les activités de fabrication et évaluez les coûts de production.',
    icon: Factory,
  },
];

export function buildRegistrationPayload(data: RegistrationFormValues) {
  const dialCode =
    COUNTRIES.find((c) => c.code === data.phoneCountry)?.dialCode || '+216';
  const cleanLocalPhone = data.phone.trim();
  const fullPhone = cleanLocalPhone.startsWith('+')
    ? cleanLocalPhone
    : `${dialCode} ${cleanLocalPhone}`;

  const countryObj =
    COUNTRIES.find((c) => c.code === data.country) || COUNTRIES[0];
  const adminLogin =
    `${data.firstName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')}.${data.lastName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')}`.replace(/^\.+|\.+$/g, '') || 'admin';

  return {
    name: data.companyName.trim(),
    description: '',
    email: data.email.trim().toLowerCase(),
    phone: fullPhone,
    mobileOne: fullPhone,
    matriculeFiscal: data.matriculeFiscal?.trim() || '',
    devise: data.devise,
    currency: data.devise,
    language: 'fr',
    country: data.country,
    siegeAddress: countryObj.name,
    nameResponsable: data.lastName.trim(),
    surnameResponsable: data.firstName.trim(),
    positionResponsable: 'GERANT',
    issalingwood: data.isWoodSelling,
    ismanagingconstructions: data.isManagingConstructions,
    ismanagingproduction: data.isManagingProduction,
    sites: [
      {
        gov: data.country === 'TN' ? 'Tunis' : countryObj.name,
        address: `Siège Principal (${countryObj.name})`,
        isForsale: true,
      },
    ],
    user: {
      name: adminLogin,
      surname: data.firstName.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: '20',
      defaultSiteIndex: 0,
    },
  };
}

function RegistrationBrandPanel() {
  return (
    <aside
      aria-label="Présentation Élancé ERP"
      data-testid="registration-brand-panel"
      className="hidden lg:flex lg:w-[45%] xl:w-[46%] min-h-screen bg-[#060D1E] text-white flex-col relative overflow-hidden select-none border-r border-white/5"
    >
      <a
        href="https://acya.site"
        aria-label="Retourner au site public Élancé (acya.site)"
        title="Retourner au site public Élancé"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest('button, input, select, textarea') ||
            (target.closest('a') && target.closest('a') !== e.currentTarget)
          ) {
            e.stopPropagation();
          }
        }}
        className="flex-1 flex flex-col justify-between p-8 xl:p-12 relative cursor-pointer no-underline text-inherit focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-inset"
      >
        {/* Ambient lighting & precision dotted grid texture */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[420px] h-[420px] bg-cyan-500/12 rounded-full blur-[110px]" />
          <div className="absolute -bottom-32 -left-32 w-[460px] h-[460px] bg-blue-600/15 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-blue-500/5 rounded-full blur-[90px]" />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#060D1E] to-transparent" />
        </div>

        {/* Top Header: ACYA Élancé Brand + Cloud Platform Pill */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-white/[0.07] border border-white/15 shadow-xs backdrop-blur-md">
              <svg
                className="w-6 h-6 shrink-0"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="brand_panel_lg1" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#93C5FD" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                  <linearGradient id="brand_panel_lg2" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                  <linearGradient id="brand_panel_lg3" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#1D4ED8" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z"
                  fill="url(#brand_panel_lg1)"
                />
                <path
                  d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z"
                  fill="url(#brand_panel_lg2)"
                />
                <path
                  d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z"
                  fill="url(#brand_panel_lg3)"
                />
              </svg>
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white leading-none">
                ACYA <span className="text-cyan-300">Élancé</span>
              </div>
              <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 mt-0.5">
                Plateforme Cloud Entreprise
              </div>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Haute Sécurité TLS</span>
          </div>
        </div>

        {/* Center Showcase: ERP Visual + Value Proposition + Compact Feature Labels */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-6 xl:py-8">
          <div className="w-full max-w-[540px] xl:max-w-[580px] mx-auto space-y-6 xl:space-y-7">
            {/* Main ERP Visual: public/og-image.png */}
            <div className="relative group">
              <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.55)] border border-white/10 outline outline-1 -outline-offset-1 outline-white/10 bg-[#070F22]/90 backdrop-blur-sm transition-transform duration-500 ease-out group-hover:scale-[1.01]">
                <NextImage
                  src="/og-image.png"
                  alt="Élancé ERP — Solution de gestion intégrée pour le bois, les achats, les ventes, les chantiers BTP et la production"
                  width={1376}
                  height={768}
                  priority
                  sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 45vw, 46vw"
                  className="w-full h-auto object-contain block select-none"
                />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-400/10 to-blue-600/10 -z-10 blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Headline & Description */}
            <div className="space-y-2.5">
              <h2 className="text-xl xl:text-2xl font-bold text-white tracking-tight leading-snug text-balance">
                Votre entreprise,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-cyan-200">
                  plus simple à piloter.
                </span>
              </h2>
              <p className="text-xs xl:text-sm text-slate-300/85 leading-relaxed font-normal max-w-lg text-pretty">
                Achats, ventes, stock et gestion opérationnelle : retrouvez votre activité
                dans un seul espace.
              </p>
            </div>

            {/* Compact Feature Labels */}
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/[0.05] border border-white/10 text-slate-200">
                <Trees className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Bois et gestion des stocks</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/[0.05] border border-white/10 text-slate-200">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Achats et ventes</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/[0.05] border border-white/10 text-slate-200">
                <HardHat className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Chantiers BTP</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/[0.05] border border-white/10 text-slate-200">
                <Factory className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Ateliers et production</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Discreet Footer */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Élancé ERP par ACYA Technologies</span>
          <span className="text-slate-400/80">Architecture SaaS multi-tenant isolée</span>
        </div>
      </a>
    </aside>
  );
}

function RegistrationSecurityFooter() {
  return (
    <footer className="w-full max-w-[500px] sm:max-w-[520px] mx-auto pt-6 mt-6 border-t border-slate-200/70 text-center space-y-2.5 relative z-10">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] text-slate-400 font-medium select-none">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-slate-400" />
          Connexion sécurisée TLS
        </span>
        <span>•</span>
        <span className="inline-flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-slate-400" />
          Données isolées par espace
        </span>
      </div>
      <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 font-normal">
        <Link href="/mentions-legales" className="hover:text-slate-900 transition-colors">
          Mentions Légales
        </Link>
        <span>•</span>
        <Link href="/privacy" className="hover:text-slate-900 transition-colors">
          Confidentialité
        </Link>
        <span>•</span>
        <Link href="/contact" className="hover:text-slate-900 transition-colors">
          Contact
        </Link>
      </div>
    </footer>
  );
}

export function EnterpriseRegistrationForm({
  initialStep = 1,
  initialValues,
}: {
  initialStep?: 1 | 2;
  initialValues?: Partial<RegistrationFormValues>;
} = {}) {
  const [step, setStep] = useState<1 | 2>(initialStep);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingStep1, setIsCheckingStep1] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredSlug, setRegisteredSlug] = useState('');
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    trigger,
    setError,
    getValues,
    formState: { errors },
    setValue,
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phoneCountry: 'TN',
      phone: '',
      companyName: '',
      country: 'TN',
      devise: 'TND',
      matriculeFiscal: '',
      isWoodSelling: false,
      isManagingConstructions: false,
      isManagingProduction: false,
      acceptTerms: false,
      ...initialValues,
    },
  });

  const watchedValues = useWatch({ control });
  const watchedPassword = watchedValues.password || '';
  const watchedPhoneCountry = watchedValues.phoneCountry || 'TN';
  const watchedCountry = watchedValues.country || 'TN';
  const watchedDevise = watchedValues.devise || 'TND';
  const watchedMatriculeFiscal = watchedValues.matriculeFiscal || '';
  const watchedWood = Boolean(watchedValues.isWoodSelling);
  const watchedConstructions = Boolean(watchedValues.isManagingConstructions);
  const watchedProduction = Boolean(watchedValues.isManagingProduction);
  const watchedAcceptTerms = Boolean(watchedValues.acceptTerms);
  const selectedModulesCount =
    Number(watchedWood) + Number(watchedConstructions) + Number(watchedProduction);

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(watchedPassword),
    [watchedPassword]
  );

  const selectedPhoneCountryObj = useMemo(
    () => COUNTRIES.find((c) => c.code === watchedPhoneCountry) || COUNTRIES[0],
    [watchedPhoneCountry]
  );

  const selectedCompanyCountryObj = useMemo(
    () => COUNTRIES.find((c) => c.code === watchedCountry) || COUNTRIES[0],
    [watchedCountry]
  );

  const handlePhoneCountryChange = (code: string | null) => {
    if (!code) return;
    setValue('phoneCountry', code, { shouldValidate: true });
    const matched = COUNTRIES.find((c) => c.code === code);
    if (matched && watchedCountry === 'TN') {
      setValue('country', matched.code, { shouldValidate: true });
      setValue('devise', matched.defaultCurrency, { shouldValidate: true });
    }
  };

  const handleCompanyCountryChange = (code: string | null) => {
    if (!code) return;
    setValue('country', code, { shouldValidate: true });
    const matched = COUNTRIES.find((c) => c.code === code);
    if (matched) {
      setValue('devise', matched.defaultCurrency, { shouldValidate: true });
    }
  };

  const handleContinueStep1 = async () => {
    setSubmitError(null);
    const isStep1Valid = await trigger([
      'firstName',
      'lastName',
      'email',
      'password',
      'phoneCountry',
      'phone',
    ]);

    if (!isStep1Valid) {
      return;
    }

    const emailVal = getValues('email').trim().toLowerCase();
    setIsCheckingStep1(true);
    try {
      const apiUrl = getBaseApiUrl();
      const response = await fetch(
        `${apiUrl}Enterprise/check-email?email=${encodeURIComponent(emailVal)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }
      );

      if (response.ok) {
        const data = (await response.json()) as { exists?: boolean };
        if (data?.exists) {
          setError('email', {
            type: 'server',
            message: 'Cette adresse e-mail est déjà utilisée par un compte existant.',
          });
          setIsCheckingStep1(false);
          return;
        }
      }
    } catch {
      // If check-email endpoint is unreachable in offline/dev mode, final submission will validate
    } finally {
      setIsCheckingStep1(false);
    }

    setStep(2);
  };

  const toggleModule = (
    moduleKey: 'isWoodSelling' | 'isManagingConstructions' | 'isManagingProduction'
  ) => {
    const current = getValues(moduleKey);
    setValue(moduleKey, !current, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (data: RegistrationFormValues) => {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const payload = buildRegistrationPayload(data);

      const apiUrl = getBaseApiUrl();
      const response = await fetch(`${apiUrl}Enterprise/request-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let cleanErrorMessage =
          errorText || 'Une erreur est survenue lors de la création de votre compte.';
        try {
          const parsed = JSON.parse(errorText) as { message?: string; error?: string };
          if (parsed.message || parsed.error) {
            cleanErrorMessage = parsed.message || parsed.error || cleanErrorMessage;
          }
        } catch {
          // Plain text response
        }

        const lowerMsg = cleanErrorMessage.toLowerCase();
        if (lowerMsg.includes('e-mail') || lowerMsg.includes('email')) {
          setStep(1);
          setError('email', {
            type: 'server',
            message: cleanErrorMessage,
          });
          toast.error(cleanErrorMessage);
          return;
        }

        if (lowerMsg.includes('matricule fiscal')) {
          setError('matriculeFiscal', {
            type: 'server',
            message: cleanErrorMessage,
          });
          toast.error(cleanErrorMessage);
          return;
        }

        setSubmitError(cleanErrorMessage);
        toast.error(cleanErrorMessage);
        return;
      }

      const result = (await response.json()) as { slug?: string };
      toast.success("Demande d'inscription reçue avec succès !");
      setRegisteredSlug(result.slug || '');
      setIsSuccess(true);
    } catch {
      const fallbackMsg =
        'Impossible de contacter le serveur. Vos informations sont conservées, veuillez réessayer.';
      setSubmitError(fallbackMsg);
      toast.error(fallbackMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#FAFBFD] flex flex-col lg:flex-row selection:bg-corp-blue-500/15 font-sans antialiased">
        <RegistrationBrandPanel />

        <main className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 relative min-h-screen overflow-y-auto">
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#0F172A 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-[500px] sm:max-w-[520px] mx-auto my-auto relative z-10 py-6"
          >
            <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
              <CardHeader className="text-center pt-10 pb-4 px-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
                  Demande d&apos;inscription reçue !
                </CardTitle>
                <CardDescription className="text-slate-500 mt-2 text-base text-pretty">
                  Votre espace de travail Élancé est en cours de préparation.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 py-6 space-y-6 text-center">
                <p className="text-slate-600 text-sm leading-relaxed text-pretty">
                  Merci pour votre inscription à <strong>ACYA Élancé</strong>. Notre équipe
                  examine votre demande. Vous recevrez vos accès par e-mail dès
                  l&apos;activation de votre espace.
                </p>

                <div className="p-5 bg-corp-blue-50/40 ring-1 ring-corp-blue-100 rounded-xl space-y-3 text-left">
                  {registeredSlug && (
                    <div className="flex justify-between items-center text-sm gap-2">
                      <span className="text-slate-500 font-medium">Sous-domaine réservé :</span>
                      <span className="font-bold text-corp-blue-700 font-mono truncate">
                        {registeredSlug}.acya.site
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm gap-2">
                    <span className="text-slate-500 font-medium">Modules demandés :</span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {watchedWood && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-corp-blue-100 text-corp-blue-800">
                          Bois
                        </span>
                      )}
                      {watchedConstructions && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-corp-blue-100 text-corp-blue-800">
                          Chantiers
                        </span>
                      )}
                      {watchedProduction && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-corp-blue-100 text-corp-blue-800">
                          Production
                        </span>
                      )}
                      {selectedModulesCount === 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                          Aucun module spécifique
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm gap-2">
                    <span className="text-slate-500 font-medium">Statut :</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      En attente de validation
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Une question ? Contactez notre équipe à{' '}
                  <a
                    href="mailto:support@acya.site"
                    className="text-corp-blue-600 font-medium hover:underline"
                  >
                    support@acya.site
                  </a>
                </p>
              </CardContent>
              <CardFooter className="bg-slate-50/80 border-t border-slate-100 px-8 py-5 flex justify-center">
                <Button
                  asChild
                  className="h-11 px-8 font-semibold bg-corp-blue-600 hover:bg-corp-blue-700 text-white rounded-xl shadow-xs hover:shadow active:scale-[0.96] transition-[background-color,transform,box-shadow]"
                >
                  <Link href="/">Retourner à l&apos;accueil</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          <RegistrationSecurityFooter />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFD] flex flex-col lg:flex-row selection:bg-corp-blue-500/15 font-sans antialiased">
      {/* ─── LEFT PANEL: ACYA Élancé Presentation (Desktop Split-Screen) ─── */}
      <RegistrationBrandPanel />

      {/* ─── RIGHT PANEL: Two-Step Enterprise Registration Form ─────────── */}
      <main className="flex-1 flex flex-col justify-between p-5 sm:p-8 lg:p-10 xl:p-12 relative min-h-screen overflow-y-auto overflow-x-hidden">
        {/* Subtle Ambient Background Pattern (matching /login) */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#0F172A 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="w-full max-w-[500px] sm:max-w-[520px] mx-auto my-auto relative z-10 py-3 sm:py-5">
          {/* Brand Header (matching /login visual style + compact mobile presentation) */}
          <div className="flex flex-col items-center text-center mb-6 sm:mb-7">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corp-blue-500 rounded-xl p-1"
              aria-label="ACYA Élancé — Retour à l'accueil"
            >
              <div className="p-1.5 rounded-xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 shrink-0"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="reg_logo_1" x1="0" y1="0" x2="40" y2="40">
                      <stop offset="0%" stopColor="#93C5FD" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                    <linearGradient id="reg_logo_2" x1="0" y1="0" x2="40" y2="40">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                    <linearGradient id="reg_logo_3" x1="0" y1="0" x2="40" y2="40">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z"
                    fill="url(#reg_logo_1)"
                  />
                  <path
                    d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z"
                    fill="url(#reg_logo_2)"
                  />
                  <path
                    d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z"
                    fill="url(#reg_logo_3)"
                  />
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                Élancé <span className="text-corp-blue-600 font-semibold">ERP</span>
              </span>
            </Link>

            {/* Compact mobile presentation subtitle (hidden on desktop where left panel is shown) */}
            <p className="lg:hidden text-xs text-slate-500 mt-1.5 font-medium">
              Votre entreprise, plus simple à piloter — Bois, Achats/Ventes, Chantiers & Production
            </p>
          </div>

          {/* Elevated Registration Surface (matching /login card style) */}
          <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
            {/* Progress Header */}
            <div className="px-6 sm:px-8 pt-6 sm:pt-7 pb-5 border-b border-slate-200/70 bg-slate-50/40">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  data-testid="step-indicator"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-corp-blue-700 bg-corp-blue-50 ring-1 ring-corp-blue-500/15 px-3 py-1 rounded-full tabular-nums"
                >
                  Étape {step} sur 2
                </span>
                <span className="text-xs font-semibold text-slate-500 tabular-nums">
                  {step === 1 ? '1. Administrateur' : '2. Entreprise & Modules'}
                </span>
              </div>

              {/* 2-Step Segmented Progress Bar */}
              <div
                className="grid grid-cols-2 gap-2"
                role="progressbar"
                aria-valuenow={step}
                aria-valuemin={1}
                aria-valuemax={2}
                aria-label={`Étape ${step} sur 2`}
              >
                <div className="h-1.5 rounded-full bg-corp-blue-600 transition-colors duration-300" />
                <div
                  className={`h-1.5 rounded-full transition-colors duration-300 ${
                    step === 2 ? 'bg-corp-blue-600' : 'bg-slate-200/80'
                  }`}
                />
              </div>

              <div className="mt-4">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-balance">
                  {step === 1
                    ? 'Créez votre compte administrateur'
                    : 'Configurez votre entreprise'}
                </h1>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed text-pretty">
                  {step === 1
                    ? 'Renseignez vos coordonnées personnelles pour créer votre espace Élancé.'
                    : 'Précisez les informations de votre société et sélectionnez vos modules optionnels.'}
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="px-6 sm:px-8 py-6 sm:py-7"
            >
              {submitError && (
                <div
                  role="alert"
                  className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="text-pretty">{submitError}</span>
                </div>
              )}

              <AnimatePresence mode="wait" initial={false}>
                {step === 1 ? (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="space-y-4.5"
                  >
                    {/* First Name & Last Name side by side on desktop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="reg-firstName"
                          className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                        >
                          Prénom <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative group">
                          <User className="w-4 h-4 text-slate-400 group-focus-within:text-corp-blue-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            id="reg-firstName"
                            defaultValue={watchedValues.firstName}
                            {...register('firstName')}
                            placeholder="Ex: Karim"
                            autoComplete="given-name"
                            aria-invalid={Boolean(errors.firstName)}
                            className="h-11 pl-10 pr-3.5 rounded-xl border-slate-300/90 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/10 transition-[border-color,box-shadow]"
                          />
                        </div>
                        {errors.firstName && (
                          <p role="alert" className="text-rose-600 text-xs font-medium mt-1">
                            {errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="reg-lastName"
                          className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                        >
                          Nom <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative group">
                          <User className="w-4 h-4 text-slate-400 group-focus-within:text-corp-blue-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            id="reg-lastName"
                            defaultValue={watchedValues.lastName}
                            {...register('lastName')}
                            placeholder="Ex: Ben Ali"
                            autoComplete="family-name"
                            aria-invalid={Boolean(errors.lastName)}
                            className="h-11 pl-10 pr-3.5 rounded-xl border-slate-300/90 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/10 transition-[border-color,box-shadow]"
                          />
                        </div>
                        {errors.lastName && (
                          <p role="alert" className="text-rose-600 text-xs font-medium mt-1">
                            {errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="reg-email"
                        className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                      >
                        Adresse e-mail professionnelle <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative group">
                        <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-corp-blue-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                          id="reg-email"
                          type="email"
                          defaultValue={watchedValues.email}
                          {...register('email')}
                          placeholder="nom@entreprise.com"
                          autoComplete="email"
                          aria-invalid={Boolean(errors.email)}
                          className="h-11 pl-10 pr-3.5 rounded-xl border-slate-300/90 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/10 transition-[border-color,box-shadow]"
                        />
                      </div>
                      {errors.email && (
                        <p
                          role="alert"
                          data-testid="email-error"
                          className="text-rose-600 text-xs font-medium mt-1 flex items-center gap-1.5"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.email.message}</span>
                        </p>
                      )}
                    </div>

                    {/* Password + Show/Hide + Visual Strength Indicator */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="reg-password"
                        className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                      >
                        Mot de passe <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative group">
                        <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-corp-blue-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          defaultValue={watchedValues.password}
                          {...register('password')}
                          placeholder="Minimum 8 caractères"
                          autoComplete="new-password"
                          aria-invalid={Boolean(errors.password)}
                          className="h-11 pl-10 pr-11 rounded-xl border-slate-300/90 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/10 transition-[border-color,box-shadow]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={
                            showPassword
                              ? 'Masquer le mot de passe'
                              : 'Afficher le mot de passe'
                          }
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
                        >
                          <Eye
                            className={`w-4 h-4 transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
                              showPassword
                                ? 'opacity-0 scale-50 blur-[2px] absolute'
                                : 'opacity-100 scale-100 blur-0'
                            }`}
                          />
                          <EyeOff
                            className={`w-4 h-4 transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
                              showPassword
                                ? 'opacity-100 scale-100 blur-0'
                                : 'opacity-0 scale-50 blur-[2px] absolute'
                            }`}
                          />
                        </button>
                      </div>
                      {errors.password && (
                        <p role="alert" className="text-rose-600 text-xs font-medium mt-1">
                          {errors.password.message}
                        </p>
                      )}

                      {/* Visual Password Strength Meter */}
                      <div
                        className="pt-1 space-y-1.5"
                        data-testid="password-strength-meter"
                        aria-live="polite"
                      >
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 rounded-full transition-colors duration-200 ${
                                passwordStrength.score >= level
                                  ? passwordStrength.colorClass
                                  : 'bg-slate-200/80'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="text-slate-500">
                            8+ caractères, majuscules et chiffres recommandés
                          </span>
                          {passwordStrength.label && (
                            <span
                              data-testid="password-strength-label"
                              className={`font-semibold tabular-nums shrink-0 ${passwordStrength.textColorClass}`}
                            >
                              {passwordStrength.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Phone Number with International Calling Code Selector */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="reg-phone"
                        className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                      >
                        Numéro de téléphone <span className="text-rose-500">*</span>
                      </Label>
                      <div className="flex gap-2.5">
                        <div className="w-[136px] sm:w-[148px] shrink-0">
                          <Select
                            value={watchedPhoneCountry}
                            onValueChange={handlePhoneCountryChange}
                          >
                            <SelectTrigger
                              aria-label="Indicatif téléphonique du pays"
                              data-testid="phone-country-select"
                              className="h-11 w-full rounded-xl border-slate-300/90 bg-white hover:border-slate-400 px-3 text-sm font-medium tabular-nums transition-[border-color,box-shadow]"
                            >
                              <SelectValue>
                                <span className="inline-flex items-center gap-1.5 truncate">
                                  <span className="text-base leading-none">
                                    {selectedPhoneCountryObj.flag}
                                  </span>
                                  <span className="font-semibold text-slate-700">
                                    {selectedPhoneCountryObj.dialCode}
                                  </span>
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  <span className="inline-flex items-center gap-2 tabular-nums">
                                    <span>{country.flag}</span>
                                    <span>{country.name}</span>
                                    <span className="text-slate-400 font-mono text-xs">
                                      ({country.dialCode})
                                    </span>
                                  </span >
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="relative flex-1 min-w-0">
                          <Input
                            id="reg-phone"
                            type="tel"
                            defaultValue={watchedValues.phone}
                            {...register('phone')}
                            placeholder="22 123 456"
                            autoComplete="tel-national"
                            aria-invalid={Boolean(errors.phone)}
                            className="h-11 px-3.5 rounded-xl border-slate-300/90 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/10 tabular-nums transition-[border-color,box-shadow]"
                          />
                        </div>
                      </div>
                      {errors.phone && (
                        <p role="alert" className="text-rose-600 text-xs font-medium mt-1">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    {/* Primary Action Button: Continue */}
                    <div className="pt-2">
                      <Button
                        type="button"
                        onClick={handleContinueStep1}
                        disabled={isCheckingStep1}
                        data-testid="step1-continue-btn"
                        className="w-full h-11.5 rounded-xl bg-corp-blue-600 hover:bg-corp-blue-700 active:bg-corp-blue-800 text-white font-semibold text-sm shadow-xs hover:shadow active:scale-[0.96] transition-[background-color,transform,box-shadow] duration-200 cursor-pointer gap-2"
                      >
                        {isCheckingStep1 ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Vérification...</span>
                          </>
                        ) : (
                          <>
                            <span>Continuer</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Secondary Sign-In Link */}
                    <div className="text-center pt-1">
                      <p className="text-xs sm:text-sm text-slate-600">
                        Vous avez déjà un compte ?{' '}
                        <Link
                          href="/login"
                          className="font-semibold text-corp-blue-600 hover:text-corp-blue-700 hover:underline inline-flex items-center min-h-[40px] px-1 transition-colors"
                        >
                          Se connecter
                        </Link>
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="space-y-6"
                  >
                    {/* Section 1: Company Information */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="reg-companyName"
                          className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                        >
                          Nom de l&apos;entreprise <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative group">
                          <Building2 className="w-4 h-4 text-slate-400 group-focus-within:text-corp-blue-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            id="reg-companyName"
                            defaultValue={watchedValues.companyName}
                            {...register('companyName')}
                            placeholder="Ex: Société Tunisienne du Bois"
                            autoComplete="organization"
                            aria-invalid={Boolean(errors.companyName)}
                            className="h-11 pl-10 pr-3.5 rounded-xl border-slate-300/90 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/10 transition-[border-color,box-shadow]"
                          />
                        </div>
                        {errors.companyName && (
                          <p role="alert" className="text-rose-600 text-xs font-medium mt-1">
                            {errors.companyName.message}
                          </p>
                        )}
                      </div>

                      {/* Country & Default Currency side by side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                            Pays <span className="text-rose-500">*</span>
                          </Label>
                          <Select
                            value={watchedCountry}
                            onValueChange={handleCompanyCountryChange}
                          >
                            <SelectTrigger
                              aria-label="Pays de l'entreprise"
                              data-testid="company-country-select"
                              className="h-11 w-full rounded-xl border-slate-300/90 bg-white hover:border-slate-400 px-3.5 text-sm transition-[border-color,box-shadow]"
                            >
                              <SelectValue placeholder="Sélectionner un pays">
                                <span className="inline-flex items-center gap-2 truncate">
                                  <span className="text-base leading-none">
                                    {selectedCompanyCountryObj.flag}
                                  </span>
                                  <span className="font-medium text-slate-800 truncate">
                                    {selectedCompanyCountryObj.name}
                                  </span>
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  <span className="inline-flex items-center gap-2">
                                    <span>{country.flag}</span>
                                    <span>{country.name}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.country && (
                            <p role="alert" className="text-rose-600 text-xs font-medium mt-1">
                              {errors.country.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                            Devise par défaut <span className="text-rose-500">*</span>
                          </Label>
                          <Select
                            value={watchedDevise}
                            onValueChange={(val: string | null) => {
                              if (val) setValue('devise', val, { shouldValidate: true });
                            }}
                          >
                            <SelectTrigger
                              aria-label="Devise par défaut"
                              data-testid="company-currency-select"
                              className="h-11 w-full rounded-xl border-slate-300/90 bg-white hover:border-slate-400 px-3.5 text-sm transition-[border-color,box-shadow]"
                            >
                              <SelectValue placeholder="Sélectionner une devise">
                                <span className="inline-flex items-center gap-2 truncate">
                                  <Coins className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="font-medium text-slate-800 truncate">
                                    {watchedDevise
                                      ? DEVISES.find((opt) => opt.key === watchedDevise)?.value
                                      : undefined}
                                  </span>
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {DEVISES.map((opt) => (
                                <SelectItem key={opt.key} value={opt.key}>
                                  {opt.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.devise && (
                            <p role="alert" className="text-rose-600 text-xs font-medium mt-1">
                              {errors.devise.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Tax Identification Number (Optional) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label
                            htmlFor="reg-matriculeFiscal"
                            className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                          >
                            Matricule fiscal
                          </Label>
                          <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                            Optionnel
                          </span>
                        </div>
                        <div className="relative group">
                          <FileText className="w-4 h-4 text-slate-400 group-focus-within:text-corp-blue-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            id="reg-matriculeFiscal"
                            defaultValue={watchedValues.matriculeFiscal}
                            {...register('matriculeFiscal')}
                            placeholder="Ex: 1234567/A/A/M/000"
                            className="h-11 pl-10 pr-11 rounded-xl border-slate-300/90 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/10 font-mono text-sm transition-[border-color,box-shadow]"
                          />
                          <button
                            type="button"
                            onClick={() => setIsTaxModalOpen(true)}
                            title="Assistant de saisie du Matricule Fiscal"
                            aria-label="Ouvrir l'assistant de saisie du Matricule Fiscal"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 inline-flex items-center justify-center rounded-lg text-corp-blue-600 hover:bg-corp-blue-50 transition-colors cursor-pointer"
                          >
                            <BadgeInfo className="w-4 h-4" />
                          </button>
                        </div>
                        {errors.matriculeFiscal && (
                          <p role="alert" className="text-rose-600 text-xs font-medium mt-1">
                            {errors.matriculeFiscal.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Section 2: Module Selection (Optional) */}
                    <div className="pt-5 border-t border-slate-200/70 space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                            Choisissez vos modules
                          </h2>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed text-pretty">
                            Sélectionnez les modules adaptés à votre activité, ou configurez-les plus
                            tard.
                          </p>
                        </div>
                        <span
                          data-testid="modules-optional-badge"
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 tabular-nums transition-colors ${
                            selectedModulesCount > 0
                              ? 'bg-corp-blue-50 text-corp-blue-700 ring-1 ring-corp-blue-500/20'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {selectedModulesCount > 0
                            ? `${selectedModulesCount} sélectionné${selectedModulesCount > 1 ? 's' : ''}`
                            : 'Optionnel'}
                        </span>
                      </div>

                      <div
                        className="grid grid-cols-1 gap-2.5"
                        role="group"
                        aria-label="Choisissez vos modules"
                      >
                        {MODULE_OPTIONS.map((mod) => {
                          const IconComponent = mod.icon;
                          const isSelected = Boolean(watchedValues[mod.id]);
                          return (
                            <div
                              key={mod.id}
                              role="checkbox"
                              aria-checked={isSelected}
                              tabIndex={0}
                              data-testid={`module-card-${mod.id}`}
                              onClick={() => toggleModule(mod.id)}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Enter') {
                                  e.preventDefault();
                                  toggleModule(mod.id);
                                }
                              }}
                              className={`group relative flex items-center gap-3.5 p-3.5 sm:p-4 min-h-[74px] rounded-xl border text-left cursor-pointer select-none active:scale-[0.99] transition-[background-color,border-color,box-shadow,transform] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-corp-blue-500 focus-visible:ring-offset-1 ${
                                isSelected
                                  ? 'border-corp-blue-600 bg-corp-blue-50/45 shadow-[0_1px_3px_rgba(37,99,235,0.08),0_0_0_1px_rgba(37,99,235,0.2)]'
                                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150 ${
                                  isSelected
                                    ? 'bg-corp-blue-600 text-white shadow-[0_2px_6px_rgba(37,99,235,0.25)]'
                                    : 'bg-slate-100 text-slate-600 group-hover:bg-corp-blue-50/70 group-hover:text-corp-blue-600'
                                }`}
                              >
                                <IconComponent className="w-5 h-5" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-sm font-semibold tracking-[-0.01em] transition-colors ${
                                      isSelected ? 'text-corp-blue-950' : 'text-slate-900'
                                    }`}
                                  >
                                    {mod.title}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed text-pretty">
                                  {mod.description}
                                </p>
                              </div>

                              <div
                                className={`w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 transition-[background-color,border-color] duration-150 ${
                                  isSelected
                                    ? 'bg-corp-blue-600 border-corp-blue-600 text-white'
                                    : 'border-slate-300 bg-white group-hover:border-slate-400'
                                }`}
                              >
                                <Check
                                  className={`w-3.5 h-3.5 stroke-[3] transition-[opacity,transform] duration-150 ${
                                    isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                                  }`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 3: Terms & Conditions + Final Actions */}
                    <div className="pt-4 border-t border-slate-200/70 space-y-5">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="reg-acceptTerms"
                          className="flex items-start gap-3 cursor-pointer select-none min-h-[40px] py-1"
                        >
                          <Checkbox
                            id="reg-acceptTerms"
                            data-testid="accept-terms-checkbox"
                            checked={watchedAcceptTerms}
                            onCheckedChange={(checked) =>
                              setValue('acceptTerms', checked === true, {
                                shouldValidate: true,
                              })
                            }
                            className="mt-0.5 h-5 w-5 rounded-[6px] border-slate-300 data-checked:bg-corp-blue-600 data-checked:border-corp-blue-600"
                          />
                          <span className="text-xs sm:text-sm text-slate-600 leading-relaxed text-pretty">
                            J&apos;accepte les{' '}
                            <Link
                              href="/mentions-legales"
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-corp-blue-600 hover:underline"
                            >
                              Conditions d&apos;utilisation
                            </Link>{' '}
                            et la{' '}
                            <Link
                              href="/privacy"
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-corp-blue-600 hover:underline"
                            >
                              Politique de confidentialité
                            </Link>{' '}
                            d&apos;ACYA Élancé. <span className="text-rose-500">*</span>
                          </span>
                        </label>
                        {errors.acceptTerms && (
                          <p
                            role="alert"
                            data-testid="terms-error"
                            className="text-rose-600 text-xs font-medium"
                          >
                            {errors.acceptTerms.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          data-testid="create-account-btn"
                          className="w-full h-11.5 rounded-xl bg-corp-blue-600 hover:bg-corp-blue-700 active:bg-corp-blue-800 text-white font-semibold text-sm shadow-xs hover:shadow active:scale-[0.96] transition-[background-color,transform,box-shadow] duration-200 cursor-pointer gap-2 disabled:opacity-60"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Création de votre compte...</span>
                            </>
                          ) : (
                            <>
                              <span>Créer mon compte</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </Button>

                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSubmitError(null);
                              setStep(1);
                            }}
                            disabled={isSubmitting}
                            data-testid="back-to-step1-btn"
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100/70 min-h-[40px] px-3.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Retour à vos informations</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </Card>
        </div>

        {/* ─── COMPACT SECURITY & LEGAL FOOTER (matching /login) ─────────── */}
        <RegistrationSecurityFooter />

        <TaxRegistrationDialog
          isOpen={isTaxModalOpen}
          onClose={() => setIsTaxModalOpen(false)}
          onConfirm={(val) =>
            setValue('matriculeFiscal', val, { shouldValidate: true })
          }
          initialValue={watchedMatriculeFiscal}
        />
      </main>
    </div>
  );
}

