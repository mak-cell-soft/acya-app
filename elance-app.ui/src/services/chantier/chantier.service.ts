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
  ChantierFlag,
  ChantierPhaseStatus,
  ChantierTaskStatus,
  ChantierEntryType,
  ChantierEntryStatus,
  ChantierAlertType,
  ChantierCaisseSummary,
  ChantierCaisseTransaction,
  CreateCaisseAlimentationInput,
  CreateCaisseSortieInput
} from '@/types/chantier';

// Bi-directional enum mappings to support both numeric and string representations seamlessly
export const CHANTIER_STATUS_MAP: Record<number, ChantierStatus> = {
  0: 'Planned',
  1: 'InProgress',
  2: 'OnHold',
  3: 'Completed',
  4: 'Cancelled',
};

export const CHANTIER_STATUS_TO_INT: Record<string, number> = {
  Planned: 0,
  InProgress: 1,
  OnHold: 2,
  Completed: 3,
  Cancelled: 4,
};

export const CHANTIER_FLAG_MAP: Record<number, ChantierFlag> = {
  0: 'Green',
  1: 'Orange',
  2: 'Red',
};

export const CHANTIER_FLAG_TO_INT: Record<string, number> = {
  Green: 0,
  Orange: 1,
  Red: 2,
};

export const CHANTIER_ENTRY_TYPE_MAP: Record<number, ChantierEntryType> = {
  0: 'DailyReport',
  1: 'Milestone',
  2: 'Observation',
  3: 'Issue',
};

export const CHANTIER_ENTRY_TYPE_TO_INT: Record<string, number> = {
  DailyReport: 0,
  Milestone: 1,
  Observation: 2,
  Issue: 3,
};

export const CHANTIER_ENTRY_STATUS_MAP: Record<number, ChantierEntryStatus> = {
  0: 'Done',
  1: 'Pending',
  2: 'Cancelled',
};

export const CHANTIER_ENTRY_STATUS_TO_INT: Record<string, number> = {
  Done: 0,
  Pending: 1,
  Cancelled: 2,
};

export const CHANTIER_ALERT_TYPE_MAP: Record<number, ChantierAlertType> = {
  0: 'Critical',
  1: 'Warning',
  2: 'Info',
};

export const CHANTIER_ALERT_TYPE_TO_INT: Record<string, number> = {
  Critical: 0,
  Warning: 1,
  Info: 2,
};

export const CHANTIER_TASK_STATUS_MAP: Record<number, ChantierTaskStatus> = {
  0: 'Planned',
  1: 'InProgress',
  2: 'Done',
  3: 'Blocked',
  4: 'Cancelled',
};

export const CHANTIER_TASK_STATUS_TO_INT: Record<string, number> = {
  Planned: 0,
  InProgress: 1,
  Done: 2,
  Blocked: 3,
  Cancelled: 4,
};

export const CHANTIER_PHASE_STATUS_MAP: Record<number, ChantierPhaseStatus> = {
  0: 'Planned',
  1: 'InProgress',
  2: 'Completed',
  3: 'Cancelled',
};

// Normalization functions
export function normalizeAlert(alert: any): ChantierAlert {
  if (!alert) return alert;
  return {
    ...alert,
    alertType: typeof alert.alertType === 'number'
      ? (CHANTIER_ALERT_TYPE_MAP[alert.alertType] ?? 'Warning')
      : alert.alertType,
  };
}

export function normalizeProgressEntry(entry: any): ChantierProgressEntry {
  if (!entry) return entry;
  return {
    ...entry,
    entryType: typeof entry.entryType === 'number'
      ? (CHANTIER_ENTRY_TYPE_MAP[entry.entryType] ?? 'DailyReport')
      : entry.entryType,
    entryStatus: typeof entry.entryStatus === 'number'
      ? (CHANTIER_ENTRY_STATUS_MAP[entry.entryStatus] ?? 'Done')
      : entry.entryStatus,
  };
}

