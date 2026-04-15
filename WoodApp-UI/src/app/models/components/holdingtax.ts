export class HoldingTaxe {
    id: number = 0;
    description: string = '';
    reference?: string; // Référence documentaire RS (ex: avis de débit)
    taxpercentage: number = 0;
    taxvalue: number = 0;
    issigned: boolean = false;
    creationdate!: Date;
    updatedate!: Date;
    updatedbyid: number = 0;
    newamountdocvalue: number = 0;
    documentid: number = 0;
    isdeleted: boolean = false;
}