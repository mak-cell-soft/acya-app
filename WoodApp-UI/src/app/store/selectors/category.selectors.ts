import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CategoryState } from '../reducers/category.reducer';

export const selectCategoryState = createFeatureSelector<CategoryState>('categories');

// Selector to get all categories
export const selectAllCategories = createSelector(
    selectCategoryState,
    (state: CategoryState) => state.categories
);

// Selector to get loading state
export const selectCategoryLoading = createSelector(
    selectCategoryState,
    (state: CategoryState) => state.loading
);

// Selector to get error state
export const selectCategoryError = createSelector(
    selectCategoryState,
    (state: CategoryState) => state.error
);
