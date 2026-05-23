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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Mail, Phone, MapPin, User, Briefcase, Plus, Trash2, ShieldCheck, Store, ArrowLeft, Eye, EyeOff, FileText, CheckCircle2, Factory } from 'lucide-react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/shared/public-navbar';
import { PublicFooter } from '@/components/shared/public-footer';
import { toast } from 'sonner';

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
  sites: z.array(siteSchema).min(1, "Au moins un site de vente est requis")
}).refine((data) => data.passwordAppUser === data.confirmPasswordAppUser, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPasswordAppUser"]
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

const devisesOptions = [
  { key: 'TND', value: 'Dinar Tunisien (TND)' },
  { key: 'EUR', value: 'Euro (€)' },
  { key: 'USD', value: 'Dollar ($)' }
];

const jobDescOptions = [
  { key: 'GERANT', value: 'Gérant' },
  { key: 'PDG', value: 'PDG' },
  { key: 'DIRECTEUR', value: 'Directeur' },
  { key: 'AUTRE', value: 'Autre' }
];

const roles = [
  { key: 'ADMIN', value: 'Administrateur' },
  { key: 'MANAGER', value: 'Manager' },
  { key: 'USER', value: 'Utilisateur' }
];

const governorats = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", 
  "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia", "La Manouba", 
  "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", 
  "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"
];

