import { AppUser } from "./appuser";
import { Transporter } from "./customer";

export class CounterPart {
    id: number = 0;
    guid: string = '';
    /**
     * CustomerType : Customer or Supplier
     */
    type: string = '';
    /**
     * Prefix : STE - Mr - Mme
     */
    prefix: string = '';
    /**
     * Name - Descripttion : Nom et Description de la Société
     */
    name: string = '';
    description: string = '';
    /**
     * Firstname - Lastname : Nom et prénom pour le  Client 
     * OU nom et prénom du responsable
     */
    firstname: string = '';
    lastname: string = '';
    /**
     * IdentityCardNumber : Numéro de la carte d'identité Nationale : Cin
     */
    identitycardnumber: string = '';
    email: string = '';
    /**
     * TaxRegistrationNumber : Matricule Fiscal
     */
    taxregistrationnumber: string = '';
    patentecode: string = '';
    address: string = '';
    gouvernorate: string = '';

    maximumdiscount: number = 0;
    maximumsalesbar: number = 0;
    notes: string = '';

    phonenumberone: string = '';
    phonenumbertwo: string = '';
    creationdate!: Date;
    updatedate!: Date;
    /**
     * Activité du Client ou de l'entreprise.
     */
    jobtitle: string = '';

    bankname: string = '';
    bankaccountnumber: string = '';

    isactive: boolean = true;
    isdeleted: boolean = false;

    updatedbyid: number = 0;
    appuser!: AppUser;

    /**
     * Add One Transporter
     */
    transporter!: Transporter;

    /**
     * editing for form control
     */
    editing: boolean = false;
    /**
     * Check if the Customer is also a Supplier
     */
    isTypeBoth: boolean = false;

}



