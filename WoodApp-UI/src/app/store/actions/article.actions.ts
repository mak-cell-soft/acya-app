// article.actions.ts
import { createAction, props } from '@ngrx/store';
import { Article } from '../../models/components/article';

// Action to trigger article update
export const updateArticle = createAction(
    '[Article] Update Article',
    props<{ id: number; article: Article }>()
);

// Action for successful article update
export const updateArticleSuccess = createAction(
    '[Article] Update Article Success',
    props<{ article: Article }>()
);

// Action for failed article update
export const updateArticleFailure = createAction(
    '[Article] Update Article Failure',
    props<{ error: any }>()
);
