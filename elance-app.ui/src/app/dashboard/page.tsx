'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/use-auth-store';
import { DashboardLayout } from '@/components/shared/dashboard-layout';

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
  Plus,
  Package
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Mock Data
const chartData = [
  { name: 'Jan', total: 15400 },
  { name: 'Feb', total: 23200 },
  { name: 'Mar', total: 31800 },
  { name: 'Apr', total: 28900 },
  { name: 'May', total: 48500 },
  { name: 'Jun', total: 52100 },
];

const recentSales = [
  { name: 'Menuiserie Moderne', email: 'BL-2405-001', amount: '4,500.500 TND', initial: 'MM' },
  { name: 'Bati Plus', email: 'BL-2405-002', amount: '12,500.000 TND', initial: 'BP' },
  { name: 'Espace Décor', email: 'DE-2405-045', amount: '850.500 TND', initial: 'ED' },
  { name: 'Construction Pro', email: 'BC-2405-012', amount: '3,200.000 TND', initial: 'CP' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-10 animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-forest-900">Tableau de bord</h1>
            <p className="text-sand-400 mt-2 font-medium">
              Bienvenue, <span className="text-forest-600 font-bold">{user?.fullname}</span>. Voici l'état global de votre parc et de vos stocks.
            </p>
          </motion.div>
          <div className="flex items-center gap-3">
            <Button size="lg" variant="outline" className="h-12 rounded-xl border-forest-100 text-forest-600 hover:bg-forest-50 font-bold">Exporter</Button>
            <Button size="lg" className="h-12 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20 gap-2 px-6">
              <Plus className="w-5 h-5" /> Nouvelle Vente
            </Button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Chiffre d\'Affaires (MAI)', value: '48,500 TND', change: '+20.1%', icon: DollarSign, trend: 'up' },
            { title: 'Stock Global M³', value: '1,240 M³', change: '-4.2%', icon: Package, trend: 'down' },
            { title: 'Bons en attente', value: '12', change: '+2', icon: CreditCard, trend: 'up' },
            { title: 'Chantiers Actifs', value: '8', change: 'Stable', icon: Activity, trend: 'neutral' },
          ].map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <Card className="border-forest-100/50 bg-transparent shadow-none rounded-[24px] overflow-hidden group hover:border-forest-600 transition-all duration-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">{stat.title}</CardTitle>
                  <div className="p-2 rounded-lg bg-forest-50 text-forest-600 group-hover:bg-forest-600 group-hover:text-white transition-colors">
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-forest-900 tracking-tight">{stat.value}</div>
                  <p className="text-xs flex items-center gap-1 mt-2">
                    <span className={cn(
                      "font-bold",
                      stat.trend === 'up' ? 'text-forest-600' : stat.trend === 'down' ? 'text-rose-500' : 'text-sand-400'
                    )}>
                      {stat.change}
                    </span>
                    <span className="text-sand-300 font-medium">vs mois dernier</span>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
          <Card className="md:col-span-4 border-forest-100 rounded-[32px] shadow-none bg-transparent overflow-hidden">
            <CardHeader className="p-8 pb-0">
              <CardTitle className="font-heading text-2xl text-forest-900">Volume de Ventes Mensuel</CardTitle>
              <CardDescription className="text-sand-400 font-medium">Performance financière consolidée sur l'année 2026.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[320px] w-full min-w-0 relative min-h-0">
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="name" 
                        stroke="#94A3B8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                      />
                      <YAxis 
                        stroke="#94A3B8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                        itemStyle={{ color: '#0B3B24', fontWeight: 'bold' }}
                        cursor={{ fill: '#F1F5F9', radius: 8 }}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="#1D9E75" 
                        radius={[6, 6, 0, 0]} 
                        className="fill-forest-600"
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-forest-50/30 animate-pulse rounded-2xl" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 border-forest-100 rounded-[32px] shadow-none bg-transparent overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="font-heading text-2xl text-forest-900">Transactions Récentes</CardTitle>
              <CardDescription className="text-sand-400 font-medium">Bons de livraison et devis récents.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="space-y-6">
                {recentSales.map((sale, i) => (
                  <motion.div 
                    key={sale.email} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.3 }}
                    className="flex items-center p-4 rounded-2xl hover:bg-forest-50 transition-all duration-300 cursor-pointer group border border-transparent hover:border-forest-100"
                  >
                    <div className="w-12 h-12 rounded-xl bg-forest-100 flex items-center justify-center font-bold text-forest-600 group-hover:bg-forest-600 group-hover:text-white transition-all duration-500">
                      {sale.initial}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-bold text-forest-900 leading-none">{sale.name}</p>
                      <p className="text-[0.65rem] text-sand-300 font-bold mt-1 uppercase tracking-wider">{sale.email}</p>
                    </div>
                    <div className="text-sm font-bold text-forest-800 bg-sand-50 px-3 py-1.5 rounded-xl border border-forest-50">{sale.amount}</div>
                  </motion.div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-10 text-forest-600 font-bold hover:bg-forest-50 rounded-xl h-12">
                Voir toutes les transactions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}


