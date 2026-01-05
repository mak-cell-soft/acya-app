export class AppUser {
    id: number = 0;
    login!: string | null;
    email: string = '';
    isactive: boolean = true;
    //isadmin: boolean = false;
    defaultsite: number = 0;
    identerprise: number = 0;
    password: string = '';
    person!: Person | null;
}

export class Person {
    id: number = 0;
    firstname: string = '';
    lastname: string = '';
    guid: string = '';
    birthdate!: Date | null;
    cin: string = '';
    idcnss!: string | null;
    role!: number;
    address: string = '';
    birthtown: string = '';
    bankname: string = '';
    bankaccount: string = '';
    phonenumber: string = '';
    isdeleted: boolean = false;
    hiredate!: Date | null;
    firedate!: Date | null;
    isappuser: boolean = false;
    creationdate!: Date | null;
    updatedate!: Date | null;
    updatedby!: number;
}

export enum Roles {
    SuperAdmin = 10,
    Admin = 20,
    User = 30,
    Conductor = 40,
    Seller = 50,
    InvoiceAgent = 60,
    StoreManager = 70
}

// Define translations for roles
export const ROLE_TRANSLATIONS: { [key: number]: string } = {
    20: 'Administrateur',
    30: 'Utilisateur',
    40: 'Conducteur',
    50: 'Vendeur',
    60: 'Agent de Facturation',
    70: 'Responsable de Magasin'
};

