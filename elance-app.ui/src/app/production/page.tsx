'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import {
  Search,
  Plus,
  Factory,
  Layers,
  Warehouse,
  Scale,
  Calendar,
  MapPin,
  Clock,
  Coins,
  Package,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import { OverviewTab } from './tabs/OverviewTab';
import { StepsTab } from './tabs/StepsTab';
import { MaterialsTab } from './tabs/MaterialsTab';
import { CostAnalysisTab } from './tabs/CostAnalysisTab';
import { CreateProductionModal } from './components/CreateProductionModal';
import { ProductionStatusBadge } from './components/ProductionStatusBadge';

import { useProductionOrdersList, useProductionOrderDetail } from '@/hooks/use-production';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { ProductionStatus } from '@/types/production';

const TABS = [
  { id: 0, label: 'Vue d’ensemble', icon: Factory },
  { id: 1, label: 'Étapes de Fabrication', icon: Layers },
  { id: 2, label: 'Matières & Stocks', icon: Warehouse },
  { id: 3, label: 'Analyse des Coûts', icon: Scale },
];

const STATUS_FILTERS: { label: string; value?: ProductionStatus }[] = [
  { label: 'Tous' },
  { label: 'Planifiés', value: 'Planned' },
  { label: 'En cours', value: 'InProgress' },
  { label: 'Terminés', value: 'Completed' },
  { label: 'Validés', value: 'Validated' },
  { label: 'Annulés', value: 'Cancelled' },
];

export default function ProductionPage() {
  const { hasPermission } = usePermissionGuard();
  const canRead = hasPermission('production', 'canRead');
  const canAdd = hasPermission('production', 'canAdd');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductionStatus | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch production orders
  const { data: orders = [], isLoading: isListLoading } = useProductionOrdersList({
    status: statusFilter,
    search: searchTerm,
  });

  // Auto-select first order if none selected
  const effectiveId = useMemo(() => {
    if (selectedId && orders.some((o) => o.id === selectedId)) {
      return selectedId;
    }
    return orders.length > 0 ? orders[0].id : null;
  }, [selectedId, orders]);

  // Fetch detail of selected order
  const { data: selectedDetail, isLoading: isDetailLoading } = useProductionOrderDetail(
    effectiveId ?? undefined
  );

  // Module permission guard
  if (!canRead) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Accès non autorisé</h2>
          <p className="text-sm text-slate-500 max-w-md mt-1">
            Le module Production n'est pas activé pour votre entreprise ou vous ne disposez pas des permissions requises pour y accéder.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Main 2-column Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-130px)]">
          {/* ── LEFT COLUMN: ORDERS LIST ────────────────────────────────────────── */}
          <div className="lg:col-span-4 xl:col-span-4 flex flex-col space-y-4">
            {/* Header / New Button */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Factory className="w-6 h-6 text-corp-blue-600" />
                  Production
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {orders.length} ordre{orders.length > 1 ? 's' : ''} de fabrication
                </p>
              </div>

              {canAdd && (
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold gap-1.5 h-9 shadow-xs active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Nouvel Ordre
                </Button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par référence, note..."
                className="pl-9 pr-8 text-xs bg-white h-9.5 border-slate-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {STATUS_FILTERS.map((filter) => {
                const isActive = statusFilter === filter.value;
                return (
                  <button
                    key={filter.label}
                    onClick={() => setStatusFilter(filter.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all',
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Orders Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[calc(100vh-270px)]">
              {isListLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Chargement des ordres...</div>
              ) : orders.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-white text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Factory className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Aucun ordre de fabrication</p>
                  <p className="text-[11px] text-slate-400">
                    {searchTerm ? 'Aucun résultat correspondant.' : 'Créez votre premier ordre de transformation.'}
                  </p>
                </div>
              ) : (
                orders.map((ord) => {
                  const isSelected = ord.id === effectiveId;
                  return (
                    <motion.div
                      key={ord.id}
                      onClick={() => setSelectedId(ord.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        'p-4 rounded-xl border transition-all cursor-pointer space-y-2 relative',
                        isSelected
                          ? 'bg-gradient-to-r from-white to-slate-50 border-corp-blue-500 shadow-md ring-1 ring-corp-blue-500/30'
                          : 'bg-white hover:bg-slate-50/80 border-slate-200/90 shadow-xs'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 tracking-tight">
                          {ord.reference}
                        </span>
                        <ProductionStatusBadge status={ord.status} />
                      </div>

                      <p className="text-xs font-medium text-slate-700 line-clamp-1">
                        {ord.description || 'Ordre de transformation'}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1 text-slate-500 truncate max-w-[150px]">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {ord.salesSiteName || `Dépôt #${ord.salesSiteId}`}
                        </span>

                        <span className="font-mono font-bold text-slate-800">
                          {(ord.totalProductionCost ?? 0).toFixed(3)} TND
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: DETAIL VIEW & TABS ─────────────────────────────────── */}
          <div className="lg:col-span-8 xl:col-span-8 flex flex-col space-y-4">
            {isDetailLoading && !selectedDetail ? (
              <div className="h-full flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                Chargement des détails de fabrication...
              </div>
            ) : !selectedDetail ? (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
                  <Factory className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Sélectionnez un Ordre</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sélectionnez un ordre de fabrication dans la liste à gauche pour consulter les étapes et les coûts.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tabs Bar */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 overflow-x-auto scrollbar-none">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                          isActive
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                        )}
                      >
                        <Icon className={cn('w-4 h-4', isActive ? 'text-corp-blue-600' : 'text-slate-400')} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content Container */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedDetail.id}-${activeTab}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 0 && <OverviewTab order={selectedDetail} />}
                    {activeTab === 1 && <StepsTab order={selectedDetail} />}
                    {activeTab === 2 && <MaterialsTab order={selectedDetail} />}
                    {activeTab === 3 && <CostAnalysisTab order={selectedDetail} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <CreateProductionModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </DashboardLayout>
  );
}
