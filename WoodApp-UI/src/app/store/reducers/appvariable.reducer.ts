import { createReducer, on } from '@ngrx/store';
import { addAppVariableSuccess, loadAppVariablesSuccess } from '../actions/appvariable.actions';
import { AppVariable } from '../../models/configuration/appvariable';

export interface AppVariableState {
    appVariablesByNature: { [key: string]: AppVariable[] }; // Track by nature
}

const initialState: AppVariableState = {
    appVariablesByNature: {}
};

export const appVariableReducer = createReducer(
    initialState,
    on(loadAppVariablesSuccess, (state, { appVariables, nature }) => ({
        ...state,
        appVariablesByNature: {
            ...state.appVariablesByNature,
            [nature]: appVariables // Store each nature separately
        }
    })),
    on(addAppVariableSuccess, (state, { appVariable, nature }) => ({
        ...state,
        appVariablesByNature: {
            ...state.appVariablesByNature,
            [nature]: [...state.appVariablesByNature[nature], appVariable]
        }
    }))
);

