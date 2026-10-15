export type ProductionStatus = 'Planned' | 'InProgress' | 'Completed' | 'Validated' | 'Cancelled';
export type ProductionStepStatus = 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';

export interface ProductionInput {
  id: number;
  guid: string;
  productionStepId: number;
  merchandiseId: number;
  merchandiseRef?: string;
  merchandiseDesignation?: string;
  unit?: string;
  plannedQuantity: number;
  actualQuantity?: number;
  unitCost?: number;
  totalCost?: number;
  currentStockQuantity?: number;
  allowNegativStock?: boolean;
}

export interface ProductionStep {
  id: number;
  guid: string;
  productionOrderId: number;
  stepNumber: number;
  name: string;
  description?: string;
  status: ProductionStepStatus;
  startDate?: string;
  endDate?: string;
  laborCost?: number;
  employeeLaborCost?: number;
  otherCost?: number;
  materialCost?: number;
  totalStepCost?: number;
  outputMerchandiseId?: number;
  outputMerchandiseRef?: string;
  outputMerchandiseDesignation?: string;
  plannedOutputQuantity: number;
  actualOutputQuantity?: number;
  inputs: ProductionInput[];
  workers?: ProductionStepWorker[];
  workLogs?: ProductionStepWorkLog[];
}

export interface ProductionOrder {
  id: number;
  guid: string;
  reference: string;
  description?: string;
  notes?: string;
  salesSiteId: number;
  salesSiteName?: string;
  status: ProductionStatus;
  plannedStartDate: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  totalMaterialCost?: number;
  totalLaborCost?: number;
  totalOtherCost?: number;
  totalProductionCost?: number;
  unitProductionCost?: number;
  plannedOutputQuantity: number;
  actualOutputQuantity?: number;
  createdById: number;
  createdByName?: string;
  creationDate: string;
  updateDate?: string;
  steps: ProductionStep[];
}

export interface CreateProductionOrderInput {
  reference?: string;
  description?: string;
  notes?: string;
  salesSiteId: number;
  plannedStartDate: string;
  plannedEndDate?: string;
  plannedOutputQuantity: number;
  steps?: CreateProductionStepInput[];
}

export interface UpdateProductionOrderInput {
  description?: string;
  notes?: string;
  salesSiteId?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  plannedOutputQuantity?: number;
}

export interface CreateProductionStepInput {
  stepNumber?: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  laborCost?: number;
  otherCost?: number;
  outputMerchandiseId?: number;
  plannedOutputQuantity?: number;
  inputs?: CreateProductionInputInput[];
}

export interface UpdateProductionStepInput {
  name: string;
  description?: string;
  stepNumber?: number;
  startDate?: string;
  endDate?: string;
  laborCost?: number;
  otherCost?: number;
  outputMerchandiseId?: number;
  plannedOutputQuantity?: number;
  actualOutputQuantity?: number;
}

export interface CreateProductionInputInput {
  merchandiseId: number;
  plannedQuantity: number;
  unitCost?: number;
}

export interface CompleteStepInput {
  actualOutputQuantity?: number;
  laborCost?: number;
  otherCost?: number;
  inputs?: {
    inputId: number;
    actualQuantity: number;
    unitCost?: number;
  }[];
}

export interface QuickCreateMerchandiseInput {
  articleId: number;
  packageReference?: string;
  description?: string;
  isInvoicible?: boolean;
  allowNegativStock?: boolean;
}

// ── Step Worker & Labor Types ───────────────────────────────────────────────

export interface ProductionStepWorker {
  id: number;
  guid: string;
  productionStepId: number;
  personId: number;
  employeeFullName: string;
  plannedHours: number;
  defaultHourlyRate: number;
  estimatedLaborAmount: number;
  notes?: string;
  createdById: number;
  creationDate: string;
  workLogs?: ProductionStepWorkLog[];
}

export interface CreateProductionStepWorkerInput {
  personId: number;
  plannedHours: number;
  defaultHourlyRate: number;
  notes?: string;
}

export interface UpdateProductionStepWorkerInput {
  plannedHours: number;
  defaultHourlyRate: number;
  notes?: string;
}

// ── Step Work Log Types ─────────────────────────────────────────────────────

export interface ProductionStepWorkLog {
  id: number;
  guid: string;
  stepWorkerId: number;
  productionStepId: number;
  personId: number;
  employeeFullName: string;
  workDate: string; // YYYY-MM-DD
  actualHours: number;
  hourlyRate: number;
  calculatedLaborAmount: number;
  notes?: string;
  createdById: number;
  creationDate: string;
}

export interface CreateProductionStepWorkLogInput {
  stepWorkerId: number;
  workDate: string; // YYYY-MM-DD
  actualHours: number;
  hourlyRate?: number;
  notes?: string;
}

export interface UpdateProductionStepWorkLogInput {
  workDate: string; // YYYY-MM-DD
  actualHours: number;
  hourlyRate?: number;
  notes?: string;
}

// ── Production Other Work Types (Standalone) ────────────────────────────────

export interface ProductionOtherWorkEntry {
  id: number;
  guid: string;
  personId: number;
  employeeFullName: string;
  workDate: string; // YYYY-MM-DD
  hours: number;
  hourlyRate: number;
  calculatedAmount: number;
  description: string;
  createdById: number;
  creationDate: string;
  updatedById?: number;
  updateDate?: string;
  isDeleted: boolean;
}

export interface CreateProductionOtherWorkEntryInput {
  personId: number;
  workDate: string; // YYYY-MM-DD
  hours: number;
  hourlyRate: number;
  description: string;
}

export interface UpdateProductionOtherWorkEntryInput {
  workDate: string; // YYYY-MM-DD
  hours: number;
  hourlyRate: number;
  description: string;
}

// ── Monthly Employee Payable Summary Types ──────────────────────────────────

export interface EmployeePayableSummaryItem {
  personId: number;
  employeeFullName: string;
  manufacturingHours: number;
  manufacturingAmount: number;
  otherHours: number;
  otherAmount: number;
  totalPayableHours: number;
  totalPayableAmount: number;
}

export interface MonthlyEmployeePayableSummary {
  year: number;
  month: number;
  totalManufacturingHours: number;
  totalManufacturingAmount: number;
  totalOtherHours: number;
  totalOtherAmount: number;
  totalPayableHours: number;
  totalPayableAmount: number;
  employees: EmployeePayableSummaryItem[];
}

