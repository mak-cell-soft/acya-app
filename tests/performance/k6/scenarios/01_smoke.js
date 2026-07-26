import { SCENARIO_THRESHOLDS } from '../config/thresholds.js';
import { runAuthFlow } from '../modules/auth.flow.js';
import { runDocumentFlow } from '../modules/document.flow.js';
import { runStockFlow } from '../modules/stock.flow.js';
import { runArticleFlow } from '../modules/article.flow.js';
import { runAnalyticsFlow } from '../modules/analytics.flow.js';
import { authenticate } from '../helpers/auth.js';

/**
 * ACYA SaaS — Smoke Test (Vérification minimale)
 * 1 VU | 1 minute | Sert à vérifier le bon fonctionnement avant un test de charge.
 */
export const options = {
  vus: 1,
  duration: '1m',
  thresholds: SCENARIO_THRESHOLDS.smoke,
};

export function setup() {
  const session = authenticate('socofeb');
  return {
    session,
    refs: { counterPartIds: [1], salesSiteIds: [1], merchandiseIds: [1] },
  };
}

export default function (data) {
  if (!data?.session?.token) {
    return;
  }
  runAuthFlow(data.session);
  runDocumentFlow(data.session, data.refs);
  runStockFlow(data.session);
  runArticleFlow(data.session, data.refs);
  runAnalyticsFlow(data.session);
}
