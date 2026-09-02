import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chantierService } from '@/services/chantier/chantier.service';
import {
  ChantierListItem,
  ChantierDetail,
  ChantierStatistics,
  CreateChantierInput,
  UpdateChantierInput,
  AssignTeamMemberInput,
  CreateChantierPhaseInput,
  CreateChantierTaskInput,
  UpdateTaskStatusInput,
  CreateMaterialRequirementInput,
  LogMaterialConsumptionInput,
  CreateProgressEntryInput,
  CreateChantierAlertInput,
  AssignChantierVehicleInput,
  ChantierStatus,
  ChantierFlag
} from '@/types/chantier';
import { toast } from 'sonner';

export const CHANTIER_QUERY_KEYS = {
  all: ['chantiers'] as const,
  lists: () => [...CHANTIER_QUERY_KEYS.all, 'list'] as const,
  list: (params?: { status?: ChantierStatus; healthFlag?: ChantierFlag; search?: string }) =>
    [...CHANTIER_QUERY_KEYS.lists(), params] as const,
  details: () => [...CHANTIER_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...CHANTIER_QUERY_KEYS.details(), id] as const,
  statistics: (id: number) => [...CHANTIER_QUERY_KEYS.detail(id), 'statistics'] as const,
};

export function useChantiersList(params?: { status?: ChantierStatus; healthFlag?: ChantierFlag; search?: string }) {
  return useQuery<ChantierListItem[]>({
    queryKey: CHANTIER_QUERY_KEYS.list(params),
    queryFn: () => chantierService.getAll(params),
  });
}

export function useChantierDetail(id?: number) {
  return useQuery<ChantierDetail>({
    queryKey: CHANTIER_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => chantierService.getById(id!),
    enabled: !!id && id > 0,
  });
}

export function useChantierStatistics(id?: number) {
  return useQuery<ChantierStatistics>({
    queryKey: CHANTIER_QUERY_KEYS.statistics(id ?? 0),
    queryFn: () => chantierService.getStatistics(id!),
    enabled: !!id && id > 0,
  });
}

export function useCreateChantier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChantierInput) => chantierService.create(data),
    onSuccess: (newChantier) => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.lists() });
      toast.success(`Chantier "${newChantier.name}" créé avec succès.`);
    },
    onError: () => {
      toast.error("Erreur lors de la création du chantier.");
    },
  });
}

export function useUpdateChantierStatus(chantierId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ status, healthFlag }: { status: ChantierStatus; healthFlag?: ChantierFlag }) =>
      chantierService.updateStatus(chantierId, status, healthFlag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.lists() });
      toast.success("Statut mis à jour.");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du statut.");
    },
  });
}

export function useAssignTeamMember(chantierId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignTeamMemberInput) => chantierService.assignTeamMember(chantierId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      toast.success("Membre affecté à l'équipe.");
    },
    onError: () => {
      toast.error("Erreur lors de l'affectation.");
    },
  });
}

export function useReleaseTeamMember(chantierId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: number) => chantierService.releaseTeamMember(chantierId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      toast.success("Membre retiré du chantier.");
    },
    onError: () => {
      toast.error("Erreur lors du retrait du membre.");
    },
  });
}

export function useCreatePhase(chantierId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateChantierPhaseInput) => chantierService.createPhase(chantierId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      toast.success("Phase ajoutée.");
    },
    onError: () => {
      toast.error("Erreur lors de la création de la phase.");
    },
  });
}

export function useCreateTask(chantierId: number, phaseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateChantierTaskInput) => chantierService.createTask(chantierId, phaseId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      toast.success("Tâche créée.");
    },
    onError: () => {
      toast.error("Erreur lors de la création de la tâche.");
    },
  });
}

export function useUpdateTaskStatus(chantierId: number, phaseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: number; input: UpdateTaskStatusInput }) =>
      chantierService.updateTaskStatus(chantierId, phaseId, taskId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de la tâche.");
    },
  });
}

export function useAddMaterialRequirement(chantierId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMaterialRequirementInput) => chantierService.addMaterialRequirement(chantierId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      toast.success("Besoin matériel enregistré.");
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement du besoin matériel.");
    },
  });
}

export function useLogMaterialConsumption(chantierId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LogMaterialConsumptionInput) => chantierService.logConsumption(chantierId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.statistics(chantierId) });
      toast.success("Consommation enregistrée.");
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement de la consommation.");
    },
  });
}

export function useAddProgressEntry(chantierId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProgressEntryInput) => chantierService.addProgressEntry(chantierId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      toast.success("Entrée de journal enregistrée.");
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout au journal.");
    },
  });
}

export function useAddChantierAlert(chantierId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateChantierAlertInput) => chantierService.addAlert(chantierId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      toast.success("Alerte créée.");
    },
    onError: () => {
      toast.error("Erreur lors de la création de l'alerte.");
    },
  });
}

export function useResolveChantierAlert(chantierId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: number) => chantierService.resolveAlert(chantierId, alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      toast.success("Alerte résolue.");
    },
    onError: () => {
      toast.error("Erreur lors de la résolution de l'alerte.");
    },
  });
}

export function useAssignVehicle(chantierId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignChantierVehicleInput) => chantierService.assignVehicle(chantierId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      toast.success("Véhicule affecté au chantier.");
    },
    onError: () => {
      toast.error("Erreur lors de l'affectation du véhicule.");
    },
  });
}

export function useReleaseVehicle(chantierId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: number) => chantierService.releaseVehicle(chantierId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANTIER_QUERY_KEYS.detail(chantierId) });
      toast.success("Véhicule libéré.");
    },
    onError: () => {
      toast.error("Erreur lors de la libération du véhicule.");
    },
  });
}
