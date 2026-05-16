'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnterpriseTab } from '@/components/settings/enterprise-tab';
import { ParamsTab } from '@/components/settings/params-tab';
import { NumberingTab } from '@/components/settings/numbering-tab';
import { AuditTab } from '@/components/settings/audit-tab';
import { Building2, Settings2, Hash, ShieldCheck, Cog } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState('enterprise');

  return (
    <DashboardLayout>
      <div className="space-y-10 max-w-[1400px] mx-auto font-sans pb-20">
        <header className="relative py-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-6"
          >
            <div className="w-16 h-16 rounded-3xl bg-forest-600 flex items-center justify-center shadow-xl shadow-forest-600/20">
              <Cog className="w-8 h-8 text-white animate-[spin_4s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-heading font-bold tracking-tight text-forest-900">
                Configuration <span className="text-forest-400">&</span> Paramètres
              </h1>
              <p className="text-sand-400 mt-1 font-medium text-lg">
                Gérez l'identité de votre entreprise et les réglages globaux du système.
              </p>
            </div>
          </motion.div>
          
          <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-8 text-forest-200">
             <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-forest-300">Statut Système</p>
                <p className="text-sm font-bold text-emerald-500 flex items-center gap-1.5 justify-end">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   Connecté
                </p>
             </div>
          </div>
        </header>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full space-y-12"
        >
          <div className="sticky top-0 z-10 py-4 bg-background/80 backdrop-blur-md">
            <TabsList className="bg-sand-50/80 p-1.5 rounded-[24px] border border-forest-100/50 shadow-sm inline-flex h-auto">
              <TabsTrigger 
                value="enterprise" 
                className="rounded-[18px] px-8 py-3.5 data-[state=active]:bg-forest-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-forest-600/20 font-bold gap-3 transition-all duration-300"
              >
                <Building2 className="w-5 h-5" /> Entreprise
              </TabsTrigger>
              <TabsTrigger 
                value="params" 
                className="rounded-[18px] px-8 py-3.5 data-[state=active]:bg-forest-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-forest-600/20 font-bold gap-3 transition-all duration-300"
              >
                <Settings2 className="w-5 h-5" /> Paramètres
              </TabsTrigger>
              <TabsTrigger 
                value="numbering" 
                className="rounded-[18px] px-8 py-3.5 data-[state=active]:bg-forest-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-forest-600/20 font-bold gap-3 transition-all duration-300"
              >
                <Hash className="w-5 h-5" /> Numérotation
              </TabsTrigger>
              <TabsTrigger 
                value="audit" 
                className="rounded-[18px] px-8 py-3.5 data-[state=active]:bg-forest-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-forest-600/20 font-bold gap-3 transition-all duration-300"
              >
                <ShieldCheck className="w-5 h-5" /> Audit
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="relative min-h-[600px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <TabsContent value="enterprise" className="m-0 focus-visible:outline-none">
                  <EnterpriseTab />
                </TabsContent>

                <TabsContent value="params" className="m-0 focus-visible:outline-none">
                  <ParamsTab />
                </TabsContent>

                <TabsContent value="numbering" className="m-0 focus-visible:outline-none">
                  <NumberingTab />
                </TabsContent>

                <TabsContent value="audit" className="m-0 focus-visible:outline-none">
                  <AuditTab />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
