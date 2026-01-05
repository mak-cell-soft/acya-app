// article.effects.ts
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ArticleService } from '../../services/components/article.service';
import * as ArticleActions from '../actions/article.actions';

@Injectable()
export class ArticleEffects {
    constructor(
        private actions$: Actions,
        private articleService: ArticleService,
    ) { }

    updateArticle$ = createEffect(() =>
        this.actions$.pipe(
            ofType(ArticleActions.updateArticle),
            mergeMap((action) =>
                this.articleService.Put(action.id, action.article).pipe(
                    map((updatedArticle) => {
                        return ArticleActions.updateArticleSuccess({ article: updatedArticle });
                    }),
                    catchError((error) => {
                        return of(ArticleActions.updateArticleFailure({ error }));
                    })
                )
            )
        )
    );
}
