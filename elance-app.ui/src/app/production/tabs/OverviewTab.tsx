'use client';

import React from 'react';
import { ProductionOrder } from '@/types/production';
import { ProductionStatusBadge } from '../components/ProductionStatusBadge';
import { Button } from '@/components/ui/button';
import {
  Play,
  ShieldCheck,
  XCircle,
  Calendar,
  MapPin,
  Coins,
  Scale,
  Package,
  Clock,
  Layers,
  Sparkles,
  FileText,
} from 'lucide-react';
import {
  useStartProductionOrder,
  useValidateProductionOrder,
  useCancelProductionOrder,
} from '@/hooks/use-production';
import { motion } from 'framer-motion';

interface OverviewTabProps {
  order: ProductionOrder;
}

export function OverviewTab({ order }: OverviewTabProps) {
  const startMutation = useStartProductionOrder();
  const validateMutation = useValidateProductionOrder();
  const cancelMutation = useCancelProductionOrder();

  const completedStepsCount = order.steps.filter((s) => s.status === 'Completed').length;
  const progressPct = order.steps.length > 0 ? Math.round((completedStepsCount / order.steps.length) * 100) : 0;

  const handleStart = () => {
    startMutation.mutate(order.id);
  };

  const handleValidate = () => {
    if (
      window.confirm(
        `Confirmez-vous la validation de l'ordre ${order.reference} ?\nCette opération va déduire irrévocablement les matières premières consommées du stock et créditer les articles fabriqués au dépôt ${order.salesSiteName || ''}.`
      )
    ) {
      validateMutation.mutate(order.id);
    }
  };

  const handleCancel = () => {
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir annuler l'ordre ${order.reference} ?\nSi l'ordre était validé, les stocks seront restaurés automatiquement.`
      )
    ) {
      cancelMutation.mutate(order.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Actions */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl relative overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xl font-black tracking-tight font-mono text-amber-400">
                {order.reference}
              </span>
              <ProductionStatusBadge status={order.status} className="bg-white/10 text-white border-white/20" />
            </div>

            <p className="text-slate-300 text-sm font-medium">
              {order.description || 'Ordre de fabrication et transformation de matières.'}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {order.salesSiteName || `Dépôt #${order.salesSiteId}`}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Prévu : {new Date(order.plannedStartDate).toLocaleDateString('fr-FR')}
                {order.plannedEndDate && ` → ${new Date(order.plannedEndDate).toLocaleDateString('fr-FR')}`}
              </span>
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                Objectif :{' '}
                <strong className="text-white font-mono">{order.plannedOutputQuantity} unités</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {order.status === 'Planned' && (
              <Button
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="bg-corp-blue-600 hover:bg-corp-blue-700 text-white text-xs font-bold gap-2 h-10 px-4 shadow-md active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                {startMutation.isPending ? 'Démarrage...' : 'Démarrer la Fabrication'}
              </Button>
            )}

            {(order.status === 'InProgress' || order.status === 'Completed') && (
              <Button
                onClick={handleValidate}
                disabled={validateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 h-10 px-5 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                {validateMutation.isPending ? 'Validation en cours...' : 'Valider & Mettre à jour Stock'}
              </Button>
            )}

            {order.status !== 'Cancelled' && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="bg-white/10 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 border-white/20 hover:border-rose-500/50 text-xs font-medium gap-1.5 h-10 px-3 transition-all"
              >
                <XCircle className="w-4 h-4" />
                Annuler l'Ordre
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cost & Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Coût Matières Premières</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
              {(order.totalMaterialCost ?? 0).toLocaleString('fr-FR', {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}
            </span>
            <span className="text-xs font-bold text-slate-400 ml-1.5">TND</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Consommations matières brutes</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Main d'Œuvre & Frais</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
              {((order.totalLaborCost ?? 0) + (order.totalOtherCost ?? 0)).toLocaleString('fr-FR', {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}
            </span>
            <span className="text-xs font-bold text-slate-400 ml-1.5">TND</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Main d'œuvre et usinage des étapes</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Coût Global Fabrication</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
              {(order.totalProductionCost ?? 0).toLocaleString('fr-FR', {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}
            </span>
            <span className="text-xs font-bold text-slate-400 ml-1.5">TND</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total engagé dans le lot</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold uppercase tracking-wider">
            <span>Coût de Revient Unitaire</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono tracking-tight text-amber-400">
              {(order.unitProductionCost ?? 0).toLocaleString('fr-FR', {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}
            </span>
            <span className="text-xs font-bold text-slate-300 ml-1.5">TND / U</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Sur {order.actualOutputQuantity ?? order.plannedOutputQuantity} unités produites
          </p>
        </motion.div>
      </div>

      {/* Progress & Timeline Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-corp-blue-600" />
            <h4 className="text-sm font-bold text-slate-900">Progression des Étapes ({completedStepsCount} / {order.steps.length})</h4>
          </div>
          <span className="text-sm font-mono font-bold text-slate-900">{progressPct}%</span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-corp-blue-600 via-indigo-600 to-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          {order.steps.map((step) => (
            <div
              key={step.id}
              className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-slate-500">#{step.stepNumber}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  step.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                  step.status === 'InProgress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {step.status === 'Completed' ? 'Achevé' : step.status === 'InProgress' ? 'En cours' : 'Planifié'}
                </span>
              </div>
              <p className="font-semibold text-slate-800 truncate">{step.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Internal Notes & Metadata */}
      {order.notes && (
        <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-2">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-700" /> Notes Internes
          </h4>
          <p className="text-xs text-amber-950 font-medium whitespace-pre-wrap leading-relaxed">
            {order.notes}
          </p>
        </div>
      )}
    </div>
  );
}
