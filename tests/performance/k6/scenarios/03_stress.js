import { SCENARIO_THRESHOLDS } from '../config/thresholds.js';
import { runDocumentFlow } from '../modules/document.flow.js';
import { runStockFlow } from '../modules/stock.flow.js';
import { runAnalyticsFlow } from '../modules/analytics.flow.js';
import { authenticate } from '../helpers/auth.js';

/**
 * ACYA SaaS — Stress Test (Point de rupture)
 * Rampe progressive jusqu'à 200 VUs
 */
export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '3m', target: 150 },
    { duration: '3m', target: 200 }, // Pic extrême
    { duration: '2m', target: 0 },
  ],
  thresholds: SCENARIO_THRESHOLDS.stress,
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
  if (rand < 0.50) {
    runDocumentFlow(data.session, data.refs);
  } else if (rand < 0.80) {
    runStockFlow(data.session);
  } else {
    runAnalyticsFlow(data.session);
  }
}
