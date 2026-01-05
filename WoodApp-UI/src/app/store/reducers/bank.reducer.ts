import { createReducer, on } from "@ngrx/store";
import { Bank } from "../../models/configuration/bank";
import { loadBanksSuccess, addBankSuccess, bankError } from "../actions/bank.actions";

// Define the state interface for Bank
export interface BankState {
    banks: Bank[];
    error: any;
}

// Initial state
const initialState: BankState = {
    banks: [],
    error: null
};

// Create the reducer function
export const bankReducer = createReducer(
    initialState,
    on(loadBanksSuccess, (state, { banks }) => ({
        ...state,
        banks: [...banks], // Update the banks array
        error: null
    })),
    on(addBankSuccess, (state, { bank }) => ({
        ...state,
        banks: [...state.banks, bank], // Add the new bank to the existing array
        error: null
    })),
    on(bankError, (state, { error }) => ({
        ...state,
        error // Store the error
    }))
);
