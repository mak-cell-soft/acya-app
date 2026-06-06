'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Button } from '@/components/ui/button';
import { StockKpiBanner } from '@/components/stock/stock-kpi-banner';
import { StockListByCategory } from '@/components/stock/stock-list-by-category';
import { StockTimelinePanel } from '@/components/stock/stock-timeline-panel';
import { StockTransfersList } from '@/components/stock/stock-transfers-list';
import { 
  Warehouse, 
  Clock, 
  ArrowLeftRight,
  ClipboardList,
  History,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function StockDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Tab State syncing with query param
  const activeTabParam = searchParams.get('tab') || 'list';
  const [activeTab, setActiveTab] = useState<string>(activeTabParam);

  useEffect(() => {
    if (activeTabParam && activeTabParam !== activeTab) {
      setActiveTab(activeTabParam);
    }
  }, [activeTabParam]);

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    router.push(`/stock?tab=${tabName}`);
  };

  const tabs = [
    { id: 'list', label: 'Stock par Catégorie', icon: Warehouse },
    { id: 'timeline', label: 'Mouvements (Timeline)', icon: Clock },
    { id: 'transfers', label: 'Transferts Logistiques', icon: ArrowLeftRight },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header and top metadata bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-50 tracking-tight">
            Stock & Logistique
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-xs mt-1 leading-normal">
            Supervisez les inventaires catégorisés, retracez les chronologies de mouvements et pilotez les transferts inter-sites.
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <Button
            variant="outline"
            onClick={() => router.push('/inventory')}
            className="h-11 px-4 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 rounded-xl gap-2 font-semibold text-xs uppercase tracking-wider transition-all"
          >
            <History className="w-4 h-4 text-stone-400" />
            Inventaires Physiques
          </Button>
        </div>
      </div>

      {/* Real-time KPI Statistics Banner */}
      <StockKpiBanner />

      {/* Custom Sleek Luxury Tabs switcher */}
      <div className="border-b border-stone-200/60 dark:border-stone-850/80 pb-px print:hidden">
        <div className="flex space-x-6 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "relative pb-4 text-xs uppercase tracking-wider font-bold transition-all flex items-center space-x-2 border-b-2 border-transparent",
                  isActive
                    ? "text-stone-900 dark:text-stone-50 border-amber-500/80"
                    : "text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-amber-500" : "text-stone-400")} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'list' && <StockListByCategory />}
            {activeTab === 'timeline' && <StockTimelinePanel />}
            {activeTab === 'transfers' && <StockTransfersList />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function StockPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="py-24 flex flex-col justify-center items-center space-y-4">
          <LoaderSpinner />
          <span className="text-xs uppercase tracking-widest text-stone-400 font-bold">Initialisation du Dashboard...</span>
        </div>
      }>
        <StockDashboardContent />
      </Suspense>
    </DashboardLayout>
  );
}

function LoaderSpinner() {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400/25 opacity-75"></span>
      <div className="h-5 w-5 rounded-full border-t-2 border-r-2 border-stone-900 dark:border-stone-50 animate-spin"></div>
    </div>
  );
}