export function normalizeTask(task: any): ChantierTask {
  if (!task) return task;
  return {
    ...task,
    status: typeof task.status === 'number'
      ? (CHANTIER_TASK_STATUS_MAP[task.status] ?? 'Planned')
      : task.status,
  };
}

export function normalizePhase(phase: any): ChantierPhase {
  if (!phase) return phase;
  return {
    ...phase,
    status: typeof phase.status === 'number'
      ? (CHANTIER_PHASE_STATUS_MAP[phase.status] ?? 'Planned')
      : phase.status,
    tasks: Array.isArray(phase.tasks) ? phase.tasks.map(normalizeTask) : [],
  };
}

export function normalizeChantierListItem(item: any): ChantierListItem {
  if (!item) return item;
  return {
    ...item,
    status: typeof item.status === 'number'
      ? (CHANTIER_STATUS_MAP[item.status] ?? 'Planned')
      : item.status,
    healthFlag: typeof item.healthFlag === 'number'
      ? (CHANTIER_FLAG_MAP[item.healthFlag] ?? 'Green')
      : item.healthFlag,
  };
}

export function normalizeChantierDetail(detail: any): ChantierDetail {
  if (!detail) return detail;
  const base = normalizeChantierListItem(detail);
  return {
    ...base,
    phases: Array.isArray(detail.phases) ? detail.phases.map(normalizePhase) : [],
    progressEntries: Array.isArray(detail.progressEntries) ? detail.progressEntries.map(normalizeProgressEntry) : [],
    alerts: Array.isArray(detail.alerts) ? detail.alerts.map(normalizeAlert) : [],
    teamMembers: Array.isArray(detail.teamMembers) ? detail.teamMembers : [],
    materialRequirements: Array.isArray(detail.materialRequirements) ? detail.materialRequirements : [],
    vehicleAssignments: Array.isArray(detail.vehicleAssignments) ? detail.vehicleAssignments : [],
  };
}

