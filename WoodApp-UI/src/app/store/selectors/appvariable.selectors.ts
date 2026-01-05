import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppVariableState } from '../reducers/appvariable.reducer';

export const selectAppVariableState = createFeatureSelector<AppVariableState>('appVariableState');

export const selectAppVariablesByNature = (nature: string) => createSelector(
    selectAppVariableState,
    (state: AppVariableState) => state.appVariablesByNature[nature] || []
);

