'use client';

import React, { useState } from 'react';
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
  Trash2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import {
  useStartProductionOrder,
  useValidateProductionOrder,
  useCancelProductionOrder,
  useDeleteProductionOrder,
  useUpdateProductionOrder,
} from '@/hooks/use-production';
import { useAuthStore } from '@/store/use-auth-store';
import { salesSitesService } from '@/services/components/salessites.service';
import { useQuery } from '@tanstack/react-query';
import { DeleteConfirmDialog } from '@/components/articles/delete-confirm-dialog';
import { motion } from 'framer-motion';

interface OverviewTabProps {
  order: ProductionOrder;
}

export function OverviewTab({ order }: OverviewTabProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === '20' || user?.role === '10';

  const startMutation = useStartProductionOrder();
  const validateMutation = useValidateProductionOrder();
  const cancelMutation = useCancelProductionOrder();
  const deleteMutation = useDeleteProductionOrder();
  const updateOrderMutation = useUpdateProductionOrder();

  const { data: allSites = [] } = useQuery({
    queryKey: ['sales-sites'],
    queryFn: async () => {
      const res = await salesSitesService.getAll();
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isValidatedDeleteBlocked, setIsValidatedDeleteBlocked] = useState(false);
  const [isWorkLogsDeleteBlocked, setIsWorkLogsDeleteBlocked] = useState(false);

  // Accessible validation dialog state
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Accessible cancel dialog state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const hasRecordedWorkLogs = order.steps?.some(
    (s) =>
      (s.workLogs && s.workLogs.length > 0) ||
      (s.workers && s.workers.some((w) => w.workLogs && w.workLogs.length > 0))
  );

  const completedStepsCount = order.steps.filter((s) => s.status === 'Completed').length;
  const progressPct = order.steps.length > 0 ? Math.round((completedStepsCount / order.steps.length) * 100) : 0;

  const handleStart = () => {
    startMutation.mutate(order.id);
  };

  const handleOpenValidate = () => {
    setValidationError(null);
    setIsValidateDialogOpen(true);
  };

  const handleConfirmValidate = async () => {
    try {
      setValidationError(null);
      await validateMutation.mutateAsync(order.id);
      setIsValidateDialogOpen(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Erreur lors de la validation de l'ordre";
      setValidationError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleOpenCancel = () => {
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    try {
      await cancelMutation.mutateAsync(order.id);
      setIsCancelDialogOpen(false);
    } catch {
      setIsCancelDialogOpen(false);
    }
  };

  const handleSiteChange = async (newSiteId: number) => {
    if (newSiteId === order.salesSiteId) return;
    await updateOrderMutation.mutateAsync({
      id: order.id,
      data: { salesSiteId: newSiteId },
    });
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
                {order.status !== 'Validated' && order.status !== 'Cancelled' && allSites.length > 0 ? (
                  <select
                    value={order.salesSiteId}
                    onChange={(e) => handleSiteChange(Number(e.target.value))}
                    disabled={updateOrderMutation.isPending}
                    className="bg-slate-800/90 text-amber-300 font-semibold border border-amber-500/30 rounded-lg px-2 py-0.5 text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                    title="Changer le dépôt source"
                  >
                    {allSites.map((site: any) => (
                      <option key={site.id} value={site.id} className="bg-slate-900 text-white">
                        {site.gov ? `${site.gov} - ` : ''}
                        {site.address || `Dépôt #${site.id}`}
                        {site.isForsale ? ' (Dépôt Principal / Vente)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-slate-300 font-medium">
                    {order.salesSiteName || `Dépôt #${order.salesSiteId}`}
                  </span>
                )}
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
                onClick={handleOpenValidate}
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
                onClick={handleOpenCancel}
                disabled={cancelMutation.isPending}
                className="bg-white/10 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 border-white/20 hover:border-rose-500/50 text-xs font-medium gap-1.5 h-10 px-3 transition-all"
              >
                <XCircle className="w-4 h-4" />
                Annuler l'Ordre
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  if (order.status === 'Validated') {
                    setIsValidatedDeleteBlocked(true);
                  } else if (hasRecordedWorkLogs) {
                    setIsWorkLogsDeleteBlocked(true);
                  } else {
                    setIsDeleteDialogOpen(true);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="bg-rose-950/20 hover:bg-rose-900/50 text-rose-300 hover:text-rose-100 border-rose-500/30 hover:border-rose-500/60 text-xs font-semibold gap-1.5 h-10 px-3 transition-all"
                title="Supprimer l'ordre (Administrateurs uniquement)"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                Supprimer l'Ordre
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

      {/* Admin Delete Order Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(order.id);
            setIsDeleteDialogOpen(false);
          } catch (err: any) {
            setIsDeleteDialogOpen(false);
            if (err?.response?.status === 409 || err?.response?.data?.message?.includes('pointages') || err?.response?.data?.message?.includes('heures de travail')) {
              setIsWorkLogsDeleteBlocked(true);
            }
          }
        }}
        title={`Supprimer l'ordre ${order.reference}`}
        description={`Êtes-vous certain de vouloir archiver et supprimer définitivement l'ordre de fabrication ${order.reference} ? Cette action est irréversible et réservée aux administrateurs.`}
        isLoading={deleteMutation.isPending}
      />

      {/* Employee Work Logs Present - Deletion Blocked Notice Modal */}
      {isWorkLogsDeleteBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Suppression impossible</h4>
                <p className="text-xs text-slate-500">Heures de travail enregistrées</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Impossible de supprimer cet ordre : des heures de travail d'employés sont enregistrées sur ses étapes. Pour préserver l'intégrité de la paie et la traçabilité de la main-d'œuvre, veuillez d'abord supprimer les pointages des ouvriers dans l'onglet <strong>« Personnel & Main-d'œuvre »</strong> ou <strong>« Ouvriers & Pointage »</strong>, puis réessayez.
            </p>
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => setIsWorkLogsDeleteBlocked(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4"
              >
                Compris
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Validated Order Deletion Blocked Notice Modal */}
      {isValidatedDeleteBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Suppression impossible</h4>
                <p className="text-xs text-slate-500">Ordre de fabrication validé</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cet ordre a déjà validé des mouvements de stocks réels (consommation des matières et entrée des produits semi-finis/finis). Pour préserver l'intégrité de vos stocks, vous devez d'abord cliquer sur <strong>« Annuler l'Ordre »</strong> afin de rétablir les volumes en magasin avant de pouvoir le supprimer.
            </p>
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => setIsValidatedDeleteBlocked(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4"
              >
                Compris
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Validation Confirmation Dialog */}
      {isValidateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Valider l'Ordre de Fabrication
                </h4>
                <p className="text-xs font-mono font-bold text-corp-blue-600">{order.reference}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Dépôt d'exécution :</span>
                <strong className="text-slate-900">{order.salesSiteName || `Dépôt #${order.salesSiteId}`}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Unités fabriquées :</span>
                <strong className="text-slate-900 font-mono">
                  {order.actualOutputQuantity ?? order.plannedOutputQuantity} U
                </strong>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                La validation de cet ordre va <strong>consommer et déduire irrévocablement</strong> du stock les matières premières utilisées au dépôt <strong>{order.salesSiteName || `Dépôt #${order.salesSiteId}`}</strong>.
              </p>
              <p>
                Les articles et produits finis fabriqués seront <strong>automatiquement crédités</strong> au stock de ce même dépôt.
              </p>
              <p className="text-[11px] text-slate-400 italic">
                Note : Cette opération finalise le cycle de production. Elle ne peut être annulée que via la procédure d'annulation d'ordre.
              </p>
            </div>

            {/* Display Backend Validation Error if Any */}
            {validationError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-rose-900">Échec de validation :</span>
                  <p className="text-rose-700 leading-relaxed">{validationError}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsValidateDialogOpen(false);
                  setValidationError(null);
                }}
                disabled={validateMutation.isPending}
                className="text-xs text-slate-600"
              >
                Fermer
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmValidate}
                disabled={validateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 px-4 shadow-md shadow-emerald-900/20 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {validateMutation.isPending ? 'Validation en cours...' : 'Confirmer la Validation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Cancel Order Confirmation Dialog */}
      {isCancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Annuler l'Ordre de Fabrication</h4>
                <p className="text-xs font-mono font-bold text-slate-500">{order.reference}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Êtes-vous certain de vouloir annuler l'ordre de fabrication <strong>{order.reference}</strong> ?
              {order.status === 'Validated'
                ? " Comme cet ordre était validé, l'intégralité des mouvements de stocks (déduction matières et ajout des produits finis) sera automatiquement inversée et restaurée."
                : " Cette opération interrompt l'ordre sans mouvement de stock."}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelDialogOpen(false)}
                disabled={cancelMutation.isPending}
                className="text-xs text-slate-600"
              >
                Retour
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-2 px-4 shadow-md shadow-rose-900/20 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {cancelMutation.isPending ? 'Annulation en cours...' : "Confirmer l'Annulation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
