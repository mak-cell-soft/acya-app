// article.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as ArticleActions from '../actions/article.actions';
import { Article } from '../../models/components/article';

export interface ArticleState {
    articles: Article[];
    error: any;
}

export const initialState: ArticleState = {
    articles: [],
    error: null,
};

export const articleReducer = createReducer(
    initialState,
    // On article update success, update the article in the state
    on(ArticleActions.updateArticleSuccess, (state, { article }) => ({
        ...state,
        articles: state.articles.map((a) => (a.id === article.id ? article : a)),
        error: null,
    })),
    // On article update failure, store the error
    on(ArticleActions.updateArticleFailure, (state, { error }) => ({
        ...state,
        error,
    }))
);
