import { createAction, props } from "@ngrx/store";
import { Bank } from "../../models/configuration/bank";

// Action to load all Banks (no props needed here)
export const loadBanks = createAction(
    '[Bank] Load Banks'
);

// Action dispatched when Banks are successfully loaded
export const loadBanksSuccess = createAction(
    '[Bank] Load Banks Success',
    props<{ banks: Bank[] }>() // List of Banks
);

// Action to add a new Bank
export const addBank = createAction(
    '[Bank] Add Bank',
    props<{ bank: Bank }>() // A single Bank to add
);

// Action dispatched when a Bank is successfully added
export const addBankSuccess = createAction(
    '[Bank] Add Bank Success',
    props<{ bank: Bank }>() // The added Bank
);

// Action dispatched on any error
export const bankError = createAction(
    '[Bank] Error',
    props<{ error: any }>() // Error object
);
