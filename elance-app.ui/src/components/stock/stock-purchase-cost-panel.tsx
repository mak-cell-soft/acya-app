'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { stockService } from '@/services/components/stock.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  Search, 
  RefreshCw, 
  Loader2, 
  TrendingUp, 
  Package, 
  Info,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

interface StockValuationItem {
  merchandiseId: number;
  reference: string;
  description: string;
  currentStockQuantity: number;
  unit: string;
  cmpUnitPrice: number;
  cmpTotalValue: number;
  lastPurchasePrice: number;
  lastPurchaseTotalValue: number;
}

export function StockPurchaseCostPanel() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Generate year options (current year and 4 years back)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, [currentYear]);

  // Fetch valuation data
  const { data: valuationData = [], isLoading, isRefetching, refetch } = useQuery<StockValuationItem[]>({
    queryKey: ['stock-valuation', selectedYear],
    queryFn: () => stockService.getValuation(selectedYear),
    staleTime: 30000, // 30 seconds
  });

  // Filtered data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return valuationData;
    const q = searchQuery.toLowerCase();
    return valuationData.filter(item => 
      (item.reference || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    );
  }, [valuationData, searchQuery]);

  // Totals calculations
  const totals = useMemo(() => {
    let totalCmpValue = 0;
    let totalLastPurchaseValue = 0;
    const quantitiesByUnit: { [unit: string]: number } = {};

    filteredData.forEach(item => {
      totalCmpValue += item.cmpTotalValue;
      totalLastPurchaseValue += item.lastPurchaseTotalValue;
      
      const unit = (item.unit || 'U').trim().toUpperCase();
      quantitiesByUnit[unit] = (quantitiesByUnit[unit] || 0) + item.currentStockQuantity;
    });

    return {
      totalCmpValue,
      totalLastPurchaseValue,
      quantitiesByUnit
    };
  }, [filteredData]);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(value);
  };

  const formatQuantity = (qty: number, unit?: string | null) => {
    const isM3 = unit?.toUpperCase().includes('M3') || unit?.toUpperCase().includes('MÈTRE 3') || unit?.toUpperCase().includes('METRE 3');
    if (isM3) {
      return qty.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200/60 dark:border-stone-800/80 shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              type="text"
              placeholder="Rechercher par référence ou description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border-stone-200 dark:border-stone-800 rounded-lg text-sm bg-stone-50/50 dark:bg-stone-950/50 focus-visible:ring-amber-500"
            />
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-stone-400 shrink-0" />
            <Select 
              value={selectedYear.toString()} 
              onValueChange={(val) => val && setSelectedYear(parseInt(val, 10))}
            >
              <SelectTrigger className="w-[140px] h-10 border-stone-200 dark:border-stone-800 rounded-lg bg-stone-50/50 dark:bg-stone-950/50 font-medium">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={y.toString()} className="font-medium">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-10 px-4 rounded-lg border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-850 gap-2 font-medium"
          >
            {isLoading || isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
            ) : (
              <RefreshCw className="h-4 w-4 text-stone-400" />
            )}
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Stock Volume */}
        <Card className="border border-stone-200/60 dark:border-stone-800/80 bg-white dark:bg-stone-900 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <Package className="h-4.5 w-4.5 text-stone-400" />
              Volume de Stock Actuel
            </CardDescription>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mt-1">
              {Object.entries(totals.quantitiesByUnit).length === 0 ? (
                <span className="text-2xl font-black text-stone-800 dark:text-stone-100">0</span>
              ) : (
                Object.entries(totals.quantitiesByUnit).map(([unit, qty], i) => (
                  <div key={unit} className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-stone-800 dark:text-stone-100">
                      {formatQuantity(qty, unit)}
                    </span>
                    <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase">
                      {unit}
                    </span>
                    {i < Object.entries(totals.quantitiesByUnit).length - 1 && (
                      <span className="text-stone-300 dark:text-stone-700 ml-2 select-none">•</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
              Total d'articles actuellement en stock physique ayant fait ou non l'objet d'achats en {selectedYear}.
            </p>
          </CardContent>
        </Card>

        {/* Valuation via CMP */}
        <Card className="border border-stone-200/60 dark:border-stone-800/80 bg-white dark:bg-stone-900 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
              <DollarSign className="h-4.5 w-4.5 text-amber-500" />
              Valeur Stock via CMP (HT)
            </CardDescription>
            <CardTitle className="text-2xl font-black text-stone-800 dark:text-stone-100 mt-1">
              {formatCurrency(totals.totalCmpValue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Calculé à partir du coût moyen pondéré des achats nets HT cumulés sur l'année {selectedYear}.
            </p>
          </CardContent>
        </Card>

        {/* Valuation via Last Purchase Price */}
        <Card className="border border-stone-200/60 dark:border-stone-800/80 bg-white dark:bg-stone-900 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-500 flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-blue-500" />
              Valeur via Dernier Prix (HT)
            </CardDescription>
            <CardTitle className="text-2xl font-black text-stone-800 dark:text-stone-100 mt-1">
              {formatCurrency(totals.totalLastPurchaseValue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Valorisé selon le prix unitaire HT net de la toute dernière commande ou facture d'achat de {selectedYear}.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-stone-200/60 dark:border-stone-800/80 bg-white dark:bg-stone-900 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-stone-100 dark:border-stone-800 gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-stone-800 dark:text-stone-100">
              Détail des Valorisations par Article
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Détails comparatifs calculés sur les mouvements d'achats nets (remises déduites, hors taxes) en {selectedYear}.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/50 p-1.5 rounded-lg text-[10px] text-stone-500 dark:text-stone-400 max-w-fit">
            <Info className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <span>Si aucun achat n'a eu lieu cette année, la valorisation est affichée à 0 DT.</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col justify-center items-center gap-3">
              <Loader2 className="h-7 w-7 text-amber-500 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-450">Chargement de la valorisation...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-20 flex flex-col justify-center items-center text-center px-4">
              <Package className="h-10 w-10 text-stone-300 dark:text-stone-700 mb-3" />
              <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Aucun article trouvé</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs">
                Aucun article ayant du stock n'a été trouvé. Veuillez affiner vos critères de recherche ou réactualiser.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-stone-50/70 dark:bg-stone-900/60 border-b border-stone-100 dark:border-stone-800 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  <th className="py-3.5 px-4 font-bold">Référence</th>
                  <th className="py-3.5 px-4 font-bold">Désignation</th>
                  <th className="py-3.5 px-4 font-bold text-right">Quantité Stock</th>
                  <th className="py-3.5 px-4 font-bold text-right bg-amber-50/20 dark:bg-amber-950/5">P.U. CMP</th>
                  <th className="py-3.5 px-4 font-bold text-right bg-amber-50/30 dark:bg-amber-950/10">Valeur CMP</th>
                  <th className="py-3.5 px-4 font-bold text-right bg-blue-50/10 dark:bg-blue-950/5">Dernier Prix</th>
                  <th className="py-3.5 px-4 font-bold text-right bg-blue-50/20 dark:bg-blue-950/10">Valeur Dernier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-850 text-sm">
                {filteredData.map((item) => (
                  <tr 
                    key={item.merchandiseId} 
                    className="hover:bg-stone-50/30 dark:hover:bg-stone-850/20 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-stone-700 dark:text-stone-300">
                      {item.reference || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-stone-900 dark:text-stone-100 max-w-xs truncate font-medium">
                      {item.description || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-600 dark:text-stone-450">
                      <span>{formatQuantity(item.currentStockQuantity, item.unit)}</span>
                      <span className="text-[10px] text-stone-400 font-sans font-medium ml-1">
                        {item.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-stone-800 dark:text-stone-200 bg-amber-50/20 dark:bg-amber-950/5">
                      {item.cmpUnitPrice > 0 ? formatCurrency(item.cmpUnitPrice) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-600 dark:text-amber-500 bg-amber-50/30 dark:bg-amber-950/10">
                      {item.cmpTotalValue > 0 ? formatCurrency(item.cmpTotalValue) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-stone-800 dark:text-stone-200 bg-blue-50/10 dark:bg-blue-950/5">
                      {item.lastPurchasePrice > 0 ? formatCurrency(item.lastPurchasePrice) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-blue-600 dark:text-blue-500 bg-blue-50/20 dark:bg-blue-950/10">
                      {item.lastPurchaseTotalValue > 0 ? formatCurrency(item.lastPurchaseTotalValue) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
