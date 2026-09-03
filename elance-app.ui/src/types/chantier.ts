export type ChantierStatus = 'Planned' | 'InProgress' | 'OnHold' | 'Completed' | 'Cancelled';
export type ChantierFlag = 'Green' | 'Orange' | 'Red';
export type ChantierPhaseStatus = 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';
export type ChantierTaskStatus = 'Planned' | 'InProgress' | 'Done' | 'Blocked' | 'Cancelled';
export type ChantierEntryType = 'DailyReport' | 'Milestone' | 'Observation' | 'Issue';
export type ChantierEntryStatus = 'Done' | 'Pending' | 'Cancelled';
export type ChantierAlertType = 'Critical' | 'Warning' | 'Info';

export interface ChantierListItem {
  id: number;
  guid: string;
  reference: string;
  name: string;
  description?: string;
  location?: string;
  gouvernorate?: string;
  startDate: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  status: ChantierStatus;
  healthFlag: ChantierFlag;
  progressPct: number;
  budgetTotal?: number;
  architectPersonId?: number;
  architectName?: string;
  projectManagerPersonId?: number;
  projectManagerName?: string;
  activeTeamCount: number;
  openAlertsCount: number;
  creationDate: string;
}

export interface ChantierDetail extends ChantierListItem {
  internalNote?: string;
  clientCounterPartId?: number;
  teamMembers: ChantierTeamMember[];
  phases: ChantierPhase[];
  materialRequirements: ChantierMaterialRequirement[];
  progressEntries: ChantierProgressEntry[];
  alerts: ChantierAlert[];
  vehicleAssignments: ChantierVehicleAssignment[];
}

export interface CreateChantierInput {
  name: string;
  reference?: string;
  description?: string;
  internalNote?: string;
  location?: string;
  gouvernorate?: string;
  startDate: string;
  plannedEndDate?: string;
  budgetTotal?: number;
  architectPersonId?: number;
  projectManagerPersonId?: number;
  clientCounterPartId?: number;
}

export interface UpdateChantierInput {
  name: string;
  description?: string;
  internalNote?: string;
  location?: string;
  gouvernorate?: string;
  startDate: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  budgetTotal?: number;
  architectPersonId?: number;
  projectManagerPersonId?: number;
  clientCounterPartId?: number;
  status: ChantierStatus;
  healthFlag: ChantierFlag;
  progressPct: number;
}

export interface ChantierTeamMember {
  id: number;
  chantierId: number;
  personId: number;
  personFullName: string;
  personPhone?: string;
  personEmail?: string;
  chantierRole: string;
  assignedAt: string;
  releasedAt?: string;
  isActive: boolean;
}

export interface AssignTeamMemberInput {
  personId: number;
  chantierRole: string;
  assignedAt?: string;
}

export interface ChantierPhase {
  id: number;
  chantierId: number;
  name: string;
  description?: string;
  sortOrder: number;
  progressPct: number;
  color?: string;
  status: ChantierPhaseStatus;
  startDate: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  tasks: ChantierTask[];
}

export interface CreateChantierPhaseInput {
  name: string;
  description?: string;
  sortOrder: number;
  color?: string;
  startDate: string;
  plannedEndDate?: string;
}

export interface ChantierTask {
  id: number;
  phaseId: number;
  label: string;
  subLabel?: string;
  description?: string;
  status: ChantierTaskStatus;
  progressPct: number;
  startDate: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  responsiblePersonId?: number;
  responsiblePersonName?: string;
  sortOrder: number;
}

export interface CreateChantierTaskInput {
  label: string;
  subLabel?: string;
  description?: string;
  startDate: string;
  plannedEndDate?: string;
  responsiblePersonId?: number;
  sortOrder: number;
}

export interface UpdateTaskStatusInput {
  status: ChantierTaskStatus;
  progressPct?: number;
}

export interface ChantierMaterialRequirement {
  id: number;
  chantierId: number;
  merchandiseId: number;
  merchandiseRef: string;
  merchandiseDesignation: string;
  category: string;
  materialType: string;
  requiredQty: number;
  unit: string;
  minimumQty: number;
  consumedQty: number;
  remainingQty: number;
  isLowStock: boolean;
}

