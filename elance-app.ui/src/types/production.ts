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
  otherCost?: number;
  materialCost?: number;
  totalStepCost?: number;
  outputMerchandiseId?: number;
  outputMerchandiseRef?: string;
  outputMerchandiseDesignation?: string;
  plannedOutputQuantity: number;
  actualOutputQuantity?: number;
  inputs: ProductionInput[];
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
