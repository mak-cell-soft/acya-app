import { createAction, props } from "@ngrx/store";
import { Category } from "../../models/configuration/category";

// Action to load all categories (no props needed here)
export const loadCategories = createAction(
    '[Category] Load Categories'
);

// Action dispatched when categories are successfully loaded
export const loadCategoriesSuccess = createAction(
    '[Category] Load Categories Success',
    props<{ categories: Category[] }>() // List of categories
);

// Action to add a new category
export const addCategory = createAction(
    '[Category] Add Category',
    props<{ category: Category }>() // A single category to add
);

// Action dispatched when a category is successfully added
export const addCategorySuccess = createAction(
    '[Category] Add Category Success',
    props<{ category: Category }>() // The added category
);

// Action dispatched on any error
export const categoryError = createAction(
    '[Category] Error',
    props<{ error: any }>() // Error object
);
