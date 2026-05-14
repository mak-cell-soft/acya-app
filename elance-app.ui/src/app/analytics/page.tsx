'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Package, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SALES_BY_CATEGORY = [
  { name: 'Bois Rouge', value: 45 },
  { name: 'Madrier', value: 25 },
  { name: 'Panneaux', value: 15 },
  { name: 'Accessoires', value: 15 },
];

const REVENUE_DATA = [
  { month: 'Jan', revenue: 45000, margin: 12000 },
  { month: 'Fév', revenue: 52000, margin: 15000 },
  { month: 'Mar', revenue: 48000, margin: 11000 },
  { month: 'Avr', revenue: 61000, margin: 18000 },
  { month: 'Mai', revenue: 75000, margin: 22000 },
  { month: 'Juin', revenue: 82000, margin: 25000 },
];

const COLORS = ['#1D9E75', '#534AB7', '#A39D90', '#E1F5EE'];

export default function AnalyticsPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
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
            <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-forest-900">Analyses Business</h1>
            <p className="text-sand-400 mt-2 font-medium">
              Intelligence commerciale et performance opérationnelle du parc.
            </p>
          </motion.div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50">
              <Filter className="w-4 h-4 mr-2" /> Période
            </Button>
            <Button className="h-12 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20 px-6">
              <Download className="w-4 h-4 mr-2" /> Rapport Complet
            </Button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Taux de Marge', value: '28.5%', change: '+2.4%', icon: TrendingUp, trend: 'up' },
            { title: 'Rotation Stock', value: '4.2x', change: '+0.8x', icon: Package, trend: 'up' },
            { title: 'Vente Moyenne', value: '2,450 DT', change: '-120 DT', icon: Target, trend: 'down' },
            { title: 'Retard Paiements', value: '15,2k DT', change: '-5.2%', icon: Users, trend: 'up' },
          ].map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <Card className="border-forest-100/50 bg-white shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden group hover:border-forest-600 transition-all duration-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-[0.2em]">{stat.title}</CardTitle>
                  <div className="p-2 rounded-lg bg-forest-50 text-forest-600 group-hover:bg-forest-600 group-hover:text-white transition-colors">
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-forest-900 tracking-tight">{stat.value}</div>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-rose-500" />
                    )}
                    <span className={cn(
                      "text-xs font-bold",
                      stat.trend === 'up' ? "text-emerald-600" : "text-rose-500"
                    )}>{stat.change}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Revenue Evolution */}
          <Card className="lg:col-span-8 border-forest-100 rounded-[32px] shadow-xl shadow-forest-900/[0.02] bg-white overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="font-heading text-2xl text-forest-900">Évolution Revenue & Marge</CardTitle>
              <CardDescription className="text-sand-400 font-medium">Comparaison mensuelle du chiffre d'affaires et de la rentabilité brute.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="h-[400px] w-full relative min-h-0">
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={REVENUE_DATA}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#1D9E75" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                      <Area type="monotone" dataKey="margin" stroke="#534AB7" strokeWidth={3} fill="transparent" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-forest-50/30 animate-pulse rounded-2xl" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sales by Category */}
          <Card className="lg:col-span-4 border-forest-100 rounded-[32px] shadow-xl shadow-forest-900/[0.02] bg-white overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="font-heading text-2xl text-forest-900">Répartition par Type</CardTitle>
              <CardDescription className="text-sand-400 font-medium">Volume de vente par catégorie de bois.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="h-[320px] w-full relative min-h-0">
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={SALES_BY_CATEGORY}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {SALES_BY_CATEGORY.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                      />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-forest-50/30 animate-pulse rounded-2xl" />
                )}
              </div>
              <div className="mt-8 space-y-3">
                {SALES_BY_CATEGORY.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                      <span className="text-xs font-bold text-forest-900">{cat.name}</span>
                    </div>
                    <span className="text-xs font-bold text-sand-400">{cat.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Products & Customers */}
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="border-forest-100 rounded-[32px] bg-white overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="text-xl text-forest-900">Top Articles (M³ Vendu)</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-4">
                {[
                  { name: 'Madrier Sapin Nord', vol: '125 M³', trend: '+12%' },
                  { name: 'Bois Rouge 25mm', vol: '98 M³', trend: '+5%' },
                  { name: 'Contreplaqué 18mm', vol: '450 Pcs', trend: '+2%' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-sand-50/50 rounded-2xl border border-forest-50">
                    <span className="font-bold text-forest-900">{item.name}</span>
                    <div className="text-right">
                      <div className="font-bold text-forest-600">{item.vol}</div>
                      <div className="text-[0.65rem] font-bold text-emerald-600">{item.trend}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-forest-100 rounded-[32px] bg-white overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="text-xl text-forest-900">Performance Régionale</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-4">
                {[
                  { name: 'Grand Tunis', score: 85 },
                  { name: 'Sousse / Sahel', score: 62 },
                  { name: 'Sfax / Sud', score: 45 },
                ].map((reg, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-forest-900">{reg.name}</span>
                      <span className="text-sand-400">{reg.score}%</span>
                    </div>
                    <div className="h-2 bg-sand-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${reg.score}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-forest-600"
                      />
                    </div>
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


