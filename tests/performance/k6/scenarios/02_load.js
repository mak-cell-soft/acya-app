import { SCENARIO_THRESHOLDS } from '../config/thresholds.js';
import { runAuthFlow } from '../modules/auth.flow.js';
import { runDocumentFlow } from '../modules/document.flow.js';
import { runStockFlow } from '../modules/stock.flow.js';
import { runArticleFlow } from '../modules/article.flow.js';
import { runAnalyticsFlow } from '../modules/analytics.flow.js';
import { authenticate } from '../helpers/auth.js';

/**
 * ACYA SaaS — Load Test (Charge nominale)
 * Rampe vers 50 VUs | 10 minutes
 */
export const options = {
  stages: [
    { duration: '2m', target: 25 },  // Montée à 25 VUs
    { duration: '5m', target: 50 },  // Charge stable à 50 VUs
    { duration: '2m', target: 50 },  // Plateau
    { duration: '1m', target: 0 },   // Descente
  ],
  thresholds: SCENARIO_THRESHOLDS.load,
};

export function setup() {
  const session = authenticate('socofeb');
  return {
    session,
    refs: { counterPartIds: [1, 2, 3], salesSiteIds: [1], merchandiseIds: [1, 2] },
  };
}

export default function (data) {
  if (!data?.session?.token) return;

  // Répartition statistique de la charge par VU
  const rand = Math.random();
  if (rand < 0.40) {
    runDocumentFlow(data.session, data.refs);
  } else if (rand < 0.60) {
    runStockFlow(data.session);
  } else if (rand < 0.75) {
    runArticleFlow(data.session, data.refs);
  } else if (rand < 0.90) {
    runAnalyticsFlow(data.session);
  } else {
    runAuthFlow(data.session);
  }
}
