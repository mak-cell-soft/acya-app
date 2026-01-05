export class Bank {
    id: number = 0;
    updatedby: number = 1;
    reference: string = '';
    designation: string = '';
    logo: string = '';
    agency: string = '';
    rib: string = '';
    iban: string = '';
    creationdate: Date = new Date();
    updatedate: Date = new Date();
    isdeleted: boolean = false;
    editing?: boolean = false;
}