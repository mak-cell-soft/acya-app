import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Wallet, Users } from 'lucide-react';

export function StatsTab({ site }: { site: any }) {
  // Mock data adapted for Elance
  const progressData = [
    { month: 'Jan', prevu: 10, reel: 12 },
    { month: 'Fév', prevu: 25, reel: 22 },
    { month: 'Mar', prevu: 40, reel: 35 },
    { month: 'Avr', prevu: 55, reel: 50 },
    { month: 'Mai', prevu: 70, reel: site.progressPercent || 65 },
    { month: 'Juin', prevu: 85, reel: null },
    { month: 'Juil', prevu: 100, reel: null },
  ];

  const budgetData = [
    { name: 'Gros Œuvre', value: 45000, color: '#1a1a1a' },
    { name: 'Second Œuvre', value: 25000, color: '#2563eb' },
    { name: 'Menuiserie Bois', value: 18000, color: '#639922' },
    { name: 'Équipement', value: 12000, color: '#888780' },
  ];

  const workforceData = [
    { week: 'S-4', ouvriers: 12, cadres: 2 },
    { week: 'S-3', ouvriers: 15, cadres: 3 },
    { week: 'S-2', ouvriers: 18, cadres: 3 },
    { week: 'S-1', ouvriers: 22, cadres: 4 },
    { week: 'S-0', ouvriers: site.employees?.length || 20, cadres: 4 },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Progress Area Chart */}
        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#2563eb]" />
              <CardTitle className="text-lg font-bold text-[#1a1a1a]">Courbe d'Avancement</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrevu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#888780', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888780', fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1a1a1a', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Area type="monotone" name="Prévu (%)" dataKey="prevu" stroke="#1a1a1a" strokeWidth={3} fillOpacity={1} fill="url(#colorPrevu)" strokeDasharray="5 5" />
                <Area type="monotone" name="Réel (%)" dataKey="reel" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorReel)" activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget Pie Chart */}
        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#639922]" />
              <CardTitle className="text-lg font-bold text-[#1a1a1a]">Répartition du Budget</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 h-[320px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {budgetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => [`${Number(value).toLocaleString()} TND`, 'Montant']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', fontWeight: '600' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* Bottom Row - Workforce Bar Chart */}
      <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1a1a1a]" />
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">Évolution des Effectifs (5 dernières semaines)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workforceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#888780', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888780', fontSize: 12 }} />
              <RechartsTooltip 
                cursor={{ fill: '#f8f9fa' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                labelStyle={{ fontWeight: 'bold', color: '#1a1a1a', marginBottom: '4px' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
              <Bar dataKey="ouvriers" name="Ouvriers" fill="#1a1a1a" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="cadres" name="Encadrement" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  );
}
