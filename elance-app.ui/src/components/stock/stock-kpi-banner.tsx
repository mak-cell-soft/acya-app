'use client';

import React from 'react';
import { useStockDashboardStats } from '@/hooks/use-stock';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Layers, 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Loader2 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/use-auth-store';

export function StockKpiBanner() {
  const { user } = useAuthStore();
  const defaultSiteId = user?.defaultSiteId ? parseInt(user.defaultSiteId) : undefined;
  
  const { data: stats, isLoading, error } = useStockDashboardStats(defaultSiteId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-stone-50/50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800/60 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  const kpis = [
    {
      title: 'Total Articles en Stock',
      value: stats.totalItems,
      icon: Layers,
      colorClass: 'text-stone-800 dark:text-stone-100',
      bgClass: 'bg-stone-100/50 dark:bg-stone-800/40',
      description: 'Variétés d\'articles enregistrées'
    },
    {
      title: 'Seuil Critique Atteint',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      colorClass: 'text-amber-600 dark:text-amber-500',
      bgClass: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30',
      description: 'Sous le seuil de sécurité minimum',
      pulse: stats.lowStockItems > 0
    },
    {
      title: 'Rupture de Stock',
      value: stats.outOfStockItems,
      icon: XCircle,
      colorClass: 'text-rose-600 dark:text-rose-500',
      bgClass: 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/30',
      description: 'Quantité nulle ou négative',
      pulse: stats.outOfStockItems > 0
    },
    {
      title: 'Stock Conforme & Sain',
      value: stats.healthyStockItems,
      icon: CheckCircle,
      colorClass: 'text-emerald-600 dark:text-emerald-500',
      bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30',
      description: 'Niveau d\'inventaire optimal'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
          >
            <Card className={`relative overflow-hidden border border-stone-200/60 dark:border-stone-800/60 ${kpi.bgClass} hover:shadow-md transition-all duration-300 group`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">
                      {kpi.title}
                    </p>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-mono font-bold tracking-tight text-stone-900 dark:text-stone-50">
                        {kpi.value}
                      </span>
                      {kpi.pulse && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${idx === 1 ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${idx === 1 ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl transition-colors duration-300 ${kpi.bgClass} group-hover:scale-110 transform`}>
                    <Icon className={`h-5 w-5 ${kpi.colorClass}`} />
                  </div>
                </div>
                <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-4 leading-normal">
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

