import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { authHeaders } from '../helpers/auth.js';
import { buildSearchQuery } from '../helpers/data-generators.js';
import { ENV } from '../config/environments.js';

/**
 * ACYA SaaS — Article Flow Module
 * 
 * Catalogue des articles (bois, dimensions, catégories).
 * 
 * Endpoints couverts:
 *   GET  /api/article           (liste articles)
 *   GET  /api/article/{id}      (détail article)
 */

export function runArticleFlow(session, refs) {
  const headers = authHeaders(session);

  group('articles', () => {
    // Liste des articles
    group('list_articles', () => {
      const res = http.get(
        `${ENV.baseUrl}/article`,
        { headers, tags: { name: 'article_list' } }
      );
      check(res, {
        'articles: status 200': (r) => r.status === 200,
        'articles: array JSON': (r) => {
          try {
            return Array.isArray(JSON.parse(r.body));
          } catch {
            return false;
          }
        },
      });
      sleep(0.3);
    });

    // Détail d'un article (si des IDs sont disponibles)
    if (refs?.articleIds && refs.articleIds.length > 0) {
      group('get_article_detail', () => {
        const id = refs.articleIds[Math.floor(Math.random() * refs.articleIds.length)];
        const res = http.get(
          `${ENV.baseUrl}/article/${id}`,
          { headers, tags: { name: 'article_detail' } }
        );
        check(res, {
          'article detail: status 200': (r) => r.status === 200,
        });
        sleep(0.2);
      });
    }
  });
}
