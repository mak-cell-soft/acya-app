import { Actions, createEffect, ofType } from "@ngrx/effects";
import { BankService } from "../../services/configuration/bank.service";
import { Injectable } from "@angular/core";
import { Action } from "@ngrx/store";
import { catchError, map, mergeMap, of, Observable } from "rxjs";
import { loadBanks, loadBanksSuccess, addBank, addBankSuccess, bankError } from "../actions/bank.actions";

@Injectable()
export class BankEffects {

    // Effect to load Banks
    loadbanks$ = createEffect((): Observable<Action> =>
        this.actions$.pipe(
            ofType(loadBanks),
            mergeMap(() =>
                this.bankService.GetAll().pipe(
                    map((banks) => loadBanksSuccess({ banks })),
                    catchError((error) => of(bankError({ error })))
                )
            )
        )
    );
    
    // Effect to add a new Bank
    addBank$ = createEffect((): Observable<Action> =>
        this.actions$.pipe(
            ofType(addBank),
            mergeMap((action) =>
                this.bankService.AddBank(action.bank).pipe(
                    map((bank) => addBankSuccess({ bank })),
                    catchError((error) => of(bankError({ error })))
                )
            )
        )
    );

    constructor(private actions$: Actions, private bankService: BankService) { }
}
