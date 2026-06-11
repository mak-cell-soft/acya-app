'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { DepotDashboardContent } from '@/components/dashboard/depot-dashboard-content';
import { useAuthStore } from '@/store/use-auth-store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Store, Warehouse } from 'lucide-react';

/**
 * NOTE: DashboardPage is the single entry-point for all dashboard variants.
 *
 * WHY: Instead of two separate routes, we branch here based on the user's
 * site type (isForSale from JWT). This keeps URL, breadcrumbs, and DashboardLayout
 * identical for both roles while rendering completely different content trees.
 *
 * - isForSale = true  → Point de Vente   → <DashboardContent />
 * - isForSale = false → Dépôt/Entrepôt   → <DepotDashboardContent />
 *
 * Admins have a toggle to view both dashboards regardless of their default site.
 */
export default function DashboardPage() {
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  // WHY: strict false check — undefined/null falls through to sale dashboard
  //      so stale sessions (logged in before the JWT claim was added) are safe.
  const isDepot = user?.defaultSiteIsForSale === false;

  if (isAdmin) {
    return (
      <DashboardLayout>
        <Tabs defaultValue={isDepot ? 'depot' : 'sale'} className="w-full flex flex-col">
          <div className="flex justify-center lg:justify-end mb-6 px-4 lg:px-8">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-slate-100/50 p-1 border rounded-xl">
              <TabsTrigger 
                value="sale" 
                className="rounded-lg font-bold gap-2 data-active:text-corp-blue-700"
              >
                <Store className="w-4 h-4" />
                Vue Point de Vente
              </TabsTrigger>
              <TabsTrigger 
                value="depot" 
                className="rounded-lg font-bold gap-2 data-active:text-amber-600"
              >
                <Warehouse className="w-4 h-4" />
                Vue Dépôt
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="sale" className="mt-0 outline-none">
            <DashboardContent />
          </TabsContent>
          <TabsContent value="depot" className="mt-0 outline-none">
            <DepotDashboardContent />
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    );
  }

  // Regular users only see their designated dashboard
  return (
    <DashboardLayout>
      {isDepot ? <DepotDashboardContent /> : <DashboardContent />}
    </DashboardLayout>
  );
}
