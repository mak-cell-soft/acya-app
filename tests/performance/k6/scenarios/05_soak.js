import { SCENARIO_THRESHOLDS } from '../config/thresholds.js';
import { runDocumentFlow } from '../modules/document.flow.js';
import { runStockFlow } from '../modules/stock.flow.js';
import { runArticleFlow } from '../modules/article.flow.js';
import { authenticate } from '../helpers/auth.js';

/**
 * ACYA SaaS — Soak Test (Test d'endurance)
 * 30 VUs constants pendant 30m (configurable à 2h) pour détecter les fuites mémoire / connexions DB.
 */
export const options = {
  stages: [
    { duration: '2m', target: 30 },
    { duration: '26m', target: 30 }, // Plateau long
    { duration: '2m', target: 0 },
  ],
  thresholds: SCENARIO_THRESHOLDS.soak,
};

export function setup() {
  const session = authenticate('socofeb');
  return {
    session,
    refs: { counterPartIds: [1], salesSiteIds: [1], merchandiseIds: [1] },
  };
}

export default function (data) {
  if (!data?.session?.token) return;
  const rand = Math.random();
  if (rand < 0.5) runDocumentFlow(data.session, data.refs);
  else if (rand < 0.8) runStockFlow(data.session);
  else runArticleFlow(data.session, data.refs);
}
