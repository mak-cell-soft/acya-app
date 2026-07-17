'use client';

import * as React from 'react';
import { useAppVariables, useUpsertDailyCeiling, useDeleteAppVariable, useUpdateAppVariable } from '@/hooks/use-app-variables';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/shared/table-pagination';
import { Calendar, Trash2, Edit2, Loader2, Plus, AlertTriangle, TrendingUp, ShieldAlert, Check } from 'lucide-react';
import { toast } from 'sonner';

export function DailyCeilingTab() {
  const { data: ceilings = [], isLoading } = useAppVariables('DailyInvoiceCeiling');
  const upsertCeiling = useUpsertDailyCeiling();
  const deleteCeiling = useDeleteAppVariable();
  const updateCeiling = useUpdateAppVariable();

  // Form State
  const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = React.useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  const paginatedData = React.useMemo(() => {
    // Sort by date (Name) descending
    const sorted = [...ceilings].sort((a, b) => b.name.localeCompare(a.name));
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [ceilings, currentPage, pageSize]);

  // Reset to page 1 on search / data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [ceilings.length, pageSize]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      toast.error('Veuillez sélectionner une date');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error('Veuillez saisir un montant valide supérieur à 0');
      return;
    }

    upsertCeiling.mutate(
      { date: selectedDate, amount: val.toString() },
      {
        onSuccess: () => {
          setAmount('');
        },
      }
    );
  };

  const handleToggleActive = (v: any, active: boolean) => {
    updateCeiling.mutate({
      id: v.id,
      data: {
        ...v,
        isactive: active,
      } as any,
    });
  };

  // Find if today's ceiling is already configured
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCeiling = ceilings.find((c) => c.name === todayStr && c.isactive && !c.isdeleted);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Configure Daily Ceiling */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-corp-blue-50 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-corp-blue-900 flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-corp-blue-600" />
              Configurer un plafond
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ceiling-date" className="text-sm font-bold text-corp-blue-800">
                  Date
                </Label>
                <div className="relative">
                  <Input
                    id="ceiling-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-sand-50/50 border-corp-blue-100 focus:border-corp-blue-600"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-corp-blue-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ceiling-amount" className="text-sm font-bold text-corp-blue-800">
                  Plafond TTC maximum (DT)
                </Label>
                <Input
                  id="ceiling-amount"
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="ex: 5000.000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 rounded-xl bg-sand-50/50 border-corp-blue-100 focus:border-corp-blue-600 font-mono"
                />
              </div>

              <Button
                type="submit"
                disabled={upsertCeiling.isPending}
                className="w-full h-12 bg-corp-blue-600 text-white hover:bg-corp-blue-800 font-bold rounded-xl active:scale-[0.96] transition-transform shadow-lg shadow-corp-blue-600/10 flex items-center justify-center gap-2"
              >
                {upsertCeiling.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* KPI Widget for Today's Limit */}
          <div className="bg-sand-50/50 border border-corp-blue-100/50 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-corp-blue-100/50 text-corp-blue-800 flex items-center justify-center shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-sand-400 uppercase tracking-widest">
                Plafond d&apos;aujourd&apos;hui
              </p>
              <h4 className="text-xl font-mono font-bold text-corp-blue-900 truncate mt-0.5 tabular-nums">
                {todayCeiling
                  ? `${parseFloat(todayCeiling.value).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT`
                  : 'Aucune limite'}
              </h4>
            </div>
          </div>
        </div>

        {/* Right Table: Configured Ceilings */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-corp-blue-50 overflow-hidden bg-white shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-corp-blue-50 bg-sand-50/30">
              <h3 className="text-sm font-bold text-corp-blue-900">Historique des plafonds journaliers</h3>
            </div>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-corp-blue-50/20 hover:bg-corp-blue-50/20 border-corp-blue-50">
                    <TableHead className="text-corp-blue-900 font-bold">Date</TableHead>
                    <TableHead className="text-corp-blue-900 font-bold text-right">Plafond (DT)</TableHead>
                    <TableHead className="text-corp-blue-900 font-bold text-center">Actif</TableHead>
                    <TableHead className="text-corp-blue-900 font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-sand-400 font-medium">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-corp-blue-600" />
                        <span className="text-xs mt-2 block">Chargement des plafonds...</span>
                      </TableCell>
                    </TableRow>
                  ) : paginatedData.map((v) => (
                    <TableRow key={v.id} className="hover:bg-sand-50/10 transition-colors border-corp-blue-50">
                      <TableCell className="font-medium text-corp-blue-900">
                        {(() => {
                          try {
                            const [year, month, day] = v.name.split('-');
                            return `${day}/${month}/${year}`;
                          } catch {
                            return v.name;
                          }
                        })()}
                        {v.name === todayStr && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Aujourd&apos;hui
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-corp-blue-900 text-right tabular-nums">
                        {parseFloat(v.value).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={v.isactive}
                          onCheckedChange={(checked) => handleToggleActive(v, checked)}
                          className="data-[state=checked]:bg-corp-blue-600 scale-90"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            onClick={() => {
                              setSelectedDate(v.name);
                              setAmount(parseFloat(v.value).toString());
                              toast.info('Plafond chargé dans le formulaire pour modification');
                            }}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-corp-blue-400 hover:text-corp-blue-600 hover:bg-corp-blue-50 rounded-lg active:scale-[0.96] transition-transform"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              if (confirm('Voulez-vous vraiment supprimer ce plafond journalier ?')) {
                                deleteCeiling.mutate({ id: v.id, nature: 'DailyInvoiceCeiling' });
                              }
                            }}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg active:scale-[0.96] transition-transform"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && paginatedData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-sand-400 font-medium">
                        Aucun plafond journalier configuré.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {!isLoading && ceilings.length > 0 && (
              <div className="p-4 border-t border-corp-blue-50">
                <TablePagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={ceilings.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
