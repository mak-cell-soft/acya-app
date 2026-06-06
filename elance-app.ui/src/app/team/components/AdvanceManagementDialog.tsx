'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingDown, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Loader2, 
  Sparkles,
  DollarSign,
  CalendarDays,
  RefreshCw,
  Coins,
  Printer
} from 'lucide-react';
import { Person } from '@/types/team';
import { Advance } from '@/types/hr';
import { 
  useEmployeeAdvances, 
  useAddAdvance, 
  useUpdateAdvance, 
  useDeleteAdvance 
} from '@/hooks/use-hr';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PrintVariantDialog } from '@/components/print/print-trigger-button';

interface AdvanceManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Person | null;
}

export function AdvanceManagementDialog({ isOpen, onClose, employee }: AdvanceManagementDialogProps) {
  // --- Form State ---
  const [amount, setAmount] = useState<number>(0);
  const [requestDate, setRequestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [repaymentSchedule, setRepaymentSchedule] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [repaymentAmountInput, setRepaymentAmountInput] = useState<{ [id: number]: number }>({});
  const [activeRepayId, setActiveRepayId] = useState<number | null>(null);
  const [printAdvance, setPrintAdvance] = useState<Advance | null>(null);

  // --- API Queries & Mutations ---
  const { data: advances = [], isLoading } = useEmployeeAdvances(employee?.id || 0);
  const addAdvance = useAddAdvance();
  const updateAdvance = useUpdateAdvance();
  const deleteAdvance = useDeleteAdvance();

  // Reset states on open/close
  useEffect(() => {
    if (isOpen) {
      setShowAddForm(false);
      setAmount(0);
      setRequestDate(new Date().toISOString().split('T')[0]);
      setRepaymentSchedule('');
      setRepaymentAmountInput({});
      setActiveRepayId(null);
      setPrintAdvance(null);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || amount <= 0) return;

    const newAdvance: Partial<Advance> = {
      employeeid: employee.id,
      amount: amount,
      requestdate: new Date(requestDate).toISOString(),
      repaymentschedule: repaymentSchedule || undefined,
      amountrepaid: 0,
      status: 'Pending',
    };

    addAdvance.mutate(newAdvance, {
      onSuccess: () => {
        setShowAddForm(false);
        setAmount(0);
        setRepaymentSchedule('');
      }
    });
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    // NOTE: Find the existing advance object to send a full payload.
    // The backend uses a mapping function (UpdateFromDto) which unconditionally updates all mapped fields.
    // Sending a partial payload would cause other fields to be set to default values (0, default dates, etc.)
    // or trigger primary key mutation/validation errors in Entity Framework.
    const advance = advances.find(a => a.id === id);
    if (!advance) return;

    updateAdvance.mutate({
      id,
      data: { 
        ...advance,
        status: newStatus 
      }
    });
  };

  const handleAddRepayment = (advance: Advance) => {
    const repaidAmount = repaymentAmountInput[advance.id] || 0;
    if (repaidAmount <= 0) return;

    const totalRepaid = (advance.amountrepaid || 0) + repaidAmount;
    const finalRepaid = Math.min(totalRepaid, advance.amount);
    const newStatus = finalRepaid >= advance.amount ? 'Repaid' : 'Approved';

    // NOTE: Spread the entire existing `advance` object into the payload.
    // The backend expects all fields on update; partial payloads lead to unwanted resets of missing fields.
    updateAdvance.mutate({
      id: advance.id,
      data: {
        ...advance,
        amountrepaid: finalRepaid,
        status: newStatus
      }
    }, {
      onSuccess: () => {
        setActiveRepayId(null);
        setRepaymentAmountInput(prev => ({ ...prev, [advance.id]: 0 }));
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!employee) return;
    if (confirm('Êtes-vous sûr de vouloir supprimer cette avance sur salaire ?')) {
      deleteAdvance.mutate({ id, employeeId: employee.id });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl md:max-w-4xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-none sm:rounded-2xl bg-background">
        
        {/* Header Section */}
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative">
          <div className="flex items-center gap-4 animate-in slide-in-from-top duration-500">
            <div className="w-12 h-12 rounded-2xl bg-corp-blue-50 flex items-center justify-center border border-corp-blue-100">
              <TrendingDown className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Avances sur Salaire
              </DialogTitle>
              <p className="text-muted-foreground text-sm font-medium mt-1">
                Suivi, demandes et remboursements des avances de {employee ? `${employee.firstname} ${employee.lastname}` : 'le collaborateur'}.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-8 h-8 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Action Toolbar */}
          <div className="flex justify-between items-center pb-2 border-b border-corp-blue-50">
            <h3 className="font-bold text-corp-blue-900 flex items-center gap-2">
              <span>Historique des avances</span>
              <Badge className="bg-corp-blue-50 text-corp-blue-700 border-none font-bold rounded-lg px-2.5 py-0.5">
                {advances.length} demandes
              </Badge>
            </h3>
            
            {!showAddForm && (
              <Button 
                onClick={() => setShowAddForm(true)}
                className="h-10 rounded-xl bg-corp-blue-600 text-white hover:bg-corp-blue-800 font-bold px-4 transition-all duration-300 transform active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Nouvelle Demande
              </Button>
            )}
          </div>

          {/* Form to Request Advance */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="bg-sand-50/50 border border-corp-blue-100/50 p-6 rounded-2xl space-y-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-corp-blue-800 pb-2 border-b border-corp-blue-50">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-sm">Créer une demande d&apos;avance sur salaire</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-sand-300" /> Montant (TND)
                    </label>
                    <div className="relative">
                      <Input 
                        type="number"
                        step="0.01"
                        required
                        value={amount || ''}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0.000"
                        className="h-11 rounded-xl border-corp-blue-100 bg-background pl-8 font-bold text-corp-blue-950"
                      />
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sand-300" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 text-sand-300" /> Date de demande
                    </label>
                    <Input 
                      type="date" 
                      required
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      className="h-11 rounded-xl border-corp-blue-100 bg-background font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Plan de remboursement (Ex: 3 mensualités)</label>
                    <Input 
                      type="text"
                      value={repaymentSchedule}
                      onChange={(e) => setRepaymentSchedule(e.target.value)}
                      placeholder="Ex: Retenue sur paie de Juin"
                      className="h-11 rounded-xl border-corp-blue-100 bg-background font-semibold text-corp-blue-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="ghost"
                    onClick={() => setShowAddForm(false)}
                    className="h-10 rounded-xl font-bold text-sand-400 hover:bg-sand-100"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={addAdvance.isPending || amount <= 0}
                    className="h-10 bg-corp-blue-600 text-white font-bold hover:bg-corp-blue-800 px-6"
                  >
                    {addAdvance.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Enregistrer l&apos;avance
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Table list of advances */}
          <div className="overflow-x-auto border border-corp-blue-50 rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sand-50/40 border-b border-corp-blue-50">
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest pl-6">Date & Plan</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-right">Montant</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-center">Remboursement</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-center">Statut</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corp-blue-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-sand-400 font-medium">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-corp-blue-600 mb-2" />
                      Chargement des avances...
                    </td>
                  </tr>
                ) : advances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-sand-400 font-medium">
                      Aucune avance enregistrée pour ce collaborateur.
                    </td>
                  </tr>
                ) : (
                  advances.map((advance: Advance) => {
                    const pctRepaid = advance.amount > 0 ? ((advance.amountrepaid || 0) / advance.amount) * 100 : 0;
                    return (
                      <tr key={advance.id} className="group hover:bg-corp-blue-50/20 transition-all duration-300">
                        <td className="p-4 pl-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-corp-blue-900 text-sm">
                              {new Date(advance.requestdate).toLocaleDateString('fr-FR')}
                            </span>
                            <span className="text-xs text-sand-300 font-medium mt-0.5">
                              {advance.repaymentschedule || 'Sans plan défini'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-corp-blue-950 text-sm">
                          {(advance.amount || 0).toFixed(3)} TND
                        </td>
                        <td className="p-4 w-60">
                          {advance.status !== 'Pending' && advance.status !== 'Rejected' ? (
                            <div className="space-y-1.5 px-4">
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-emerald-600">Payé : {advance.amountrepaid.toFixed(3)}</span>
                                <span className="text-sand-300">Reste : {(advance.amount - advance.amountrepaid).toFixed(3)}</span>
                              </div>
                              <Progress value={pctRepaid} className="h-2 rounded-full bg-corp-blue-50 [&>div]:bg-emerald-600" />
                            </div>
                          ) : (
                            <div className="text-center text-xs text-sand-300 font-medium">
                              En attente d&apos;approbation
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <Badge 
                            className={cn(
                              "rounded-full px-3 py-0.5 font-bold text-[0.65rem] border-none",
                              advance.status === 'Approved' && "bg-emerald-50 text-emerald-600",
                              advance.status === 'Pending' && "bg-amber-50 text-amber-600",
                              advance.status === 'Rejected' && "bg-rose-50 text-rose-600",
                              advance.status === 'Repaid' && "bg-blue-50 text-blue-600"
                            )}
                          >
                            {advance.status === 'Approved' ? 'Approuvé' : 
                             advance.status === 'Pending' ? 'En attente' : 
                             advance.status === 'Repaid' ? 'Remboursé' : 'Refusé'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {advance.status === 'Pending' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleStatusChange(advance.id, 'Approved')}
                                  disabled={updateAdvance.isPending}
                                  className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                  title="Approuver"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleStatusChange(advance.id, 'Rejected')}
                                  disabled={updateAdvance.isPending}
                                  className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                  title="Refuser"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}

                            {advance.status === 'Approved' && (
                              <div className="flex items-center gap-1">
                                {activeRepayId === advance.id ? (
                                  <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                                    <Input 
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={repaymentAmountInput[advance.id] || ''}
                                      onChange={(e) => setRepaymentAmountInput(prev => ({ ...prev, [advance.id]: parseFloat(e.target.value) || 0 }))}
                                      className="h-8 w-20 px-2 rounded-lg font-bold border-corp-blue-100 text-xs font-mono"
                                    />
                                    <Button 
                                      size="icon"
                                      onClick={() => handleAddRepayment(advance)}
                                      disabled={updateAdvance.isPending}
                                      className="h-8 w-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                      title="Enregistrer le remboursement"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setActiveRepayId(null)}
                                      className="h-8 w-8 rounded-lg text-sand-400 hover:bg-sand-50"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setActiveRepayId(advance.id)}
                                    className="h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-750 text-xs font-bold gap-1 px-2.5"
                                    title="Rembourser"
                                  >
                                    <Coins className="w-3.5 h-3.5" /> Rembourser
                                  </Button>
                                )}
                              </div>
                            )}

                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setPrintAdvance(advance)}
                              className="h-8 w-8 rounded-lg text-corp-blue-600 hover:bg-corp-blue-50 hover:text-corp-blue-750"
                              title="Imprimer le reçu d'avance"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(advance.id)}
                              disabled={deleteAdvance.isPending}
                              className="h-8 w-8 rounded-lg text-sand-300 hover:text-rose-600 hover:bg-rose-50"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </DialogContent>
      
      {/* Print Option Dialog */}
      {employee && (
        <PrintVariantDialog
          isOpen={printAdvance !== null}
          onClose={() => setPrintAdvance(null)}
          employee={employee}
          advance={printAdvance}
          docType="advance"
        />
      )}
    </Dialog>
  );
}


