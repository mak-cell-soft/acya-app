import { ValueChangeEvent } from "@angular/forms";

export class Provider {
    id: number = 0;
    prefix: string = '';
    name: string = '';
    description: string = '';
    email: string = '';
    representedbyname: string = '';
    representedbysurname: string = '';
    representedbyfullname: string = '';
    address: string = '';
    category: string = '';
    taxregistrationnumber: string = '';
    phonenumberone: string = '';
    phonenumbertwo: string = '';
    bankname: string = '';
    bankaccountnumber: string = '';
    creationdate: Date = new Date();
    updatedate: Date = new Date();
    updatedbyid: number = 1;
    editing: boolean = false;
    isdeleted: boolean = false;
    isactive: boolean = false;
}

