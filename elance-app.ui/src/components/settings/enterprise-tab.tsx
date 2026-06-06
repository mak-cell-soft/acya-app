'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnterprise, useUpdateEnterprise } from '@/hooks/use-enterprise';
import { DEVISES, JOB_DESCRIPTION } from '@/lib/constants/settings';
import { Building2, UserCircle, Save, Loader2 } from 'lucide-react';
import { SitesSection } from './sites-section';
import { motion } from 'framer-motion';

const enterpriseSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().min(1, 'Description requise'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(1, 'Téléphone requis'),
  mobileOne: z.string().min(1, 'Mobile 1 requis'),
  mobileTwo: z.string().optional(),
  matriculeFiscal: z.string().min(1, 'Matricule fiscal requis'),
  devise: z.string().min(1, 'Devise requise'),
  nameResponsable: z.string().min(1, 'Nom responsable requis'),
  surnameResponsable: z.string().min(1, 'Prénom responsable requis'),
  positionResponsable: z.string().min(1, 'Poste requis'),
  siegeAddress: z.string().min(1, 'Adresse siège requise'),
  commercialregister: z.string().min(1, 'Registre de commerce requis'),
  capital: z.string().min(1, 'Capital requis'),
});

type EnterpriseFormValues = z.infer<typeof enterpriseSchema>;

export function EnterpriseTab() {
  const { data: enterprise, isLoading } = useEnterprise();
  const updateEnterprise = useUpdateEnterprise();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<EnterpriseFormValues>({
    resolver: zodResolver(enterpriseSchema),
    defaultValues: {
      name: '',
      description: '',
      email: '',
      phone: '',
      mobileOne: '',
      mobileTwo: '',
      matriculeFiscal: '',
      devise: '',
      nameResponsable: '',
      surnameResponsable: '',
      positionResponsable: '',
      siegeAddress: '',
      commercialregister: '',
      capital: '',
    },
  });

  React.useEffect(() => {
    if (enterprise) {
      reset({
        name: enterprise.name,
        description: enterprise.description,
        email: enterprise.email,
        phone: enterprise.phone,
        mobileOne: enterprise.mobileOne,
        mobileTwo: enterprise.mobileTwo || '',
        matriculeFiscal: enterprise.matriculeFiscal,
        devise: enterprise.devise,
        nameResponsable: enterprise.nameResponsable,
        surnameResponsable: enterprise.surnameResponsable,
        positionResponsable: enterprise.positionResponsable,
        siegeAddress: enterprise.siegeAddress,
        commercialregister: enterprise.commercialregister,
        capital: enterprise.capital,
      });
    }
  }, [enterprise, reset]);

  const onSubmit = (data: EnterpriseFormValues) => {
    updateEnterprise.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
        {/* General Info Section */}
        <section className="grid lg:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-forest-900 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-forest-50 text-forest-600">
                <Building2 className="w-5 h-5" />
              </div>
              Identité de l'Entreprise
            </h3>
            <p className="text-[0.9rem] text-sand-400 font-medium leading-relaxed">
              Informations légales et coordonnées de votre établissement.
            </p>
          </div>
          <Card className="lg:col-span-2 border-forest-100 rounded-xl shadow-sm bg-white overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-forest-900">Nom de l'entreprise</Label>
                  <Input 
                    {...register('name')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                  {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-forest-900">Email</Label>
                  <Input 
                    {...register('email')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                  {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
                </div>
                <div className="space-y-2.5 md:col-span-2">
                  <Label className="text-sm font-bold text-forest-900">Description</Label>
                  <Input 
                    {...register('description')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                  {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-forest-900">Téléphone Fixe</Label>
                  <Input 
                    {...register('phone')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-forest-900">Mobile 1</Label>
                  <Input 
                    {...register('mobileOne')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-forest-900">Mobile 2</Label>
                  <Input 
                    {...register('mobileTwo')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-forest-900">Devise</Label>
                  <Select 
                    value={watch('devise') || ''} 
                    onValueChange={(val) => setValue('devise', val || '', { shouldDirty: true })}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-sand-50 border-forest-100">
                      <SelectValue placeholder="Choisir une devise" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVISES.map((d) => (
                        <SelectItem key={d.key} value={d.value}>{d.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2.5 md:col-span-2">
                  <Label className="text-sm font-bold text-forest-900">Matricule Fiscal</Label>
                  <Input 
                    {...register('matriculeFiscal')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="h-px bg-forest-50" />

        {/* Responsible Section */}
        <section className="grid lg:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-forest-900 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-forest-50 text-forest-600">
                <UserCircle className="w-5 h-5" />
              </div>
              Responsable & Siège
            </h3>
            <p className="text-[0.9rem] text-sand-400 font-medium leading-relaxed">
              Détails sur le représentant légal et l'adresse du siège social.
            </p>
          </div>
          <Card className="lg:col-span-2 border-forest-100 rounded-xl shadow-sm bg-white overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-forest-900">Nom du Responsable</Label>
                  <Input 
                    {...register('nameResponsable')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-forest-900">Prénom du Responsable</Label>
                  <Input 
                    {...register('surnameResponsable')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-forest-900">Poste / Fonction</Label>
                  <Select 
                    value={watch('positionResponsable') || ''} 
                    onValueChange={(val) => setValue('positionResponsable', val || '', { shouldDirty: true })}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-sand-50 border-forest-100">
                      <SelectValue placeholder="Choisir un poste" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_DESCRIPTION.map((j) => (
                        <SelectItem key={j.key} value={j.value}>{j.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-forest-900">Capital Social</Label>
                  <Input 
                    {...register('capital')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2.5 md:col-span-2">
                  <Label className="text-sm font-bold text-forest-900">Registre de Commerce</Label>
                  <Input 
                    {...register('commercialregister')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2.5 md:col-span-2">
                  <Label className="text-sm font-bold text-forest-900">Adresse du Siège</Label>
                  <Input 
                    {...register('siegeAddress')} 
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  disabled={!isDirty || updateEnterprise.isPending}
                  className="bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20 gap-2 h-12 px-8 transition-all duration-300"
                >
                  {updateEnterprise.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Enregistrer les modifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </form>

      <div className="h-px bg-forest-50" />

      {/* Sites Section */}
      <SitesSection enterpriseId={enterprise?.id || 1} />
    </div>
  );
}

