'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Building2, Mail, Phone, MapPin, User, Briefcase, Plus, Trash2, ShieldCheck, Store, ArrowLeft, ArrowRight, Eye, EyeOff, FileText, CheckCircle2, Factory, Loader2, BadgeInfo } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getBaseApiUrl } from '@/lib/axios';
import { TaxRegistrationDialog } from '@/components/shared/tax-registration-dialog';

const siteSchema = z.object({
  address: z.string().min(1, "L'adresse est requise"),
  gov: z.string().min(1, "Le gouvernorat est requis"),
  isForSale: z.boolean().optional()
});

const registrationSchema = z.object({
  // Enterprise Details
  name: z.string().min(1, "Le nom de l'entreprise est requis"),
  description: z.string().optional(),
  email: z.string().email({ message: "Email invalide" }).min(1, "L'email est requis"),
  phone: z.string().min(1, "Le téléphone fixe est requis"),
  mobileOne: z.string().optional(),
  mobileTwo: z.string().optional(),
  matriculeFiscal: z.string().min(1, "Le matricule fiscal est requis"),
  devise: z.string().min(1, "La devise est requise"),
  commercialRegister: z.string().optional(),
  capital: z.string().optional(),
  siegeAddress: z.string().min(1, "L'adresse du siège est requise"),

  // Admin & Legal
  surnameResponsable: z.string().min(1, "Le nom est requis"),
  nameResponsable: z.string().min(1, "Le prénom est requis"),
  positionResponsable: z.string().min(1, "La fonction est requise"),
  
  // App User
  appUsername: z.string().min(1, "Le nom d'utilisateur est requis"),
  appUserSurname: z.string().min(1, "Le prénom d'utilisateur est requis"),
  emailAppUser: z.string().email({ message: "Email invalide" }).min(1, "L'email utilisateur est requis"),
  passwordAppUser: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPasswordAppUser: z.string().min(6, "La confirmation est requise"),
  selectedRole: z.string().min(1, "Le rôle est requis"),
  isWoodSelling: z.boolean().optional(),

  // Sites
  sites: z.array(siteSchema).min(1, "Au moins un site de vente est requis"),
  defaultSiteIndex: z.number().optional()
}).refine((data) => data.passwordAppUser === data.confirmPasswordAppUser, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPasswordAppUser"]
}).refine((data) => data.sites.length <= 1 || data.defaultSiteIndex !== undefined, {
  message: "Veuillez sélectionner le site d'affectation pour l'administrateur",
  path: ["defaultSiteIndex"]
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

import { DEVISES } from '@/lib/constants/settings';

const jobDescOptions = [
  { key: 'GERANT', value: 'Gérant' },
  { key: 'PDG', value: 'PDG' },
  { key: 'DIRECTEUR', value: 'Directeur' },
  { key: 'AUTRE', value: 'Autre' }
];

const roles = [
  { key: '20', value: 'Administrateur' }
];

const governorats = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", 
  "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia", "La Manouba", 
  "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", 
  "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"
];

export default function EnterpriseRegistrationPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('entreprise');
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredSlug, setRegisteredSlug] = useState('');

  // New site form state
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteGov, setNewSiteGov] = useState('');
  const [newSiteIsForSale, setNewSiteIsForSale] = useState(false);
  const [isSiteDialogOpen, setIsSiteDialogOpen] = useState(false);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: 'onChange',
    defaultValues: {
      sites: [],
      isWoodSelling: false,
      selectedRole: "20",
      devise: "TND"
    }
  });

  const { fields: sites, append: appendSite, remove: removeSite } = useFieldArray({
    control,
    name: "sites"
  });

  const handleAddSite = () => {
    if (!newSiteAddress || !newSiteGov) {
      toast.error("Veuillez remplir l'adresse et le gouvernorat du site.");
      return;
    }
    appendSite({
      address: newSiteAddress,
      gov: newSiteGov,
      isForSale: newSiteIsForSale
    });
    setNewSiteAddress('');
    setNewSiteGov('');
    setNewSiteIsForSale(false);
    setIsSiteDialogOpen(false);
  };

  const onSubmit = async (data: RegistrationFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        description: data.description,
        email: data.email,
        phone: data.phone,
        mobileOne: data.mobileOne,
        mobileTwo: data.mobileTwo,
        matriculeFiscal: data.matriculeFiscal,
        devise: data.devise,
        commercialregister: data.commercialRegister,
        capital: data.capital,
        siegeAddress: data.siegeAddress,
        nameResponsable: data.nameResponsable,
        surnameResponsable: data.surnameResponsable,
        positionResponsable: data.positionResponsable,
        issalingwood: data.isWoodSelling ?? false,
        sites: data.sites.map(s => ({
          gov: s.gov,
          address: s.address,
          isForsale: s.isForSale ?? false
        })),
        user: {
          name: data.appUsername,
          surname: data.appUserSurname,
          email: data.emailAppUser,
          password: data.passwordAppUser,
          role: data.selectedRole,
          defaultSiteIndex: data.sites.length === 1 ? 0 : data.defaultSiteIndex
        }
      };

      const apiUrl = getBaseApiUrl();
      const response = await fetch(`${apiUrl}Enterprise/request-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Erreur lors de l\'enregistrement');
      }

      const result = await response.json();
      toast.success("Demande d'enregistrement reçue !");
      setRegisteredSlug(result.slug || '');
      setIsSuccess(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erreur lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWoodSelling = watch("isWoodSelling");

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-corp-blue-50 via-[#EBF1FA] to-[#F8FAFF] px-4 py-12 relative overflow-hidden font-sans">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-corp-blue-200)_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl"
        >
          <Card className="border-slate-200/80 shadow-[0_20px_50px_-20px_rgba(37,99,235,0.15)] bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="text-center pt-10 pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Demande d'inscription reçue !</CardTitle>
              <CardDescription className="text-slate-500 mt-2 text-base">
                Votre espace de travail est en cours de préparation.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 py-6 space-y-6 text-center">
              <p className="text-slate-600 text-sm leading-relaxed">
                Merci de votre inscription à <strong>Élancé ERP</strong>. Notre équipe examine actuellement votre demande.
                Vous recevrez vos informations de connexion par email dès que votre instance sera provisionnée.
              </p>
              
              <div className="p-5 bg-corp-blue-50/50 border border-corp-blue-100 rounded-xl space-y-3 text-left">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Sous-domaine réservé :</span>
                  <span className="font-bold text-corp-blue-700 font-mono">{registeredSlug}.acya.site</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Statut de la demande :</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    En attente de validation
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-slate-400">
                Une question ? Contactez notre support commercial à <a href="mailto:support@acya.site" className="text-corp-blue-600 hover:underline">support@acya.site</a>
              </p>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t border-slate-100 px-8 py-6 flex justify-center">
              <Button asChild className="h-12 px-8 font-bold bg-gradient-to-r from-corp-blue-600 to-corp-blue-800 hover:from-corp-blue-500 hover:to-corp-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all">
                <Link href="/">Retourner à l'accueil</Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-corp-blue-50 via-[#EBF1FA] to-[#F8FAFF] px-4 py-12 relative overflow-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-corp-blue-200)_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-corp-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-corp-blue-50/50 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-4xl relative z-10"
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
          <h1 className="text-3xl font-bold text-corp-blue-900 mt-6 tracking-tight">Inscription Entreprise</h1>
          <p className="text-sand-400 font-medium text-sm mt-1">Rejoignez la plateforme Élancé</p>
        </div>

        <Card className="border-corp-blue-100 shadow-[0_20px_60px_rgba(11,59,36,0.08)] bg-card/80 backdrop-blur-md rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit, (errs) => {
            console.warn("Validation errors:", errs);
            toast.error("Veuillez corriger les erreurs de validation.");
            const errorKeys = Object.keys(errs);
            if (errorKeys.length > 0) {
              const firstErrorKey = errorKeys[0];
              if (['name', 'email', 'phone', 'matriculeFiscal', 'devise', 'siegeAddress'].includes(firstErrorKey)) {
                setActiveTab('entreprise');
              } else if (['surnameResponsable', 'nameResponsable', 'positionResponsable', 'appUsername', 'appUserSurname', 'emailAppUser', 'passwordAppUser', 'confirmPasswordAppUser', 'selectedRole'].includes(firstErrorKey)) {
                setActiveTab('admin');
              } else if (['sites', 'defaultSiteIndex'].includes(firstErrorKey)) {
                setActiveTab('sites');
              }
            }
          })}>
            <CardContent className="space-y-10 px-6 sm:px-10 pt-10 pb-8">
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-3 mb-8 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/60 shadow-inner">
                  <TabsTrigger value="entreprise" className="rounded-lg py-3 text-slate-600 data-active:bg-white data-active:shadow-md data-active:text-corp-blue-700 transition-all">
                    <Building2 size={18} /> <span className="hidden sm:inline">Détails Entreprise</span>
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="rounded-lg py-3 text-slate-600 data-active:bg-white data-active:shadow-md data-active:text-corp-blue-700 transition-all">
                    <ShieldCheck size={18} /> <span className="hidden sm:inline">Administrateur</span>
                  </TabsTrigger>
                  <TabsTrigger value="sites" className="rounded-lg py-3 text-slate-600 data-active:bg-white data-active:shadow-md data-active:text-corp-blue-700 transition-all">
                    <Store size={18} /> <span className="hidden sm:inline">Sites & Dépôts</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="entreprise" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Entreprise Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-sand-100 pb-3">
                      <div className="w-10 h-10 rounded-xl bg-corp-blue-50 text-corp-blue-600 flex items-center justify-center shrink-0">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Détails de l'Entreprise</h2>
                        <p className="text-sm text-slate-500 font-medium">Informations générales et légales</p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <Label >Nom de l'entreprise *</Label>
                        <Input {...register("name")} placeholder="Ex: Menuiserie Dupont" className="h-11 bg-slate-50/50 border-slate-200 focus:border-corp-blue-500 focus:ring-corp-blue-500/20" />
                        {errors.name && <p className="text-red-500 text-xs font-medium mt-1">{errors.name.message}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label >Description</Label>
                        <Input {...register("description")} placeholder="Brève description de vos activités" className="h-11 bg-slate-50/50" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <Label className=" flex items-center gap-2"><Mail size={14}/> Email *</Label>
                          <Input {...register("email")} type="email" placeholder="contact@entreprise.com" className="h-11 bg-slate-50/50" />
                          {errors.email && <p className="text-red-500 text-xs font-medium mt-1">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label className=" flex items-center gap-2"><Phone size={14}/> Téléphone Fixe *</Label>
                          <Input {...register("phone")} placeholder="+216 71 000 000" className="h-11 bg-slate-50/50" />
                          {errors.phone && <p className="text-red-500 text-xs font-medium mt-1">{errors.phone.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <Label >Mobile 1</Label>
                          <Input {...register("mobileOne")} placeholder="+216 22 000 000" className="h-11 bg-slate-50/50" />
                        </div>
                        <div className="space-y-1.5">
                          <Label >Mobile 2</Label>
                          <Input {...register("mobileTwo")} placeholder="+216 55 000 000" className="h-11 bg-slate-50/50" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                        <div className="space-y-1.5">
                          <Label className=" flex items-center gap-2"><FileText size={14}/> Matricule Fiscal *</Label>
                          <div className="relative group">
                            <Input 
                              {...register("matriculeFiscal")} 
                              placeholder="Cliquez pour saisir le MF" 
                              className="h-11 bg-slate-50/50 font-mono cursor-pointer pr-12" 
                              readOnly
                              onClick={() => setIsTaxModalOpen(true)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-corp-blue-600 hover:bg-corp-blue-50"
                              onClick={() => setIsTaxModalOpen(true)}
                            >
                              <BadgeInfo className="w-4 h-4" />
                            </Button>
                          </div>
                          {errors.matriculeFiscal && <p className="text-red-500 text-xs font-medium mt-1">{errors.matriculeFiscal.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label >Devise *</Label>
                          <Select value={watch("devise")} onValueChange={(val: string | null) => { if (val) setValue("devise", val); }}>
                            <SelectTrigger className="h-11 bg-slate-50/50">
                              <SelectValue placeholder="Sélectionner une devise">
                                {watch("devise") ? DEVISES.find(opt => opt.key === watch("devise"))?.value : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {DEVISES.map(opt => (
                                <SelectItem key={opt.key} value={opt.key}>{opt.value}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.devise && <p className="text-red-500 text-xs font-medium mt-1">{errors.devise.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <Label >Registre de Commerce</Label>
                          <Input {...register("commercialRegister")} placeholder="N° RC" className="h-11 bg-slate-50/50" />
                        </div>
                        <div className="space-y-1.5">
                          <Label >Capital</Label>
                          <Input {...register("capital")} placeholder="Ex: 50 000,000" className="h-11 bg-slate-50/50" />
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <Label className=" flex items-center gap-2"><MapPin size={14}/> Adresse du Siège *</Label>
                        <Input {...register("siegeAddress")} placeholder="Adresse complète" className="h-11 bg-slate-50/50" />
                        {errors.siegeAddress && <p className="text-red-500 text-xs font-medium mt-1">{errors.siegeAddress.message}</p>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={() => setActiveTab('admin')} className="bg-corp-blue-600 hover:bg-corp-blue-700 text-white gap-2 h-11 px-6 rounded-lg shadow-sm">
                      Suivant <ArrowRight size={18} />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="admin" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Administrateur Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-sand-100 pb-3">
                      <div className="w-10 h-10 rounded-xl bg-corp-blue-50 text-corp-blue-600 flex items-center justify-center shrink-0">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Administrateur & Accès</h2>
                        <p className="text-sm text-slate-500 font-medium">Représentant légal et compte utilisateur</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      
                      {/* Responsable */}
                      <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-100 space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Briefcase size={14} /> Le Représentant
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label >Nom *</Label>
                            <Input {...register("surnameResponsable")} placeholder="Nom du responsable" className="bg-white h-11" />
                            {errors.surnameResponsable && <p className="text-red-500 text-xs mt-1">{errors.surnameResponsable.message}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <Label >Prénom *</Label>
                            <Input {...register("nameResponsable")} placeholder="Prénom du responsable" className="bg-white h-11" />
                            {errors.nameResponsable && <p className="text-red-500 text-xs mt-1">{errors.nameResponsable.message}</p>}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label >Fonction *</Label>
                          <Select value={watch("positionResponsable")} onValueChange={(val: string | null) => { if (val) setValue("positionResponsable", val); }}>
                            <SelectTrigger className="bg-white h-11">
                              <SelectValue placeholder="Sélectionner la fonction">
                                {watch("positionResponsable") ? jobDescOptions.find(opt => opt.key === watch("positionResponsable"))?.value : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {jobDescOptions.map(opt => (
                                <SelectItem key={opt.key} value={opt.key}>{opt.value}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.positionResponsable && <p className="text-red-500 text-xs mt-1">{errors.positionResponsable.message}</p>}
                        </div>
                      </div>

                      {/* App User */}
                      <div className="p-5 bg-corp-blue-50/50 rounded-xl border border-corp-blue-100/50 space-y-4">
                        <h3 className="text-sm font-bold text-corp-blue-400 uppercase tracking-wider flex items-center gap-2">
                          <User size={14} /> Compte Utilisateur
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label >Nom d'utilisateur *</Label>
                            <Input {...register("appUsername")} placeholder="Nom" className="bg-white h-11" />
                            {errors.appUsername && <p className="text-red-500 text-xs mt-1">{errors.appUsername.message}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <Label >Prénom d'utilisateur *</Label>
                            <Input {...register("appUserSurname")} placeholder="Prénom" className="bg-white h-11" />
                            {errors.appUserSurname && <p className="text-red-500 text-xs mt-1">{errors.appUserSurname.message}</p>}
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className=" flex items-center gap-2">Login (Email) *</Label>
                          <Input {...register("emailAppUser")} type="email" placeholder="email@domaine.com" className="bg-white h-11" />
                          {errors.emailAppUser && <p className="text-red-500 text-xs mt-1">{errors.emailAppUser.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5 relative">
                            <Label >Mot de Passe *</Label>
                            <div className="relative">
                              <Input {...register("passwordAppUser")} type={showPassword ? "text" : "password"} className="bg-white h-11 pr-10" />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                            {errors.passwordAppUser && <p className="text-red-500 text-xs mt-1">{errors.passwordAppUser.message}</p>}
                          </div>
                          <div className="space-y-1.5 relative">
                            <Label >Confirmer *</Label>
                            <div className="relative">
                              <Input {...register("confirmPasswordAppUser")} type={showConfirmPassword ? "text" : "password"} className="bg-white h-11 pr-10" />
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                            {errors.confirmPasswordAppUser && <p className="text-red-500 text-xs mt-1">{errors.confirmPasswordAppUser.message}</p>}
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <Label >Rôle *</Label>
                          <Select value={watch("selectedRole")} onValueChange={(val: string | null) => { if (val) setValue("selectedRole", val); }}>
                            <SelectTrigger className="bg-white h-11">
                              <SelectValue placeholder="Sélectionner le rôle">
                                {watch("selectedRole") ? roles.find(opt => opt.key === watch("selectedRole"))?.value : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(opt => (
                                <SelectItem key={opt.key} value={opt.key}>{opt.value}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.selectedRole && <p className="text-red-500 text-xs mt-1">{errors.selectedRole.message}</p>}
                        </div>

                        <div className="pt-4 pb-1">
                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <Checkbox 
                              checked={isWoodSelling}
                              onCheckedChange={(checked) => setValue("isWoodSelling", checked === true)}
                              className="h-5 w-5 border-corp-blue-300 data-[state=checked]:bg-corp-blue-600 rounded" 
                            />
                            <span className="text-slate-700 font-bold group-hover:text-corp-blue-700 transition-colors flex items-center gap-2">
                              <Factory size={16} className="text-timber-600" /> 
                              L'entreprise vend-elle du bois ?
                            </span>
                          </label>
                        </div>

                      </div>

                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={() => setActiveTab('entreprise')} className="gap-2 h-11 px-6 rounded-lg text-slate-600 border-slate-200 shadow-sm">
                      <ArrowLeft size={18} /> Précédent
                    </Button>
                    <Button type="button" onClick={() => setActiveTab('sites')} className="bg-corp-blue-600 hover:bg-corp-blue-700 text-white gap-2 h-11 px-6 rounded-lg shadow-sm">
                      Suivant <ArrowRight size={18} />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="sites" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Sites Section */}
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-sand-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-timber-50 text-timber-600 flex items-center justify-center shrink-0">
                          <Store size={20} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-800">Sites de Vente & Dépôts</h2>
                          <p className="text-sm text-slate-500 font-medium">Ajoutez au minimum un site pour l'entreprise</p>
                        </div>
                      </div>
                      <Dialog open={isSiteDialogOpen} onOpenChange={setIsSiteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" className="h-11 px-6 bg-corp-blue-500 hover:bg-corp-blue-600 text-white shadow-md shadow-corp-blue-500/20 rounded-lg gap-2 transition-all">
                            <Plus size={18} /> Ajouter
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Nouveau site</DialogTitle>
                            <DialogDescription>
                              Renseignez les informations du nouveau site ou dépôt.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                              <Label >Adresse du site</Label>
                              <Input 
                                value={newSiteAddress} 
                                onChange={(e) => setNewSiteAddress(e.target.value)} 
                                placeholder="Ex: Z.I. Megrine" 
                                className="bg-slate-50 h-11"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label >Gouvernorat</Label>
                              <Select value={newSiteGov} onValueChange={(val: string | null) => { if (val) setNewSiteGov(val); }}>
                                <SelectTrigger className="bg-slate-50 h-11">
                                  <SelectValue placeholder="Sélectionner un gouvernorat" />
                                </SelectTrigger>
                                <SelectContent>
                                  {governorats.map(gov => (
                                    <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center h-11 pt-2">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <Checkbox 
                                  checked={newSiteIsForSale}
                                  onCheckedChange={(checked) => setNewSiteIsForSale(checked === true)}
                                  className="rounded" 
                                />
                                <span className="text-sm font-semibold text-slate-700">Est un point de vente</span>
                              </label>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSiteDialogOpen(false)}>Annuler</Button>
                            <Button type="button" onClick={handleAddSite} className="bg-corp-blue-500 hover:bg-corp-blue-600 text-white shadow-md shadow-corp-blue-500/20 gap-2 transition-all"><Plus size={16}/> Ajouter le site</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <div className="space-y-6">
                      {errors.sites && <p className="text-red-500 text-sm font-medium">{errors.sites.message}</p>}

                      {/* Sites Table */}
                      {sites.length > 0 ? (
                        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="w-[80px] font-bold text-slate-600">N°</TableHead>
                                <TableHead className="font-bold text-slate-600">Adresse</TableHead>
                                <TableHead className="font-bold text-slate-600">Gouvernorat</TableHead>
                                <TableHead className="font-bold text-slate-600">Point de Vente</TableHead>
                                <TableHead className="text-right font-bold text-slate-600">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <AnimatePresence>
                                {sites.map((site, index) => (
                                  <motion.tr 
                                    key={site.id}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                                  >
                                    <TableCell className="font-medium text-slate-500">{index + 1}</TableCell>
                                    <TableCell className="font-medium text-slate-800">{site.address}</TableCell>
                                    <TableCell>
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-sm font-medium">
                                        {site.gov}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      {site.isForSale ? (
                                        <span className="flex items-center text-corp-blue-600 font-bold text-sm gap-1.5">
                                          <CheckCircle2 size={16} /> Oui
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-medium text-sm">Non</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSite(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 rounded-md">
                                        <Trash2 size={16} />
                                      </Button>
                                    </TableCell>
                                  </motion.tr>
                                ))}
                              </AnimatePresence>
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          <MapPin size={40} className="text-slate-300 mb-3" />
                          <p className="text-slate-500 font-medium text-center">Aucun site enregistré.<br/>Veuillez en ajouter au minimum un.</p>
                        </div>
                      )}
                      {sites.length > 1 && (
                        <div className="p-4 bg-corp-blue-50/50 rounded-xl border border-corp-blue-100/50 space-y-2 mt-6">
                          <Label className="text-corp-blue-900 font-semibold flex items-center gap-2">
                            <Store size={16} /> Site d'affectation pour l'Administrateur *
                          </Label>
                          <Select 
                            value={watch('defaultSiteIndex')?.toString() || ''} 
                            onValueChange={(val: string | null) => { if (val) setValue('defaultSiteIndex', parseInt(val)); }}
                          >
                            <SelectTrigger className="bg-white h-11 border-corp-blue-200 focus:ring-corp-blue-500/20">
                              <SelectValue placeholder="Sélectionnez le site de l'administrateur">
                                {watch('defaultSiteIndex') !== undefined ? `${sites[watch('defaultSiteIndex')!]?.address} (${sites[watch('defaultSiteIndex')!]?.gov})` : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {sites.map((site, idx) => (
                                <SelectItem key={idx} value={idx.toString()}>
                                  {site.address} ({site.gov})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.defaultSiteIndex && <p className="text-red-500 text-sm font-medium mt-1">{errors.defaultSiteIndex.message}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-start pt-4">
                    <Button type="button" variant="outline" onClick={() => setActiveTab('admin')} className="gap-2 h-11 px-6 rounded-lg text-slate-600 border-slate-200 shadow-sm">
                      <ArrowLeft size={18} /> Précédent
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-4 px-6 sm:px-10 py-6 bg-slate-50 border-t border-slate-100">
              <Button type="button" variant="outline" asChild className="h-14 px-8 text-base font-bold border-slate-200 hover:bg-slate-50 text-slate-600 w-full sm:w-auto">
                <Link href="/">Annuler</Link>
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || sites.length === 0} 
                className="h-14 px-10 text-base font-bold bg-linear-to-r from-corp-blue-600 to-corp-blue-800 hover:from-corp-blue-500 hover:to-corp-blue-700 text-white shadow-xl shadow-corp-blue-900/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enregistrement...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} />
                    Enregistrer l&apos;Entreprise
                  </div>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>

      <TaxRegistrationDialog 
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
        onConfirm={(val) => setValue('matriculeFiscal', val, { shouldValidate: true })}
        initialValue={watch('matriculeFiscal')}
      />
    </div>
  );
}

