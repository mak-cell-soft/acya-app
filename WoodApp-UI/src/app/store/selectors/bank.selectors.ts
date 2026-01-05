import { createFeatureSelector, createSelector } from "@ngrx/store";
import { BankState } from "../reducers/bank.reducer";

// Create a feature selector for BankState
export const selectBankState = createFeatureSelector<BankState>('banks');

// Create a selector to get all banks
export const selectAllBanks = createSelector(
    selectBankState,
    (state: BankState) => state.banks
);

// Create a selector to get the error state
export const selectBankError = createSelector(
    selectBankState,
    (state: BankState) => state.error
);
