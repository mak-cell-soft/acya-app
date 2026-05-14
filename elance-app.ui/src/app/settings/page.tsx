'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { motion } from 'framer-motion';
import { Bell, Lock, User, Globe, Shield, Save } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <DashboardLayout>
      <div className="space-y-10 max-w-[1200px] mx-auto font-sans">
        <header>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-forest-900">Paramètres</h1>
            <p className="text-sand-400 mt-2 font-medium">
              Personnalisez vos préférences de compte et la configuration globale.
            </p>
          </motion.div>
        </header>

        <div className="grid gap-12">
          <section className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-forest-900 flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-forest-50 text-forest-600">
                  <User className="w-5 h-5" />
                </div>
                Profil Personnel
              </h3>
              <p className="text-[0.9rem] text-sand-400 font-medium leading-relaxed">Mettez à jour vos informations personnelles et votre présence publique.</p>
            </div>
            <Card className="lg:col-span-2 border-forest-100 rounded-[24px] shadow-sm bg-white overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="name" className="text-sm font-bold text-forest-900">Nom Complet</Label>
                    <Input id="name" defaultValue={user?.name} className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 focus:ring-forest-600 outline-none transition-all font-medium" />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-sm font-bold text-forest-900">Adresse Email</Label>
                    <Input id="email" defaultValue={user?.email} className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 focus:ring-forest-600 outline-none transition-all font-medium" />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="bio" className="text-sm font-bold text-forest-900">Bio</Label>
                  <Input id="bio" placeholder="Dites-en un peu plus sur vous..." className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 focus:ring-forest-600 outline-none transition-all font-medium" />
                </div>
                <div className="flex justify-end pt-2">
                  <Button className="rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20 gap-2 h-12 px-8 transition-all duration-300">
                    <Save className="w-5 h-5" /> Enregistrer les modifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="h-px bg-forest-50" />

          <section className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-forest-900 flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-forest-50 text-forest-600">
                  <Lock className="w-5 h-5" />
                </div>
                Sécurité
              </h3>
              <p className="text-[0.9rem] text-sand-400 font-medium leading-relaxed">Protégez votre compte avec l'authentification à deux facteurs.</p>
            </div>
            <Card className="lg:col-span-2 border-forest-100 rounded-[24px] shadow-sm bg-white overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label className="text-[1rem] font-bold text-forest-900">Authentification à deux facteurs</Label>
                    <p className="text-[0.85rem] text-sand-400 font-medium">Ajoutez une couche de sécurité supplémentaire à votre compte.</p>
                  </div>
                  <Button variant="outline" className="rounded-xl border-forest-100 text-forest-600 hover:bg-forest-50 font-bold h-10 px-6">Activer</Button>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-forest-50 pt-8">
                  <div className="space-y-1">
                    <Label className="text-[1rem] font-bold text-forest-900">Sessions Actives</Label>
                    <p className="text-[0.85rem] text-sand-400 font-medium">Vous êtes actuellement connecté sur 2 appareils.</p>
                  </div>
                  <Button variant="ghost" className="text-forest-600 hover:bg-forest-50 font-bold rounded-xl h-10 px-4">Voir les sessions</Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="h-px bg-forest-50" />

          <section className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-forest-900 flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-forest-50 text-forest-600">
                  <Bell className="w-5 h-5" />
                </div>
                Notifications
              </h3>
              <p className="text-[0.9rem] text-sand-400 font-medium leading-relaxed">Contrôlez comment vous recevez les alertes et les mises à jour.</p>
            </div>
            <Card className="lg:col-span-2 border-forest-100 rounded-[24px] shadow-sm bg-white overflow-hidden">
              <CardContent className="p-8 space-y-4">
                {[
                  { title: 'Notifications par Email', description: 'Recevez des rapports de performance hebdomadaires.', active: true },
                  { title: 'Notifications Push', description: 'Alertes pour les nouvelles ventes et invitations.', active: true },
                  { title: 'Emails Marketing', description: 'Infos sur les nouveautés et les mises à jour produit.', active: false },
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between py-3 border-b border-forest-50 last:border-0">
                    <div className="space-y-1">
                      <p className="text-[1rem] font-bold text-forest-900">{item.title}</p>
                      <p className="text-[0.85rem] text-sand-400 font-medium leading-relaxed">{item.description}</p>
                    </div>
                    <div className={cn(
                      "w-12 h-6 rounded-full relative cursor-pointer transition-all duration-300",
                      item.active ? "bg-forest-600" : "bg-sand-200"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                        item.active ? "right-1" : "left-1"
                      )} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
