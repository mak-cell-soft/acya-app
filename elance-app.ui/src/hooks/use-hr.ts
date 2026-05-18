import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '@/services/components/leave.service';
import { payslipService } from '@/services/components/payslip.service';
import { advanceService } from '@/services/components/advance.service';
import { Leave, Payslip, Advance } from '@/types/hr';
import { toast } from 'sonner';

// ==========================================
// 📅 Leave Hooks
// ==========================================

export function useAllLeaves() {
  return useQuery<Leave[]>({
    queryKey: ['leaves'],
    queryFn: () => leaveService.getAll(),
  });
}

export function useEmployeeLeaves(employeeId: number) {
  return useQuery<Leave[]>({
    queryKey: ['employee-leaves', employeeId],
    queryFn: () => leaveService.getByEmployee(employeeId),
    enabled: !!employeeId,
  });
}

export function useAddLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newLeave: Partial<Leave>) => leaveService.add(newLeave),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      if (variables.employeeid) {
        queryClient.invalidateQueries({ queryKey: ['employee-leaves', variables.employeeid] });
      }
      toast.success('Demande de congé ajoutée avec succès');
    },
    onError: (error: any) => {
      console.error('Error adding leave:', error);
      toast.error('Erreur lors de l\'ajout du congé');
    },
  });
}

export function useUpdateLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Leave> }) =>
      leaveService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      if (data && data.employeeid) {
        queryClient.invalidateQueries({ queryKey: ['employee-leaves', data.employeeid] });
      }
      toast.success('Congé mis à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating leave:', error);
      toast.error('Erreur lors de la mise à jour du congé');
    },
  });
}

export function useDeleteLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, employeeId }: { id: number; employeeId: number }) =>
      leaveService.delete(id).then(() => employeeId),
    onSuccess: (employeeId) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['employee-leaves', employeeId] });
      toast.success('Congé supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting leave:', error);
      toast.error('Erreur lors de la suppression du congé');
    },
  });
}

// ==========================================
// 💵 Payslip Hooks
// ==========================================

export function useAllPayslips() {
  return useQuery<Payslip[]>({
    queryKey: ['payslips'],
    queryFn: () => payslipService.getAll(),
  });
}

export function useEmployeePayslips(employeeId: number) {
  return useQuery<Payslip[]>({
    queryKey: ['employee-payslips', employeeId],
    queryFn: () => payslipService.getByEmployee(employeeId),
    enabled: !!employeeId,
  });
}

export function useGeneratePayslip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payslip: Partial<Payslip>) => payslipService.generate(payslip),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      if (variables.employeeid) {
        queryClient.invalidateQueries({ queryKey: ['employee-payslips', variables.employeeid] });
      }
      toast.success('Bulletin de paie généré avec succès');
    },
    onError: (error: any) => {
      console.error('Error generating payslip:', error);
      toast.error('Erreur lors de la génération du bulletin de paie');
    },
  });
}

// ==========================================
// 💸 Advance Hooks
// ==========================================

export function useAllAdvances() {
  return useQuery<Advance[]>({
    queryKey: ['advances'],
    queryFn: () => advanceService.getAll(),
  });
}

export function useEmployeeAdvances(employeeId: number) {
  return useQuery<Advance[]>({
    queryKey: ['employee-advances', employeeId],
    queryFn: () => advanceService.getByEmployee(employeeId),
    enabled: !!employeeId,
  });
}

export function useAddAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newAdvance: Partial<Advance>) => advanceService.add(newAdvance),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      if (variables.employeeid) {
        queryClient.invalidateQueries({ queryKey: ['employee-advances', variables.employeeid] });
      }
      toast.success('Demande d\'avance ajoutée avec succès');
    },
    onError: (error: any) => {
      console.error('Error adding advance:', error);
      toast.error('Erreur lors de l\'ajout de l\'avance');
    },
  });
}

export function useUpdateAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Advance> }) =>
      advanceService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      if (data && data.employeeid) {
        queryClient.invalidateQueries({ queryKey: ['employee-advances', data.employeeid] });
      }
      toast.success('Avance mise à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating advance:', error);
      toast.error('Erreur lors de la mise à jour de l\'avance');
    },
  });
}

export function useDeleteAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, employeeId }: { id: number; employeeId: number }) =>
      advanceService.delete(id).then(() => employeeId),
    onSuccess: (employeeId) => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-advances', employeeId] });
      toast.success('Avance supprimée avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting advance:', error);
      toast.error('Erreur lors de la suppression de l\'avance');
    },
  });
}