export interface CreateMaterialRequirementInput {
  merchandiseId: number;
  category: string;
  materialType: string;
  requiredQty: number;
  unit: string;
  minimumQty: number;
}

export interface ChantierMaterialConsumption {
  id: number;
  chantierId: number;
  merchandiseId: number;
  merchandiseRef?: string;
  merchandiseDesignation?: string;
  sourceStockMovementId?: number;
  chantierTaskId?: number;
  taskLabel?: string;
  consumedQty: number;
  unit: string;
  notes?: string;
  consumedAt: string;
  recordedById: number;
}

export interface LogMaterialConsumptionInput {
  merchandiseId: number;
  consumedQty: number;
  unit: string;
  consumedAt?: string;
  chantierTaskId?: number;
  sourceStockMovementId?: number;
  notes?: string;
}

export interface ChantierProgressEntry {
  id: number;
  chantierId: number;
  title: string;
  description?: string;
  entryType: ChantierEntryType;
  entryStatus: ChantierEntryStatus;
  entryDate: string;
  recordedById: number;
}

export interface CreateProgressEntryInput {
  title: string;
  description?: string;
  entryType: ChantierEntryType;
  entryStatus: ChantierEntryStatus;
  entryDate?: string;
}

export interface ChantierAlert {
  id: number;
  chantierId: number;
  message: string;
  alertType: ChantierAlertType;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface CreateChantierAlertInput {
  message: string;
  alertType: ChantierAlertType;
}

export interface ChantierVehicleAssignment {
  id: number;
  chantierId: number;
  vehicleId: number;
  vehicleRegistration: string;
  vehicleModel: string;
  driverPersonId?: number;
  driverPersonName?: string;
  assignedAt: string;
  releasedAt?: string;
  isActive: boolean;
  notes?: string;
}

export interface AssignChantierVehicleInput {
  vehicleId: number;
  driverPersonId?: number;
  notes?: string;
}

export interface MonthlyProgressPoint {
  month: string;
  prevu: number;
  reel: number | null;
}

export interface BudgetByPhasePoint {
  name: string;
  value: number;
  color: string;
}

export interface WeeklyWorkforcePoint {
  week: string;
  ouvriers: number;
  cadres: number;
}

export interface MaterialStockStatusPoint {
  reference: string;
  designation: string;
  required: number;
  consumed: number;
  remaining: number;
  isLowStock: boolean;
}

export interface ChantierStatistics {
  overallProgressPct: number;
  totalBudget?: number;
  totalTasks: number;
  completedTasks: number;
  delayedTasks: number;
  activeTeamCount: number;
  progressCurve: MonthlyProgressPoint[];
  budgetByPhase: BudgetByPhasePoint[];
  workforceEvolution: WeeklyWorkforcePoint[];
  materialAlerts: MaterialStockStatusPoint[];
}

export type ChantierCaisseTransactionType = 'Alimentation' | 'Sortie';
export type ChantierCaisseTransactionStatus = 'Completed' | 'Pending' | 'Rejected';

export interface ChantierCaisseTransaction {
  id: number;
  guid: string;
  chantierId: number;
  type: number; // 0: Alimentation, 1: Sortie
  typeName: string;
  status: number; // 0: Completed, 1: Pending, 2: Rejected
  statusName: string;
  amount: number;
  transactionDate: string;
  reason: string;
  reference?: string;
  beneficiaryPersonId?: number;
  beneficiaryPersonName?: string;
  createdById: number;
  validatedById?: number;
  validationDate?: string;
  notes?: string;
  creationDate: string;
}

export interface CreateCaisseAlimentationInput {
  amount: number;
  transactionDate?: string;
  reason: string;
  reference?: string;
  notes?: string;
}

export interface CreateCaisseSortieInput {
  amount: number;
  transactionDate?: string;
  reason: string;
  beneficiaryPersonId?: number;
  reference?: string;
  notes?: string;
  isMobileRequest?: boolean;
}

export interface ChantierCaisseSummary {
  chantierId: number;
  currentBalance: number;
  totalAlimentations: number;
  totalSorties: number;
  pendingRequestsCount: number;
  pendingRequestsAmount: number;
  lastMovementDate?: string;
  recentTransactions: ChantierCaisseTransaction[];
}
