import { AppUser } from "./appuser";

export class Customer {
    id: number = 0;
    guid: string = '';
    type: string = '';// Regular / Passenger
    firstname: string = '';
    lastname: string = '';
    fullname: string = '';
    cin: string = '';
    email: string = '';
    mfcode: string = '';
    patentecode: string = '';
    address: string = '';
    gouvernorate: string = '';
    isactive: boolean = true;
    isdeleted: boolean = false;
    maximumdiscount: number = 0;
    Maximumsalesbar: number = 0;
    notes: string = '';
    bankaccount: string = '';
    bank: string = '';
    phonenumberone: string = '';
    phonenumbertwo: string = '';
    creationdate: Date = new Date();
    updatedate: Date = new Date();
    jobtitle: string = '';
    editing: boolean = false;

    updatedbyid: number = 0;
    appuser!: AppUser;

    transporter!: Transporter;
}

export class Transporter {
    constructor(
        public id: number,
        public firstname: string,
        public lastname: string,
        public fullname: string,
        public car?: Vehicle
    ) { }
}


export class Vehicle {
    id: number = 0;
    serialnumber: string = '';
    brand!: string;
    insurancedate!: Date;
    technicalvisitdate!: Date;
    mileage!: number;
    draining!: string;
    drainingdate!: string;
    constructor(public matricule: string) {
        this.serialnumber = matricule;
    }
}
