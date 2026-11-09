export enum DeliveryTrackingStatus {
  InTransit = 1,
  Completed = 2,
  Cancelled = 3,
}

export interface DeliveryTracking {
  id: number;
  documentId: number;
  docNumber?: string | null;
  documentType?: number | null;
  vehicleId: number;
  vehicleSerialNumber?: string | null;
  vehicleBrand?: string | null;
  transporterId?: number | null;
  transporterName?: string | null;
  customerId: number;
  customerName?: string | null;
  driverName?: string | null;
  departureDate: string;
  returnDate?: string | null;
  durationMinutes?: number | null;
  deliveryAddress?: string | null;
  status: DeliveryTrackingStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  updatedById?: number | null;
}

export interface DeliveryTrackingListItem {
  id: number;
  documentId: number;
  docNumber?: string | null;
  documentType?: number | null;
  vehicleId: number;
  vehicleSerialNumber?: string | null;
  vehicleBrand?: string | null;
  transporterId?: number | null;
  transporterName?: string | null;
  customerId: number;
  customerName?: string | null;
  deliveryAddress?: string | null;
  departureDate: string;
  returnDate?: string | null;
  durationMinutes?: number | null;
  driverName?: string | null;
  status: DeliveryTrackingStatus;
  notes?: string | null;
}

export interface CreateDeliveryTrackingDto {
  documentId: number;
  vehicleId: number;
  transporterId?: number | null;
  customerId: number;
  customerName?: string | null;
  driverName?: string | null;
  departureDate?: string;
  returnDate?: string | null;
  deliveryAddress?: string | null;
  notes?: string | null;
}

export interface UpdateDeliveryTrackingDto {
  departureDate?: string;
  returnDate?: string | null;
  transporterId?: number | null;
  driverName?: string | null;
  deliveryAddress?: string | null;
  notes?: string | null;
  status?: DeliveryTrackingStatus;
}

export interface MonthlyDeliveryCount {
  month: string;
  totalCount: number;
  completedCount: number;
  activeCount: number;
}

export interface TopCustomerDelivery {
  customerId: number;
  customerName?: string | null;
  deliveryCount: number;
  lastDeliveryDate: string;
}

export interface VehicleDeliveryStats {
  vehicleId: number;
  totalDeliveries: number;
  activeDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  averageDeliveryMinutes?: number | null;
  monthlyDeliveries: MonthlyDeliveryCount[];
  topCustomers: TopCustomerDelivery[];
}

export interface FleetCustomerSummary {
  customerId: number;
  customerName?: string | null;
  customerAddress?: string | null;
  totalDeliveries: number;
  lastDeliveryDate: string;
  lastVehicleSerialNumber?: string | null;
}

export interface PagedDeliveryResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface DeliveryTrackingFilter {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  status?: DeliveryTrackingStatus;
  search?: string;
}

