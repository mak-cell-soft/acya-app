import api from '@/lib/axios';
import {
  ChantierListItem,
  ChantierDetail,
  CreateChantierInput,
  UpdateChantierInput,
  ChantierTeamMember,
  AssignTeamMemberInput,
  ChantierPhase,
  CreateChantierPhaseInput,
  ChantierTask,
  CreateChantierTaskInput,
  UpdateTaskStatusInput,
  ChantierMaterialRequirement,
  CreateMaterialRequirementInput,
  ChantierMaterialConsumption,
  LogMaterialConsumptionInput,
  ChantierProgressEntry,
  CreateProgressEntryInput,
  ChantierAlert,
  CreateChantierAlertInput,
  ChantierVehicleAssignment,
  AssignChantierVehicleInput,
  ChantierStatistics,
  ChantierStatus,
  ChantierFlag
} from '@/types/chantier';

export const chantierService = {
  // Core Chantier CRUD
  getAll: async (params?: { status?: ChantierStatus; healthFlag?: ChantierFlag; search?: string }): Promise<ChantierListItem[]> => {
    const response = await api.get('/chantier', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ChantierDetail> => {
    const response = await api.get(`/chantier/${id}`);
    return response.data;
  },

  create: async (data: CreateChantierInput): Promise<ChantierDetail> => {
    const response = await api.post('/chantier', data);
    return response.data;
  },

  update: async (id: number, data: UpdateChantierInput): Promise<void> => {
    await api.put(`/chantier/${id}`, data);
  },

  updateStatus: async (id: number, status: ChantierStatus, healthFlag?: ChantierFlag): Promise<void> => {
    await api.patch(`/chantier/${id}/status`, { status, healthFlag });
  },

  updateProgress: async (id: number, progressPct: number): Promise<void> => {
    await api.patch(`/chantier/${id}/progress`, { progressPct });
  },

  deleteSoft: async (id: number): Promise<void> => {
    await api.delete(`/chantier/${id}`);
  },

  // Team
  getTeam: async (id: number): Promise<ChantierTeamMember[]> => {
    const response = await api.get(`/chantier/${id}/team`);
    return response.data;
  },

  assignTeamMember: async (id: number, input: AssignTeamMemberInput): Promise<ChantierTeamMember> => {
    const response = await api.post(`/chantier/${id}/team`, input);
    return response.data;
  },

  releaseTeamMember: async (id: number, memberId: number): Promise<void> => {
    await api.delete(`/chantier/${id}/team/${memberId}`);
  },

  // Production (Phases & Tasks)
  getPhases: async (id: number): Promise<ChantierPhase[]> => {
    const response = await api.get(`/chantier/${id}/phases`);
    return response.data;
  },

  createPhase: async (id: number, input: CreateChantierPhaseInput): Promise<ChantierPhase> => {
    const response = await api.post(`/chantier/${id}/phases`, input);
    return response.data;
  },

  deletePhase: async (id: number, phaseId: number): Promise<void> => {
    await api.delete(`/chantier/${id}/phases/${phaseId}`);
  },

  createTask: async (id: number, phaseId: number, input: CreateChantierTaskInput): Promise<ChantierTask> => {
    const response = await api.post(`/chantier/${id}/phases/${phaseId}/tasks`, input);
    return response.data;
  },

  updateTaskStatus: async (id: number, phaseId: number, taskId: number, input: UpdateTaskStatusInput): Promise<void> => {
    await api.patch(`/chantier/${id}/phases/${phaseId}/tasks/${taskId}/status`, input);
  },

  deleteTask: async (id: number, phaseId: number, taskId: number): Promise<void> => {
    await api.delete(`/chantier/${id}/phases/${phaseId}/tasks/${taskId}`);
  },

  // Materials
  getMaterials: async (id: number): Promise<ChantierMaterialRequirement[]> => {
    const response = await api.get(`/chantier/${id}/materials`);
    return response.data;
  },

  addMaterialRequirement: async (id: number, input: CreateMaterialRequirementInput): Promise<ChantierMaterialRequirement> => {
    const response = await api.post(`/chantier/${id}/materials`, input);
    return response.data;
  },

  deleteMaterialRequirement: async (id: number, reqId: number): Promise<void> => {
    await api.delete(`/chantier/${id}/materials/${reqId}`);
  },

  getConsumptions: async (id: number): Promise<ChantierMaterialConsumption[]> => {
    const response = await api.get(`/chantier/${id}/consumptions`);
    return response.data;
  },

  logConsumption: async (id: number, input: LogMaterialConsumptionInput): Promise<ChantierMaterialConsumption> => {
    const response = await api.post(`/chantier/${id}/consumptions`, input);
    return response.data;
  },

  // Suivi & Alerts
  getProgressEntries: async (id: number): Promise<ChantierProgressEntry[]> => {
    const response = await api.get(`/chantier/${id}/progress-entries`);
    return response.data;
  },

  addProgressEntry: async (id: number, input: CreateProgressEntryInput): Promise<ChantierProgressEntry> => {
    const response = await api.post(`/chantier/${id}/progress-entries`, input);
    return response.data;
  },

  getAlerts: async (id: number): Promise<ChantierAlert[]> => {
    const response = await api.get(`/chantier/${id}/alerts`);
    return response.data;
  },

  addAlert: async (id: number, input: CreateChantierAlertInput): Promise<ChantierAlert> => {
    const response = await api.post(`/chantier/${id}/alerts`, input);
    return response.data;
  },

  resolveAlert: async (id: number, alertId: number): Promise<void> => {
    await api.patch(`/chantier/${id}/alerts/${alertId}/resolve`);
  },

  // Vehicles (Magasin)
  getVehicles: async (id: number): Promise<ChantierVehicleAssignment[]> => {
    const response = await api.get(`/chantier/${id}/vehicles`);
    return response.data;
  },

  assignVehicle: async (id: number, input: AssignChantierVehicleInput): Promise<ChantierVehicleAssignment> => {
    const response = await api.post(`/chantier/${id}/vehicles`, input);
    return response.data;
  },

  releaseVehicle: async (id: number, assignmentId: number): Promise<void> => {
    await api.delete(`/chantier/${id}/vehicles/${assignmentId}`);
  },

  // Statistics / KPIs
  getStatistics: async (id: number): Promise<ChantierStatistics> => {
    const response = await api.get(`/chantier/${id}/statistics`);
    return response.data;
  }
};
