import { Injectable } from '@angular/core';
import { Actions, ofType, createEffect } from '@ngrx/effects';
import { loadCategories, loadCategoriesSuccess, addCategory, addCategorySuccess, categoryError } from '../actions/category.actions';
import { catchError, map, mergeMap, Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { CategoryService } from '../../services/configuration/category.service';

@Injectable()
export class CategoryEffects {
    // Effect to load Categories
    loadCategories$ = createEffect((): Observable<Action> =>
        this.actions$.pipe(
            ofType(loadCategories),
            mergeMap(() =>
                this.categoryService.GetAll().pipe(
                    map((categories) =>
                        loadCategoriesSuccess({ categories })
                    ),
                    catchError((error) => of(categoryError({ error }))) // Return an action on error
                )
            )
        )
    );

    // Effect to add a new Category
    addCategory$ = createEffect((): Observable<Action> =>
        this.actions$.pipe(
            ofType(addCategory),
            mergeMap((action) =>
                this.categoryService.AddCategory(action.category).pipe(
                    map((category) => addCategorySuccess({ category })),
                    catchError((error) => of(categoryError({ error }))) // Return an action on error
                )
            )
        )
    );

    constructor(private actions$: Actions, private categoryService: CategoryService) {}
}
