'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import AccountingDashboard from '@/components/accounting/accounting-dashboard';

export default function AccountingPage() {
  const router = useRouter();
  const { hasAnyPermission } = usePermissionGuard();

  useEffect(() => {
    if (!hasAnyPermission('accounting')) {
      toast.error("Vous n'avez pas l'autorisation d'accéder à la comptabilité.");
      router.replace('/dashboard');
    }
  }, [hasAnyPermission, router]);

  return (
    <DashboardLayout>
      <AccountingDashboard />
    </DashboardLayout>
  );
}