export const chantierService = {
  // Core Chantier CRUD
  getAll: async (params?: { status?: ChantierStatus; healthFlag?: ChantierFlag; search?: string }): Promise<ChantierListItem[]> => {
    const apiParams: any = { ...params };
    if (params?.status && typeof params.status === 'string' && params.status in CHANTIER_STATUS_TO_INT) {
      apiParams.status = CHANTIER_STATUS_TO_INT[params.status];
    }
    if (params?.healthFlag && typeof params.healthFlag === 'string' && params.healthFlag in CHANTIER_FLAG_TO_INT) {
      apiParams.healthFlag = CHANTIER_FLAG_TO_INT[params.healthFlag];
    }
    const response = await api.get('/chantier', { params: apiParams });
    return Array.isArray(response.data) ? response.data.map(normalizeChantierListItem) : [];
  },

  getById: async (id: number): Promise<ChantierDetail> => {
    const response = await api.get(`/chantier/${id}`);
    return normalizeChantierDetail(response.data);
  },

  create: async (data: CreateChantierInput): Promise<ChantierDetail> => {
    const response = await api.post('/chantier', data);
    return normalizeChantierDetail(response.data);
  },

  update: async (id: number, data: UpdateChantierInput): Promise<void> => {
    await api.put(`/chantier/${id}`, data);
  },

  updateStatus: async (id: number, status: ChantierStatus, healthFlag?: ChantierFlag): Promise<void> => {
    const statusVal = typeof status === 'string' && status in CHANTIER_STATUS_TO_INT ? CHANTIER_STATUS_TO_INT[status] : status;
    const flagVal = healthFlag !== undefined
      ? (typeof healthFlag === 'string' && healthFlag in CHANTIER_FLAG_TO_INT ? CHANTIER_FLAG_TO_INT[healthFlag] : healthFlag)
      : undefined;
    await api.patch(`/chantier/${id}/status`, { status: statusVal, healthFlag: flagVal });
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
    return Array.isArray(response.data) ? response.data.map(normalizePhase) : [];
  },

  createPhase: async (id: number, input: CreateChantierPhaseInput): Promise<ChantierPhase> => {
    const response = await api.post(`/chantier/${id}/phases`, input);
    return normalizePhase(response.data);
  },

  deletePhase: async (id: number, phaseId: number): Promise<void> => {
    await api.delete(`/chantier/${id}/phases/${phaseId}`);
  },

  createTask: async (id: number, phaseId: number, input: CreateChantierTaskInput): Promise<ChantierTask> => {
    const response = await api.post(`/chantier/${id}/phases/${phaseId}/tasks`, input);
    return normalizeTask(response.data);
  },

  updateTaskStatus: async (id: number, phaseId: number, taskId: number, input: UpdateTaskStatusInput): Promise<void> => {
    const payload = {
      ...input,
      status: typeof input.status === 'string' && input.status in CHANTIER_TASK_STATUS_TO_INT
        ? CHANTIER_TASK_STATUS_TO_INT[input.status]
        : input.status,
    };
    await api.patch(`/chantier/${id}/phases/${phaseId}/tasks/${taskId}/status`, payload);
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
    return Array.isArray(response.data) ? response.data.map(normalizeProgressEntry) : [];
  },

  addProgressEntry: async (id: number, input: CreateProgressEntryInput): Promise<ChantierProgressEntry> => {
    // Send numeric enums to be compatible with .NET API default model binding
    const payload = {
      ...input,
      entryType: typeof input.entryType === 'string' && input.entryType in CHANTIER_ENTRY_TYPE_TO_INT
        ? CHANTIER_ENTRY_TYPE_TO_INT[input.entryType]
        : input.entryType,
      entryStatus: typeof input.entryStatus === 'string' && input.entryStatus in CHANTIER_ENTRY_STATUS_TO_INT
        ? CHANTIER_ENTRY_STATUS_TO_INT[input.entryStatus]
        : (input.entryStatus ?? 0),
    };
    const response = await api.post(`/chantier/${id}/progress-entries`, payload);
    return normalizeProgressEntry(response.data);
  },

  getAlerts: async (id: number): Promise<ChantierAlert[]> => {
    const response = await api.get(`/chantier/${id}/alerts`);
    return Array.isArray(response.data) ? response.data.map(normalizeAlert) : [];
  },

  addAlert: async (id: number, input: CreateChantierAlertInput): Promise<ChantierAlert> => {
    // Send numeric enum to be compatible with .NET API default model binding
    const payload = {
      ...input,
      alertType: typeof input.alertType === 'string' && input.alertType in CHANTIER_ALERT_TYPE_TO_INT
        ? CHANTIER_ALERT_TYPE_TO_INT[input.alertType]
        : input.alertType,
    };
    const response = await api.post(`/chantier/${id}/alerts`, payload);
    return normalizeAlert(response.data);
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
  },

  // Caisse (Petty cash / Alimentation / Sorties / Mobile requests)
  getCaisseSummary: async (id: number): Promise<ChantierCaisseSummary> => {
    const response = await api.get(`/chantier/${id}/caisse`);
    return response.data;
  },

  getCaisseTransactions: async (id: number, params?: { type?: number; status?: number }): Promise<ChantierCaisseTransaction[]> => {
    const response = await api.get(`/chantier/${id}/caisse/transactions`, { params });
    return response.data;
  },

  addCaisseAlimentation: async (id: number, input: CreateCaisseAlimentationInput): Promise<ChantierCaisseTransaction> => {
    const response = await api.post(`/chantier/${id}/caisse/alimentation`, input);
    return response.data;
  },

  addCaisseSortie: async (id: number, input: CreateCaisseSortieInput): Promise<ChantierCaisseTransaction> => {
    const response = await api.post(`/chantier/${id}/caisse/sortie`, input);
    return response.data;
  },

  validateCaisseRequest: async (id: number, txId: number, approve: boolean): Promise<void> => {
    await api.post(`/chantier/${id}/caisse/transactions/${txId}/validate`, { approve });
  },

  deleteCaisseTransaction: async (id: number, txId: number): Promise<void> => {
    await api.delete(`/chantier/${id}/caisse/transactions/${txId}`);
  }
};
