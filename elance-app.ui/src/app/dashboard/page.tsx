'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/use-auth-store';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
} from 'recharts';
import { 
  Users, 
  CreditCard, 
  Activity, 
  DollarSign,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

// Mock Data
const chartData = [
  { name: 'Jan', total: 1500 },
  { name: 'Feb', total: 2300 },
  { name: 'Mar', total: 3200 },
  { name: 'Apr', total: 2800 },
  { name: 'May', total: 4800 },
  { name: 'Jun', total: 5200 },
];

const recentSales = [
  { name: 'Olivia Martin', email: 'olivia.martin@email.com', amount: '+$1,999.00', initial: 'OM' },
  { name: 'Jackson Lee', email: 'jackson.lee@email.com', amount: '+$39.00', initial: 'JL' },
  { name: 'Isabella Nguyen', email: 'isabella.nguyen@email.com', amount: '+$299.00', initial: 'IN' },
  { name: 'William Kim', email: 'will@email.com', amount: '+$99.00', initial: 'WK' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: liveStats, isLoading } = useDashboardStats();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, <span className="text-foreground font-medium">{user?.name}</span>. Here's what's happening.
            </p>
          </motion.div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">Download Report</Button>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> New Project
            </Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))
          ) : (
            <>
              {[
                { title: 'Total Revenue', value: liveStats?.revenue, change: '+20.1%', icon: DollarSign, trend: 'up' },
                { title: 'Subscriptions', value: liveStats?.subscriptions, change: '+180.1%', icon: Users, trend: 'up' },
                { title: 'Sales', value: liveStats?.sales, change: '+19%', icon: CreditCard, trend: 'up' },
                { title: 'Active Now', value: liveStats?.activeNow, change: '+201 since last hour', icon: Activity, trend: 'up' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="border-muted/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <span className={stat.trend === 'up' ? 'text-emerald-500 font-medium' : 'text-rose-500 font-medium'}>
                          {stat.change}
                        </span>
                        from last month
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="md:col-span-4 border-muted/50">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Monthly revenue growth and performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full min-w-0">
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="name" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--primary))' }}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="currentColor" 
                        radius={[4, 4, 0, 0]} 
                        className="fill-primary"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 border-muted/50">
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>You made 265 sales this month.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {recentSales.map((sale) => (
                  <div key={sale.email} className="flex items-center">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                      {sale.initial}
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{sale.name}</p>
                      <p className="text-sm text-muted-foreground">{sale.email}</p>
                    </div>
                    <div className="ml-auto font-medium">{sale.amount}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
