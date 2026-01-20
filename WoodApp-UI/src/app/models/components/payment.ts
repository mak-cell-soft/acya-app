
export class Payment {
    id: number = 0;
    documentid: number = 0;
    customerid: number = 0;
    paymentdate!: Date;
    amount: number = 0;
    paymentmethod: string = '';
    reference: string = '';
    notes: string = '';
    createdat!: Date;
    createdby: string = '';
    updatedat!: Date;
    updatedbyid: number = 0;
    isdeleted: boolean = false;
}
