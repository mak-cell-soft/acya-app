'use client';

import React from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import AccountingDashboard from '@/components/accounting/accounting-dashboard';

export default function AccountingPage() {
  return (
    <DashboardLayout>
      <AccountingDashboard />
    </DashboardLayout>
  );
}

