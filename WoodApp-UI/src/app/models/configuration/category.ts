export class Category { // equivalent to Parent 
    id: number = 0;
    createdby: number = 1;
    reference: string = "";
    description: string = "";
    creationdate: Date = new Date();
    updatedate: Date = new Date();
    isdeleted: boolean = false;
    firstchildren: SubCategory[] = []; // Add this line to match the API response
    // Add this property to track the editing state
    editing?: boolean;
}

export class SubCategory { // equivalent to first child
    id: number = 0;
    reference: string = "";
    description: string = "";
    creationdate: Date = new Date();
    updatedate: Date = new Date();
    isdeleted: boolean = false;
    updatedby: number = 0;
    idparent: number = 0;
    editing?: boolean; // Add this property to track the editing state
    isNew?: boolean = false; // Add this property to check if a new SubCategory is Added
}