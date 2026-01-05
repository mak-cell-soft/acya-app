import { AppVariable } from "../configuration/appvariable";

export class ListOfLength {
    id: number = 0;
    nbpieces: number = 0;
    length!: AppVariable;
    quantity: number = 0; // Initialize to 0
    availablePieces: number = 0; // NEW: available number of pieces from stock
}