'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

/**
 * NOTE: DashboardPage is the entry-point page for the React/Next.js portal dashboard.
 * We leverage a client component wrapper ('use client') here because the entire dashboard layout 
 * and its nested visual analytics, interactive date pickers, dynamic Recharts visuals, 
 * and state-driven Caisse (Cash desk) transactions rely heavily on React state, 
 * React Query hooks, and user auth context.
 * 
 * By importing DashboardContent separately, we encapsulate the live hooks, dialog handlers, 
 * and complex data transforms, keeping the main page file clean and focused on structural assembly.
 */
export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}

