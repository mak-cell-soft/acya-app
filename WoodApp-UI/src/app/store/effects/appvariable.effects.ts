
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AppVariableService } from '../../services/configuration/app-variable.service';
import { loadAppVariables, loadAppVariablesSuccess, addAppVariable, addAppVariableSuccess, appVariableError } from '../actions/appvariable.actions';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable()
export class AppVariableEffects {
    // Effect to load App Variables by nature
    loadAppVariables$ = createEffect(() =>
        this.actions$.pipe(
            ofType(loadAppVariables),
            mergeMap((action) =>
                this.appVariableService.GetAll(action.nature).pipe(
                    map((appVariables) =>
                        // Dispatch success action with both appVariables and nature
                        loadAppVariablesSuccess({ appVariables, nature: action.nature })
                    ),
                    catchError((error) => of(appVariableError({ error })))
                )
            )
        )
    );

    // Effect to add a new App Variable
    addAppVariable$ = createEffect(() =>
        this.actions$.pipe(
            ofType(addAppVariable),
            mergeMap((action) =>
                this.appVariableService.AddAppVariable(action.appVariable).pipe(
                    map((appVariable) => addAppVariableSuccess({ appVariable, nature: action.appVariable.nature })),
                    catchError((error) => of(appVariableError({ error })))
                )
            )
        )
    );

    constructor(private actions$: Actions, private appVariableService: AppVariableService) { }
}

