import { createAction, props } from '@ngrx/store';
import { AppVariable } from '../../models/configuration/appvariable';

export const loadAppVariables = createAction(
    '[AppVariable] Load AppVariables',
    props<{ nature: string }>()
);

export const loadAppVariablesSuccess = createAction(
    '[AppVariable] Load AppVariables Success',
    props<{ appVariables: AppVariable[], nature: string }>() // Include nature
);

export const addAppVariable = createAction(
    '[AppVariable] Add AppVariable',
    props<{ appVariable: AppVariable }>()
);

export const addAppVariableSuccess = createAction(
    '[AppVariable] Add AppVariable Success',
    props<{ appVariable: AppVariable, nature: string }>()
);


export const appVariableError = createAction(
    '[AppVariable] Error',
    props<{ error: any }>()
);
