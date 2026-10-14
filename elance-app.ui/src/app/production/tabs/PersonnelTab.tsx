'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Users,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Filter,
  DollarSign,
  AlertCircle,
  Briefcase,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Wrench,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductionModal } from '../components/ProductionModal';
import {
  useMonthlyPayableSummary,
  useOtherWorkEntries,
  useCreateOtherWorkEntry,
  useUpdateOtherWorkEntry,
  useDeleteOtherWorkEntry,
} from '@/hooks/use-production';
import { usePersons } from '@/hooks/use-team';
import { formatCalendarDate, getTodayCalendarDate } from '@/lib/production-labor-utils';
import { ProductionOtherWorkEntry } from '@/types/production';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export function PersonnelTab() {
  const currentDate = new Date();
  const [activeSubTab, setActiveSubTab] = useState<'monthly' | 'otherWork'>('monthly');

  // ── Monthly Payables State ─────────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const {
    data: monthlySummary,
    isLoading: isMonthlyLoading,
    error: monthlyError,
  } = useMonthlyPayableSummary(selectedYear, selectedMonth);

  // ── Standalone Other Work State & Filters ──────────────────────────────────
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterPersonId, setFilterPersonId] = useState<number | undefined>(undefined);

  const { data: otherWorkList = [], isLoading: isOtherWorkLoading } = useOtherWorkEntries({
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined,
    personId: filterPersonId,
  });

  const { data: allPersons = [] } = usePersons();
  const activePersons = useMemo(() => allPersons.filter((p) => !p.isdeleted), [allPersons]);

  // Mutations for Other Work
  const createOtherWorkMutation = useCreateOtherWorkEntry();
  const updateOtherWorkMutation = useUpdateOtherWorkEntry();
  const deleteOtherWorkMutation = useDeleteOtherWorkEntry();

  // Modal State for Other Work Entry (Create/Edit)
  const [isOtherWorkModalOpen, setIsOtherWorkModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProductionOtherWorkEntry | null>(null);
  const [entryPersonId, setEntryPersonId] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState<string>(getTodayCalendarDate());
  const [entryHours, setEntryHours] = useState<number>(1);
  const [entryRate, setEntryRate] = useState<number>(10);
  const [entryDescription, setEntryDescription] = useState<string>('');

  // ── Year navigation ────────────────────────────────────────────────────────
  const years = useMemo(() => {
    const y = currentDate.getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // ── Open Add Modal for Other Work ──────────────────────────────────────────
  const handleOpenCreateOtherWork = () => {
    setEditingEntry(null);
    setEntryPersonId(activePersons.length > 0 ? activePersons[0].id : null);
    setEntryDate(getTodayCalendarDate());
    setEntryHours(1);
    setEntryRate(10);
    setEntryDescription('');
    setIsOtherWorkModalOpen(true);
  };

  const handleOpenEditOtherWork = (entry: ProductionOtherWorkEntry) => {
    setEditingEntry(entry);
    setEntryPersonId(entry.personId);
    setEntryDate(formatCalendarDate(entry.workDate));
    setEntryHours(entry.hours);
    setEntryRate(entry.hourlyRate);
    setEntryDescription(entry.description);
    setIsOtherWorkModalOpen(true);
  };

  const handleSaveOtherWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDate || entryHours <= 0 || entryRate <= 0 || !entryDescription.trim()) return;

    if (editingEntry) {
      await updateOtherWorkMutation.mutateAsync({
        id: editingEntry.id,
        data: {
          workDate: entryDate,
          hours: Number(entryHours),
          hourlyRate: Number(entryRate),
          description: entryDescription.trim(),
        },
      });
    } else {
      if (!entryPersonId) return;
      await createOtherWorkMutation.mutateAsync({
        personId: entryPersonId,
        workDate: entryDate,
        hours: Number(entryHours),
        hourlyRate: Number(entryRate),
        description: entryDescription.trim(),
      });
    }

    setIsOtherWorkModalOpen(false);
  };

  const handleDeleteOtherWork = async (entry: ProductionOtherWorkEntry) => {
    if (
      window.confirm(
        `Supprimer la prestation "${entry.description}" pour ${entry.employeeFullName} (${entry.hours} h) ?`
      )
    ) {
      await deleteOtherWorkMutation.mutateAsync(entry.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Subtab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-corp-blue-600" />
            Personnel & Prestations de Production
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des rémunérations calculées des ouvriers (fabrication + travaux divers hors ordres).
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('monthly')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
              activeSubTab === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Calculator className="w-3.5 h-3.5 text-corp-blue-600" />
            Récapitulatif Mensuel Calculé
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('otherWork')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
              activeSubTab === 'otherWork'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
            Prestations Hors Ordres ({otherWorkList.length})
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* SUBTAB 1: MONTHLY EMPLOYEE PAYABLE SUMMARY                             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'monthly' && (
        <div className="space-y-5">
          {/* Month & Year Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 font-mono"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-corp-blue-600 shrink-0" />
              <span>
                Période : <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong> — Les montants indiqués représentent les rémunérations calculées sur les sessions effectives.
              </span>
            </div>
          </div>

          {/* Monthly KPI Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Manufacturing Labor */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Fabrication (Ordres)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black font-mono text-slate-900">
                  {(monthlySummary?.totalManufacturingAmount ?? 0).toFixed(3)}
                </span>
                <span className="text-xs text-slate-400 font-bold">TND</span>
              </div>
              <span className="text-xs text-blue-700 font-mono font-medium block">
                {(monthlySummary?.totalManufacturingHours ?? 0).toFixed(1)} heures pointées
              </span>
            </div>

            {/* Other Standalone Work */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Prestations Hors Ordres
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black font-mono text-slate-900">
                  {(monthlySummary?.totalOtherAmount ?? 0).toFixed(3)}
                </span>
                <span className="text-xs text-slate-400 font-bold">TND</span>
              </div>
              <span className="text-xs text-emerald-700 font-mono font-medium block">
                {(monthlySummary?.totalOtherHours ?? 0).toFixed(1)} heures diverses
              </span>
            </div>

            {/* Total Hours */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Heures Travaillées
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black font-mono text-slate-900">
                  {(monthlySummary?.totalPayableHours ?? 0).toFixed(1)}
                </span>
                <span className="text-xs text-slate-400 font-bold">heures</span>
              </div>
              <span className="text-xs text-slate-400 block">
                {monthlySummary?.employees.length ?? 0} ouvrier(s) actif(s)
              </span>
            </div>

            {/* Total Calculated Payable */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Montant Total Calculé à Payer
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-amber-400">
                  {(monthlySummary?.totalPayableAmount ?? 0).toFixed(3)}
                </span>
                <span className="text-xs text-slate-300 font-bold">TND</span>
              </div>
              <span className="text-[10px] text-slate-400 block">
                Base calculée (ordres non annulés + divers)
              </span>
            </div>
          </div>

          {/* Employee Breakdown Table */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Détail par Ouvrier — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </h3>
              <span className="text-xs text-slate-400">
                {monthlySummary?.employees.length ?? 0} collaborateur(s)
              </span>
            </div>

            {isMonthlyLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Calcul des rémunérations mensuelles en cours...
              </div>
            ) : !monthlySummary || monthlySummary.employees.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center space-y-2 bg-slate-50/50">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Aucune activité enregistrée pour ce mois</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Aucune session d'ordre de fabrication ni prestation hors ordres n'a été pointée sur {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Ouvrier</th>
                      <th className="py-2.5 px-3 text-right">Heures Fab.</th>
                      <th className="py-2.5 px-3 text-right">Montant Fab. (TND)</th>
                      <th className="py-2.5 px-3 text-right">Heures Hors Ordres</th>
                      <th className="py-2.5 px-3 text-right">Montant Hors Ordres (TND)</th>
                      <th className="py-2.5 px-3 text-right">Total Heures</th>
                      <th className="py-2.5 px-3 text-right font-bold text-slate-900">Montant Calculé à Payer (TND)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlySummary.employees.map((emp) => (
                      <tr key={emp.personId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">
                            {emp.employeeFullName.substring(0, 2).toUpperCase()}
                          </div>
                          {emp.employeeFullName}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {Number(emp.manufacturingHours).toFixed(1)} h
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-blue-700 font-medium">
                          {Number(emp.manufacturingAmount).toFixed(3)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {Number(emp.otherHours).toFixed(1)} h
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 font-medium">
                          {Number(emp.otherAmount).toFixed(3)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {Number(emp.totalPayableHours).toFixed(1)} h
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-950 text-sm bg-slate-50/50">
                          {Number(emp.totalPayableAmount).toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-xs text-slate-900">
                      <td className="py-3 px-3 uppercase tracking-wider text-[11px]">Total Général</td>
                      <td className="py-3 px-3 text-right font-mono">
                        {monthlySummary.totalManufacturingHours.toFixed(1)} h
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-700">
                        {monthlySummary.totalManufacturingAmount.toFixed(3)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {monthlySummary.totalOtherHours.toFixed(1)} h
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700">
                        {monthlySummary.totalOtherAmount.toFixed(3)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {monthlySummary.totalPayableHours.toFixed(1)} h
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-950 text-sm">
                        {monthlySummary.totalPayableAmount.toFixed(3)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* SUBTAB 2: STANDALONE OTHER WORK ENTRIES                                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'otherWork' && (
        <div className="space-y-5">
          {/* Action & Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div>
                <Label className="text-[10px] text-slate-500">Du</Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="h-8 text-xs font-mono mt-0.5"
                />
              </div>

              <div>
                <Label className="text-[10px] text-slate-500">Au</Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="h-8 text-xs font-mono mt-0.5"
                />
              </div>

              <div className="min-w-[180px]">
                <Label className="text-[10px] text-slate-500">Filtrer par ouvrier</Label>
                <select
                  value={filterPersonId ?? ''}
                  onChange={(e) => setFilterPersonId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full mt-0.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                >
                  <option value="">Tous les ouvriers</option>
                  {activePersons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstname} {p.lastname}
                    </option>
                  ))}
                </select>
              </div>

              {(filterStartDate || filterEndDate || filterPersonId) && (
                <div className="self-end pb-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setFilterPersonId(undefined);
                    }}
                    className="h-8 text-xs text-slate-500"
                  >
                    Réinitialiser
                  </Button>
                </div>
              )}
            </div>

            <Button
              onClick={handleOpenCreateOtherWork}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold gap-1.5 h-9 shrink-0 shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> Nouvelle Prestation
            </Button>
          </div>

          {/* Other Work List */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Prestations & Heures Hors Ordres ({otherWorkList.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Travaux d'atelier, maintenance, affûtage, nettoyage ou tâches diverses non rattachées à un ordre spécifique.
              </p>
            </div>

            {isOtherWorkLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Chargement des prestations...</div>
            ) : otherWorkList.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center space-y-2 bg-slate-50/50">
                <Briefcase className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Aucune prestation hors ordres enregistrée</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Utilisez le bouton "Nouvelle Prestation" pour saisir des travaux d'atelier ou de maintenance effectués par les ouvriers.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {otherWorkList.map((entry) => (
                  <div key={entry.id} className="p-4 bg-white hover:bg-slate-50/50 text-xs space-y-2 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {formatCalendarDate(entry.workDate)}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{entry.employeeFullName}</span>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenEditOtherWork(entry)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                          title="Modifier la prestation"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOtherWork(entry)}
                          disabled={deleteOtherWorkMutation.isPending}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="Supprimer la prestation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 pl-1">{entry.description}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-4 text-slate-500">
                        <span>
                          Durée : <strong className="font-mono text-slate-900">{entry.hours} h</strong>
                        </span>
                        <span>
                          Taux horaire :{' '}
                          <strong className="font-mono text-slate-900">{Number(entry.hourlyRate).toFixed(3)} TND/h</strong>
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400">Montant calculé : </span>
                        <strong className="font-mono font-bold text-emerald-700 text-xs">
                          {Number(entry.calculatedAmount).toFixed(3)} TND
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE / EDIT OTHER WORK ENTRY                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <ProductionModal
        isOpen={isOtherWorkModalOpen}
        onClose={() => setIsOtherWorkModalOpen(false)}
        title={editingEntry ? 'Modifier la Prestation Hors Ordres' : 'Nouvelle Prestation Hors Ordres'}
        subtitle="Enregistrez du travail payable effectué hors du cadre d'un ordre de fabrication spécifique."
        icon={<Briefcase className="w-5 h-5 text-emerald-600" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveOtherWork} className="space-y-4 text-xs">
          {!editingEntry && (
            <div>
              <Label className="text-xs text-slate-600">Ouvrier *</Label>
              <select
                required
                value={entryPersonId ?? ''}
                onChange={(e) => setEntryPersonId(parseInt(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
              >
                {activePersons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstname} {p.lastname}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-600">Date d'intervention *</Label>
              <Input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="mt-1 font-mono text-xs"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-600">Heures *</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                required
                value={entryHours}
                onChange={(e) => setEntryHours(parseFloat(e.target.value) || 0)}
                className="mt-1 font-mono text-xs"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-600">Taux Convenu (TND/h) *</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={entryRate}
                onChange={(e) => setEntryRate(parseFloat(e.target.value) || 0)}
                className="mt-1 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-600">Description des travaux * (max 500 car.)</Label>
            <textarea
              required
              maxLength={500}
              rows={3}
              value={entryDescription}
              onChange={(e) => setEntryDescription(e.target.value)}
              placeholder="ex: Maintenance raboteuse 4 faces, nettoyage copeaux atelier B..."
              className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Real-time calculated preview */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Montant Prévisionnel :</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {(Number(entryHours) * Number(entryRate)).toFixed(3)} TND
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOtherWorkModalOpen(false)}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createOtherWorkMutation.isPending || updateOtherWorkMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              {editingEntry ? 'Mettre à jour' : 'Enregistrer la prestation'}
            </Button>
          </div>
        </form>
      </ProductionModal>
    </div>
  );
}