export default function EnterpriseRegistrationPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New site form state
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteGov, setNewSiteGov] = useState('');
  const [newSiteIsForSale, setNewSiteIsForSale] = useState(false);
  const [isSiteDialogOpen, setIsSiteDialogOpen] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      sites: [],
      isWoodSelling: false
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
      // Simulate API Call
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Form data:', data);
      toast.success("Entreprise enregistrée avec succès !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWoodSelling = watch("isWoodSelling");

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-corp-blue-50/40 to-slate-100 flex flex-col font-sans selection:bg-corp-blue-500/20">
      <PublicNavbar />

      <main className="flex-1 pt-32 pb-24 px-4 sm:px-6 md:px-10 max-w-[1400px] mx-auto w-full">
        {/* Animated Header */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-corp-blue-600 hover:text-corp-blue-800 transition-colors mb-6 bg-corp-blue-50 px-4 py-1.5 rounded-full border border-corp-blue-100">
              <ArrowLeft size={16} />
              Retour à l&apos;accueil
            </Link>
            <h1 className="text-4xl md:text-5xl font-extrabold font-heading text-slate-900 tracking-tight mb-4">
              Inscription <span className="bg-linear-to-r from-corp-blue-600 to-corp-cyan bg-clip-text text-transparent">Entreprise</span>
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              Rejoignez la plateforme Élancé et digitalisez votre activité commerciale dès aujourd&apos;hui.
            </p>
          </motion.div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column: Enterprise Details */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl h-full rounded-2xl overflow-hidden">
                <div className="h-2 w-full bg-linear-to-r from-forest-600 to-timber-400"></div>
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest-600 flex items-center justify-center shrink-0">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-slate-800">Détails de l&apos;Entreprise</CardTitle>
                      <CardDescription className="text-slate-500 font-medium">Informations générales et légales</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Nom de l&apos;entreprise *</Label>
                    <Input {...register("name")} placeholder="Ex: Menuiserie Dupont" className="h-11 bg-slate-50/50 border-slate-200 focus:border-corp-blue-500 focus:ring-corp-blue-500/20" />
                    {errors.name && <p className="text-red-500 text-xs font-medium mt-1">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Description</Label>
                    <Input {...register("description")} placeholder="Brève description de vos activités" className="h-11 bg-slate-50/50" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold flex items-center gap-2"><Mail size={14}/> Email *</Label>
                      <Input {...register("email")} type="email" placeholder="contact@entreprise.com" className="h-11 bg-slate-50/50" />
                      {errors.email && <p className="text-red-500 text-xs font-medium mt-1">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold flex items-center gap-2"><Phone size={14}/> Téléphone Fixe *</Label>
                      <Input {...register("phone")} placeholder="+216 71 000 000" className="h-11 bg-slate-50/50" />
                      {errors.phone && <p className="text-red-500 text-xs font-medium mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold">Mobile 1</Label>
                      <Input {...register("mobileOne")} placeholder="+216 22 000 000" className="h-11 bg-slate-50/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold">Mobile 2</Label>
                      <Input {...register("mobileTwo")} placeholder="+216 55 000 000" className="h-11 bg-slate-50/50" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold flex items-center gap-2"><FileText size={14}/> Matricule Fiscal *</Label>
                      <Input {...register("matriculeFiscal")} placeholder="Ex: 1234567/A/B/C/000" className="h-11 bg-slate-50/50" />
                      {errors.matriculeFiscal && <p className="text-red-500 text-xs font-medium mt-1">{errors.matriculeFiscal.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold">Devise *</Label>
                      <Select onValueChange={(val: string | null) => { if (val) setValue("devise", val); }}>
                        <SelectTrigger className="h-11 bg-slate-50/50">
                          <SelectValue placeholder="Sélectionner une devise" />
                        </SelectTrigger>
                        <SelectContent>
                          {devisesOptions.map(opt => (
                            <SelectItem key={opt.key} value={opt.key}>{opt.value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.devise && <p className="text-red-500 text-xs font-medium mt-1">{errors.devise.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold">Registre de Commerce</Label>
                      <Input {...register("commercialRegister")} placeholder="N° RC" className="h-11 bg-slate-50/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold">Capital</Label>
                      <Input {...register("capital")} placeholder="Ex: 50 000,000" className="h-11 bg-slate-50/50" />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <Label className="text-slate-700 font-semibold flex items-center gap-2"><MapPin size={14}/> Adresse du Siège *</Label>
                    <Input {...register("siegeAddress")} placeholder="Adresse complète" className="h-11 bg-slate-50/50" />
                    {errors.siegeAddress && <p className="text-red-500 text-xs font-medium mt-1">{errors.siegeAddress.message}</p>}
                  </div>

                </CardContent>
              </Card>
            </motion.div>

            {/* Right Column: Admin & Legal */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl h-full rounded-2xl overflow-hidden">
                <div className="h-2 w-full bg-linear-to-r from-corp-blue-600 to-corp-cyan"></div>
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-corp-blue-50 text-corp-blue-600 flex items-center justify-center shrink-0">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-slate-800">Administrateur & Accès</CardTitle>
                      <CardDescription className="text-slate-500 font-medium">Représentant légal et compte utilisateur</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Responsable */}
                  <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-100 space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Briefcase size={14} /> Le Représentant
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 font-semibold">Nom *</Label>
                        <Input {...register("surnameResponsable")} placeholder="Nom du responsable" className="bg-white h-11" />
                        {errors.surnameResponsable && <p className="text-red-500 text-xs mt-1">{errors.surnameResponsable.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 font-semibold">Prénom *</Label>
                        <Input {...register("nameResponsable")} placeholder="Prénom du responsable" className="bg-white h-11" />
                        {errors.nameResponsable && <p className="text-red-500 text-xs mt-1">{errors.nameResponsable.message}</p>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold">Fonction *</Label>
                      <Select onValueChange={(val: string | null) => { if (val) setValue("positionResponsable", val); }}>
                        <SelectTrigger className="bg-white h-11">
                          <SelectValue placeholder="Sélectionner la fonction" />
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
                        <Label className="text-slate-700 font-semibold">Nom d&apos;utilisateur *</Label>
                        <Input {...register("appUsername")} placeholder="Nom" className="bg-white h-11" />
                        {errors.appUsername && <p className="text-red-500 text-xs mt-1">{errors.appUsername.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 font-semibold">Prénom d&apos;utilisateur *</Label>
                        <Input {...register("appUserSurname")} placeholder="Prénom" className="bg-white h-11" />
                        {errors.appUserSurname && <p className="text-red-500 text-xs mt-1">{errors.appUserSurname.message}</p>}
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold flex items-center gap-2">Login (Email) *</Label>
                      <Input {...register("emailAppUser")} type="email" placeholder="email@domaine.com" className="bg-white h-11" />
                      {errors.emailAppUser && <p className="text-red-500 text-xs mt-1">{errors.emailAppUser.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 relative">
                        <Label className="text-slate-700 font-semibold">Mot de Passe *</Label>
                        <div className="relative">
                          <Input {...register("passwordAppUser")} type={showPassword ? "text" : "password"} className="bg-white h-11 pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {errors.passwordAppUser && <p className="text-red-500 text-xs mt-1">{errors.passwordAppUser.message}</p>}
                      </div>
                      <div className="space-y-1.5 relative">
                        <Label className="text-slate-700 font-semibold">Confirmer *</Label>
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
                      <Label className="text-slate-700 font-semibold">Rôle *</Label>
                      <Select onValueChange={(val: string | null) => { if (val) setValue("selectedRole", val); }}>
                        <SelectTrigger className="bg-white h-11">
                          <SelectValue placeholder="Sélectionner le rôle" />
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
                          L&apos;entreprise vend-elle du bois ?
                        </span>
                      </label>
                    </div>

                  </div>

                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sites Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden">
              <div className="h-2 w-full bg-linear-to-r from-timber-600 to-corp-cyan"></div>
              <CardHeader className="pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-timber-100 text-timber-600 flex items-center justify-center shrink-0">
                    <Store size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-slate-800">Sites de Vente & Dépôts</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">Ajoutez au minimum un site pour l&apos;entreprise</CardDescription>
                  </div>
                </div>
                <Dialog open={isSiteDialogOpen} onOpenChange={setIsSiteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" className="h-11 px-6 bg-slate-800 hover:bg-slate-900 text-white rounded-lg gap-2">
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
                        <Label className="text-slate-700 font-semibold">Adresse du site</Label>
                        <Input 
                          value={newSiteAddress} 
                          onChange={(e) => setNewSiteAddress(e.target.value)} 
                          placeholder="Ex: Z.I. Megrine" 
                          className="bg-slate-50 h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 font-semibold">Gouvernorat</Label>
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
                      <Button type="button" onClick={handleAddSite} className="bg-slate-800 hover:bg-slate-900 text-white gap-2"><Plus size={16}/> Ajouter le site</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-6">

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
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                                  {site.gov}
                                </span>
                              </TableCell>
                              <TableCell>
                                {site.isForSale ? (
                                  <span className="flex items-center text-forest-600 font-bold text-sm gap-1.5">
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
                
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex justify-end gap-4 pt-4"
          >
            <Button type="button" variant="outline" asChild className="h-14 px-8 text-base font-bold rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600">
              <Link href="/">Annuler</Link>
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || sites.length === 0} 
              className="h-14 px-10 text-base font-bold rounded-xl bg-linear-to-r from-corp-blue-600 to-corp-blue-800 hover:from-corp-blue-500 hover:to-corp-blue-700 text-white shadow-xl shadow-corp-blue-900/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Enregistrement...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} />
                  Enregistrer l&apos;Entreprise
                </div>
              )}
            </Button>
          </motion.div>

        </form>
      </main>

      <PublicFooter />
    </div>
  );
}
