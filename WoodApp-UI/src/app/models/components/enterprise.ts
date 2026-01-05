import { Site } from "./sites";

export class Enterprise {
    id: number = 0;
    name: string = '';
    description: string = '';
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
