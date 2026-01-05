import { createReducer, on } from '@ngrx/store';
import { loadCategoriesSuccess, addCategorySuccess, categoryError } from '../actions/category.actions';
import { Category } from '../../models/configuration/category';

export interface CategoryState {
    categories: Category[];
    error: any;
    loading: boolean;
}

export const initialState: CategoryState = {
    categories: [],
    error: null,
    loading: false,
};

export const categoryReducer = createReducer(
    initialState,

    // Load categories success
    on(loadCategoriesSuccess, (state, { categories }) => ({
        ...state,
        categories: categories,
        loading: false,
        error: null
    })),

    // Add category success
    on(addCategorySuccess, (state, { category }) => ({
        ...state,
        categories: [...state.categories, category],
        loading: false,
        error: null
    })),

    // Handle errors
    on(categoryError, (state, { error }) => ({
        ...state,
        error: error,
        loading: false
    }))
);
