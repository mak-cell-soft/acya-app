'use client';

import React from 'react';
import { TreasuryDashboard } from '@/components/accounting/treasury-dashboard';
import { DashboardLayout } from '@/components/shared/dashboard-layout';

export default function TreasuryPage() {
  return (
    <DashboardLayout>
      <TreasuryDashboard />
    </DashboardLayout>
  );
}
