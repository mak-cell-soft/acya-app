import { SCENARIO_THRESHOLDS } from '../config/thresholds.js';
import { runDocumentFlow } from '../modules/document.flow.js';
import { runAnalyticsFlow } from '../modules/analytics.flow.js';
import { authenticate } from '../helpers/auth.js';

/**
 * ACYA SaaS — Spike Test (Pic soudain)
 * Baseline à 10 VUs → Brutalement 180 VUs en 30s → Retour 10 VUs
 */
export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '30s', target: 180 }, // Spike brutal
    { duration: '2m', target: 180 },  // Maintien du pic
    { duration: '30s', target: 10 },  // Chute
    { duration: '1m', target: 0 },
  ],
  thresholds: SCENARIO_THRESHOLDS.spike,
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
  if (Math.random() < 0.6) {
    runDocumentFlow(data.session, data.refs);
  } else {
    runAnalyticsFlow(data.session);
  }
}
