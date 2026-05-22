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
  CalendarDays, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Clock, 
  Loader2, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Person } from '@/types/team';
import { Leave } from '@/types/hr';
import { 
  useEmployeeLeaves, 
  useAddLeave, 
  useUpdateLeave, 
  useDeleteLeave 
} from '@/hooks/use-hr';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaveManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Person | null;
}

export function LeaveManagementDialog({ isOpen, onClose, employee }: LeaveManagementDialogProps) {
  // --- Form State ---
  const [leaveType, setLeaveType] = useState<string>('Annuel');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // --- API Queries & Mutations ---
  const { data: leaves = [], isLoading } = useEmployeeLeaves(employee?.id || 0);
  const addLeave = useAddLeave();
  const updateLeave = useUpdateLeave();
  const deleteLeave = useDeleteLeave();

  // --- Auto-calculate duration ---
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      if (diffTime >= 0) {
        // Add 1 day to make it inclusive (e.g. Monday to Monday is 1 day, Monday to Tuesday is 2 days)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setDurationDays(diffDays);
      } else {
        setDurationDays(0);
      }
    } else {
      setDurationDays(0);
    }
  }, [startDate, endDate]);

  // Reset states on close/open
  useEffect(() => {
    if (isOpen) {
      setShowAddForm(false);
      setLeaveType('Annuel');
      setStartDate('');
      setEndDate('');
      setDurationDays(0);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !startDate || !endDate || durationDays <= 0) return;

    const newLeave: Partial<Leave> = {
      employeeid: employee.id,
      leavetype: leaveType,
      startdate: new Date(startDate).toISOString(),
      enddate: new Date(endDate).toISOString(),
      durationdays: durationDays,
      status: 'Pending',
      employeename: `${employee.firstname} ${employee.lastname}`,
    };

    addLeave.mutate(newLeave, {
      onSuccess: () => {
        setShowAddForm(false);
        setStartDate('');
        setEndDate('');
        setDurationDays(0);
      }
    });
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    // NOTE: Find the existing leave object to send a full payload.
    // The backend uses a mapping function (UpdateFromDto) which unconditionally updates all mapped fields.
    // Sending a partial payload would cause other fields to be set to default values (0, default dates, etc.)
    // or trigger primary key mutation/validation errors in Entity Framework.
    const leave = leaves.find(l => l.id === id);
    if (!leave) return;

    updateLeave.mutate({
      id,
      data: { 
        ...leave,
        status: newStatus 
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!employee) return;
    if (confirm('Êtes-vous sûr de vouloir supprimer cette demande de congé ?')) {
      deleteLeave.mutate({ id, employeeId: employee.id });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl md:max-w-4xl p-0 overflow-hidden border-forest-100 shadow-2xl rounded-none sm:rounded-[32px] bg-background">
        
        {/* Header Section */}
        <DialogHeader className="p-8 bg-forest-900 text-white relative">
          <div className="flex items-center gap-4 animate-in slide-in-from-top duration-500">
            <div className="w-12 h-12 rounded-2xl bg-forest-800 flex items-center justify-center border border-forest-700">
              <CalendarDays className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                Gestion des Congés
              </DialogTitle>
              <p className="text-forest-300 text-sm font-medium mt-1">
                Suivi et demandes d&apos;absences pour {employee ? `${employee.firstname} ${employee.lastname}` : 'le collaborateur'}.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Action Toolbar */}
          <div className="flex justify-between items-center pb-2 border-b border-forest-50">
            <h3 className="font-heading font-bold text-forest-900 flex items-center gap-2">
              <span>Historique des absences</span>
              <Badge className="bg-forest-50 text-forest-700 border-none font-bold rounded-lg px-2.5 py-0.5">
                {leaves.length} demandes
              </Badge>
            </h3>
            
            {!showAddForm && (
              <Button 
                onClick={() => setShowAddForm(true)}
                className="h-10 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold px-4 transition-all duration-300 transform active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Nouvelle Demande
              </Button>
            )}
          </div>

          {/* Form to Add Leave */}
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
                  <span className="font-bold text-sm">Formuler une nouvelle demande de congé</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Type de congé</label>
                    <Select value={leaveType} onValueChange={(val) => setLeaveType(val || 'Annuel')}>
                      <SelectTrigger className="h-11 rounded-xl border-forest-100 bg-background font-bold text-forest-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-forest-100 shadow-xl">
                        <SelectItem value="Annuel">Annuel</SelectItem>
                        <SelectItem value="Maladie">Maladie</SelectItem>
                        <SelectItem value="Maternité">Maternité</SelectItem>
                        <SelectItem value="Paternité">Paternité</SelectItem>
                        <SelectItem value="Exceptionnel">Exceptionnel</SelectItem>
                        <SelectItem value="Sans solde">Sans solde</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Date de début</label>
                    <Input 
                      type="date" 
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-11 rounded-xl border-forest-100 bg-background font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Date de fin</label>
                    <Input 
                      type="date" 
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-11 rounded-xl border-forest-100 bg-background font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Durée estimée</label>
                    <div className="h-11 rounded-xl border border-forest-100 bg-forest-50/50 flex items-center px-4 font-mono font-bold text-forest-900">
                      {durationDays} {durationDays > 1 ? 'jours' : 'jour'}
                    </div>
                  </div>
                </div>

                {startDate && endDate && durationDays <= 0 && (
                  <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>La date de début doit être antérieure ou égale à la date de fin.</span>
                  </div>
                )}

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
                    disabled={addLeave.isPending || durationDays <= 0}
                    className="h-10 rounded-xl bg-forest-600 text-white font-bold hover:bg-forest-800 px-6"
                  >
                    {addLeave.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Soumettre
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Table list of leaves */}
          <div className="overflow-x-auto border border-forest-50 rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sand-50/40 border-b border-forest-50">
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest pl-6">Type</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Période</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-center">Durée</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-center">Statut</th>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-sand-400 font-medium">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-forest-600 mb-2" />
                      Chargement des absences...
                    </td>
                  </tr>
                ) : leaves.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-sand-400 font-medium">
                      Aucune absence enregistrée pour ce collaborateur.
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave: Leave) => (
                    <tr key={leave.id} className="group hover:bg-forest-50/20 transition-all duration-300">
                      <td className="p-4 pl-6">
                        <span className="font-bold text-forest-900 text-sm">{leave.leavetype}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col text-xs text-sand-600 font-semibold gap-0.5">
                          <span>Du <span className="text-forest-950 font-bold">{new Date(leave.startdate).toLocaleDateString('fr-FR')}</span></span>
                          <span>Au <span className="text-forest-950 font-bold">{new Date(leave.enddate).toLocaleDateString('fr-FR')}</span></span>
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-forest-900 text-sm">
                        {leave.durationdays} jrs
                      </td>
                      <td className="p-4 text-center">
                        <Badge 
                          className={cn(
                            "rounded-full px-3 py-0.5 font-bold text-[0.65rem] border-none",
                            leave.status === 'Approved' && "bg-emerald-50 text-emerald-600",
                            leave.status === 'Pending' && "bg-amber-50 text-amber-600",
                            leave.status === 'Rejected' && "bg-rose-50 text-rose-600"
                          )}
                        >
                          {leave.status === 'Approved' ? 'Approuvé' : 
                           leave.status === 'Pending' ? 'En attente' : 'Refusé'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {leave.status === 'Pending' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleStatusChange(leave.id, 'Approved')}
                                disabled={updateLeave.isPending}
                                className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                title="Approuver"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleStatusChange(leave.id, 'Rejected')}
                                disabled={updateLeave.isPending}
                                className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                title="Refuser"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(leave.id)}
                            disabled={deleteLeave.isPending}
                            className="h-8 w-8 rounded-lg text-sand-300 hover:text-rose-600 hover:bg-rose-50"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
