export type VehicleExpenseType = 
  | 'Fuel'
  | 'OilChange'
  | 'Repair'
  | 'TechnicalVisit'
  | 'Insurance'
  | 'Tires'
  | 'Vignette'
  | 'Other';

export interface VehicleExpense {
  id: number;
  vehicleId: number;
  date: string;
  type: VehicleExpenseType | string;
  mileage?: number | null;
  liters?: number | null;
  amount: number;
  driverName?: string | null;
  stationOrProvider?: string | null;
  notes?: string | null;
  createdAt?: string;
  createdBy?: string | null;
}

export interface VehicleMonthlyExpense {
  month: string;
  fuelAmount: number;
  maintenanceAmount: number;
  totalAmount: number;
  maxMileage?: number | null;
}

export interface VehicleTypeExpense {
  type: string;
  amount: number;
  count: number;
}

export interface VehicleExpenseStats {
  vehicleId: number;
  totalAmount: number;
  totalFuelAmount: number;
  totalLiters: number;
  totalMaintenanceAmount: number;
  averageConsumptionPer100Km?: number | null;
  totalExpensesCount: number;
  monthlyExpenses: VehicleMonthlyExpense[];
  expenseBreakdown: VehicleTypeExpense[];
}
