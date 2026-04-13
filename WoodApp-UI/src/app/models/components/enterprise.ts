import { Site } from "./sites";

export interface DocumentNumberingConfig {
    prefixes: { [key: number]: string };
    yearFormat: number; // 2 for YY, 4 for YYYY
    incrementLength: number;
}

export class Enterprise {
    id: number = 0;
    name: string = '';
    description: string = '';
    guid: string = '';
    email: string = '';
    phone: string = '';
    mobileOne: string = '';
    mobileTwo: string = '';
    matriculeFiscal: string = '';
    devise: string = '';
    nameResponsable: string = '';
    surnameResponsable: string = '';
    positionResponsable: string = '';
    siegeAddress: string = '';
    commercialregister: string = '';
    capital: string = '';
    issalingwood: boolean = false;
    auditRetentionMonths: number = 12;
    documentNumberingConfig?: string; // Stored as JSON string in DB
    sites!: Site[] | null;
    user!: AppUserEnterprise | null;
}

export class AppUserEnterprise {
    name: string = '';
    surname: string = '';
    email: string = '';
    password: string = '';
    role: string = '';
};
