export interface Vehicle {
    id: number;
    serialnumber: string | null;
    brand: string | null;
    insurancedate: Date | string | null;
    technicalvisitdate: Date | string | null;
    mileage: string | null;
    draining: string | null;
    drainingdate: Date | string | null;
}
