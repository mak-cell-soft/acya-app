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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Download, 
  X, 
  Loader2, 
  Sparkles,
  DollarSign,
  Calendar,
  ChevronRight,
  Printer
} from 'lucide-react';
import { Person } from '@/types/team';
import { Payslip } from '@/types/hr';
import { 
  useEmployeePayslips, 
  useGeneratePayslip 
} from '@/hooks/use-hr';
import { payslipService } from '@/services/components/payslip.service';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { PrintVariantDialog } from '@/components/print/print-trigger-button';

interface PayslipManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Person | null;
}

const MONTHS_FR = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' }
];

export function PayslipManagementDialog({ isOpen, onClose, employee }: PayslipManagementDialogProps) {
  // --- Form State ---
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());
  const [bonuses, setBonuses] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<number | null>(null);
  const [printPayslip, setPrintPayslip] = useState<Payslip | null>(null);

  // --- API Queries & Mutations ---
  const { data: payslips = [], isLoading } = useEmployeePayslips(employee?.id || 0);
  const generatePayslip = useGeneratePayslip();

  // Reset states on open/close
  useEffect(() => {
    if (isOpen) {
      setShowAddForm(false);
      setPeriodMonth(new Date().getMonth() + 1);
      setPeriodYear(new Date().getFullYear());
      setBonuses(0);
      setDeductions(0);
      setPrintPayslip(null);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    const newPayslip: Partial<Payslip> = {
      employeeid: employee.id,
      periodmonth: periodMonth,
      periodyear: periodYear,
      basesalary: employee.basesalary || 0,
      bonuses: bonuses,
      deductions: deductions,
    };

    generatePayslip.mutate(newPayslip, {
      onSuccess: () => {
        setShowAddForm(false);
      }
    });
  };

  const handleDownload = async (payslip: Payslip) => {
    setIsDownloading(payslip.id);
    try {
      const data = await payslipService.downloadPdf(payslip.id);
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthLabel = MONTHS_FR.find(m => m.value === payslip.periodmonth)?.label || payslip.periodmonth;
      link.setAttribute('download', `fiche_de_paie_${employee?.lastname}_${employee?.firstname}_${monthLabel}_${payslip.periodyear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Bulletin de paie téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.error('Erreur lors du téléchargement du bulletin de paie');
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl md:max-w-4xl p-0 overflow-hidden border-forest-100 shadow-2xl rounded-none sm:rounded-[32px] bg-background">
        
        {/* Header Section */}
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative">
          <div className="flex items-center gap-4 animate-in slide-in-from-top duration-500">
            <div className="w-12 h-12 rounded-2xl bg-forest-50 flex items-center justify-center border border-forest-100">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                Bulletins de Paie
              </DialogTitle>
              <p className="text-muted-foreground text-sm font-medium mt-1">
                Générez et gérez les fiches de paie pour {employee ? `${employee.firstname} ${employee.lastname}` : 'le collaborateur'}.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Action Toolbar */}
          <div className="flex justify-between items-center pb-2 border-b border-forest-50">
            <h3 className="font-heading font-bold text-forest-900 flex items-center gap-2">
              <span>Bulletins générés</span>
              <Badge className="bg-forest-50 text-forest-700 border-none font-bold rounded-lg px-2.5 py-0.5">
                {payslips.length} fiches
              </Badge>
            </h3>
            
            {!showAddForm && (
              <Button 
                onClick={() => setShowAddForm(true)}
                className="h-10 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold px-4 transition-all duration-300 transform active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Calculer Paie
              </Button>
            )}
          </div>

          {/* Form to Generate Payslip */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="bg-sand-50/50 border border-forest-100/50 p-6 rounded-2xl space-y-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-forest-800 pb-2 border-b border-forest-50">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-sm">Générer un bulletin pour une nouvelle période</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-sand-300" /> Mois
                    </label>
                    <Select value={periodMonth.toString()} onValueChange={(val) => setPeriodMonth(parseInt(val || '1'))}>
                      <SelectTrigger className="h-11 rounded-xl border-forest-100 bg-background font-bold text-forest-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-forest-100 shadow-xl">
                        {MONTHS_FR.map(m => (
                          <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Année</label>
                    <Input 
                      type="number" 
                      required
                      value={periodYear}
                      onChange={(e) => setPeriodYear(parseInt(e.target.value))}
                      className="h-11 rounded-xl border-forest-100 bg-background font-bold text-forest-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest flex items-center gap-1">
                      <Plus className="w-3 h-3 text-emerald-500" /> Primes (TND)
                    </label>
                    <div className="relative">
                      <Input 
                        type="number"
                        step="0.01"
                        value={bonuses}
                        onChange={(e) => setBonuses(parseFloat(e.target.value) || 0)}
                        className="h-11 rounded-xl border-forest-100 bg-background pl-8 font-bold text-forest-950"
                      />
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sand-300" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest flex items-center gap-1">
                      <X className="w-3 h-3 text-rose-500" /> Retenues (TND)
                    </label>
                    <div className="relative">
                      <Input 
                        type="number"
                        step="0.01"
                        value={deductions}
                        onChange={(e) => setDeductions(parseFloat(e.target.value) || 0)}
                        className="h-11 rounded-xl border-forest-100 bg-background pl-8 font-bold text-forest-950"
                      />
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sand-300" />
                    </div>
                  </div>
                </div>

                <div className="bg-forest-50 p-4 rounded-xl border border-forest-100/50 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-forest-800 font-medium">
                    <span>Salaire de base de l&apos;employé :</span>
                    <span className="font-mono font-bold text-forest-950">{(employee?.basesalary || 0).toFixed(3)} TND</span>
                  </div>
                  <span className="text-sand-400 font-medium">Calcul automatique des charges (CNSS, IRPP, CSS)</span>
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
                    disabled={generatePayslip.isPending}
                    className="h-10 rounded-xl bg-forest-600 text-white font-bold hover:bg-forest-800 px-6"
                  >
                    {generatePayslip.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Calculer & Enregistrer
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Table list of payslips */}
          <div className="overflow-x-auto border border-forest-50 rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sand-50/40 border-b border-forest-50">
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest pl-6">Période</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-right">Salaire Brut</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-right">Primes / Ret.</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-right">Charges</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-right">Salaire Net</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-right pr-6">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-sand-400 font-medium">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-forest-600 mb-2" />
                      Calcul et chargement des fiches...
                    </td>
                  </tr>
                ) : payslips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-sand-400 font-medium">
                      Aucun bulletin de paie généré pour ce collaborateur.
                    </td>
                  </tr>
                ) : (
                  payslips.map((payslip: Payslip) => {
                    const monthLabel = MONTHS_FR.find(m => m.value === payslip.periodmonth)?.label || payslip.periodmonth;
                    const totalCharges = (payslip.cnssamount || 0) + (payslip.irppamount || 0) + (payslip.cssamount || 0);
                    return (
                      <tr key={payslip.id} className="group hover:bg-forest-50/20 transition-all duration-300">
                        <td className="p-4 pl-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-forest-900 text-sm">{monthLabel} {payslip.periodyear}</span>
                            <span className="text-[10px] text-sand-300 font-semibold mt-0.5">
                              Créé le {payslip.generatedat ? new Date(payslip.generatedat).toLocaleDateString('fr-FR') : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-forest-950 text-sm">
                          {(payslip.brutsalary || 0).toFixed(3)}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col font-mono text-xs font-semibold gap-0.5">
                            {payslip.bonuses > 0 && <span className="text-emerald-600">+{payslip.bonuses.toFixed(3)}</span>}
                            {payslip.deductions > 0 && <span className="text-rose-500">-{payslip.deductions.toFixed(3)}</span>}
                            {payslip.bonuses === 0 && payslip.deductions === 0 && <span className="text-sand-300">-</span>}
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono text-xs font-semibold text-sand-600">
                          {totalCharges > 0 ? (
                            <div className="flex flex-col gap-0.5" title={`CNSS: ${payslip.cnssamount.toFixed(3)} | IRPP: ${payslip.irppamount.toFixed(3)}`}>
                              <span>{totalCharges.toFixed(3)}</span>
                              <span className="text-[9px] text-sand-300">Retenu à la source</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-sm">
                            {(payslip.netsalary || 0).toFixed(3)} TND
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setPrintPayslip(payslip)}
                              className="h-9 w-9 rounded-xl text-forest-600 hover:bg-forest-50 hover:text-forest-800 transition-all duration-300"
                              title="Imprimer"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDownload(payslip)}
                              disabled={isDownloading !== null}
                              className="h-9 w-9 rounded-xl text-forest-600 hover:bg-forest-50 hover:text-forest-800 transition-all duration-300"
                              title="Télécharger en PDF"
                            >
                              {isDownloading === payslip.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
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
          isOpen={printPayslip !== null}
          onClose={() => setPrintPayslip(null)}
          employee={employee}
          payslip={printPayslip}
          docType="payslip"
        />
      )}
    </Dialog>
  );
}
