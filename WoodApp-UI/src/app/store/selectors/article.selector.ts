// article.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ArticleState } from '../reducers/article.reducer';

export const selectArticleState = createFeatureSelector<ArticleState>('articles');

// Selector to get all articles
export const selectAllArticles = createSelector(
    selectArticleState,
    (state: ArticleState) => state.articles
);

// Selector to get an article by ID
export const selectArticleById = (id: number) =>
    createSelector(selectAllArticles, (articles) => articles.find((a) => a.id === id));

// Selector to get the success state
export const selectArticleUpdateSuccess = createSelector(
    selectArticleState,
    (state: ArticleState) => !!state.articles // Assuming update success reflects in the articles list
);

// Selector to get the error state
export const selectArticleUpdateFailure = createSelector(
    selectArticleState,
    (state: ArticleState) => state.error
);
