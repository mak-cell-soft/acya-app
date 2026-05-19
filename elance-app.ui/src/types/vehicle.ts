export interface Vehicle {
  id: number;
  serialnumber: string | null;
  brand: string | null;
  insurancedate: string | null;
  technicalvisitdate: string | null;
  mileage: string | null;
  draining: string | null;
  drainingdate: string | null;
  isowned: boolean;
  fuelcardenterprise?: string | null;
  fuelcardconductor?: string | null;
  fuelcardmatricule?: string | null;
  fuelcardamount?: number | null;
  fuelcardtype?: string | null;
  fuelcardnumber?: string | null;
}
