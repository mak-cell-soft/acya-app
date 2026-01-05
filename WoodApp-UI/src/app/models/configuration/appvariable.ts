export class AppVariable {
    id: number = 0;
    nature: string = '';
    name: string = '';
    value: string = '';
    isactive: boolean = false;
    isdefault: boolean = false;
    iseditable: boolean = false;
    editing?: boolean = false;
    isdeleted?: boolean = false;
}