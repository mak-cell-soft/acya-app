'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Wallet, Users } from 'lucide-react';
import { ChantierDetail } from '@/types/chantier';
import { useChantierStatistics } from '@/hooks/use-chantiers';

interface StatsTabProps {
  site: ChantierDetail;
}

export function StatsTab({ site }: StatsTabProps) {
  const { data: stats } = useChantierStatistics(site.id);

  // Fallback defaults while loading or if data is empty
  const progressData =
    stats?.progressCurve && stats.progressCurve.length > 0
      ? stats.progressCurve
      : [
          { month: 'Jan', prevu: 15, reel: 12 },
          { month: 'Fév', prevu: 35, reel: 30 },
          { month: 'Mar', prevu: 60, reel: site.progressPct || 55 },
          { month: 'Avr', prevu: 80, reel: null },
          { month: 'Mai', prevu: 100, reel: null },
        ];

  const budgetData =
    stats?.budgetByPhase && stats.budgetByPhase.length > 0
      ? stats.budgetByPhase
      : [
          {
            name: 'Gros Œuvre',
            value: site.budgetTotal ? Number(site.budgetTotal) * 0.6 : 30000,
            color: '#0f172a',
          },
          {
            name: 'Second Œuvre',
            value: site.budgetTotal ? Number(site.budgetTotal) * 0.25 : 15000,
            color: '#2563eb',
          },
          {
            name: 'Finitions',
            value: site.budgetTotal ? Number(site.budgetTotal) * 0.15 : 5000,
            color: '#10b981',
          },
        ];

  const totalPhaseBudget = budgetData.reduce(
    (acc, curr) => acc + (Number(curr.value) || 0),
    0
  );

  const nonZeroBudgetData = budgetData.filter(
    (d) => (Number(d.value) || 0) > 0
  );

  const workforceData =
    stats?.workforceEvolution && stats.workforceEvolution.length > 0
      ? stats.workforceEvolution
      : [
          { week: 'S-4', ouvriers: 8, cadres: 2 },
          { week: 'S-3', ouvriers: 12, cadres: 2 },
          { week: 'S-2', ouvriers: 14, cadres: 3 },
          { week: 'S-1', ouvriers: site.teamMembers?.length || 10, cadres: 3 },
        ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top summary KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/5 shadow-xs">
          <span className="text-[0.7rem] font-bold text-[#64748b] uppercase tracking-wider">
            Avancement Global
          </span>
          <div className="text-2xl font-extrabold text-[#2563eb] mt-1 tabular-nums">
            {stats?.overallProgressPct ?? site.progressPct}%
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/5 shadow-xs">
          <span className="text-[0.7rem] font-bold text-[#64748b] uppercase tracking-wider">
            Budget Alloué
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#0f172a] mt-1 tabular-nums truncate">
            {site.budgetTotal ? `${site.budgetTotal.toLocaleString('fr-FR')} TND` : '-'}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/5 shadow-xs">
          <span className="text-[0.7rem] font-bold text-[#64748b] uppercase tracking-wider">
            Tâches Réalisées
          </span>
          <div className="text-2xl font-extrabold text-[#10b981] mt-1 tabular-nums">
            {stats?.completedTasks ?? 0} / {stats?.totalTasks ?? 0}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/5 shadow-xs">
          <span className="text-[0.7rem] font-bold text-[#64748b] uppercase tracking-wider">
            Équipe Active
          </span>
          <div className="text-2xl font-extrabold text-[#0f172a] mt-1 tabular-nums">
            {stats?.activeTeamCount ?? site.teamMembers?.length ?? 0} pers.
          </div>
        </div>
      </div>

      {/* Top Row: Progress Curve & Budget Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Area Chart */}
        <Card className="border-black/5 shadow-xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#f8fafc] border-b border-black/5 pb-3.5 pt-4 px-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#2563eb]" />
              <CardTitle className="text-base font-bold text-[#0f172a] [text-wrap:balance]">
                Courbe d&apos;Avancement (Prévu vs Réel)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPrevu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }}
                />
                <Area
                  type="monotone"
                  name="Prévu (%)"
                  dataKey="prevu"
                  stroke="#64748b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPrevu)"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  name="Réel (%)"
                  dataKey="reel"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorReel)"
                  activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget Pie Chart */}
        <Card className="border-black/5 shadow-xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#f8fafc] border-b border-black/5 pb-3.5 pt-4 px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#10b981]" />
                <CardTitle className="text-base font-bold text-[#0f172a] [text-wrap:balance]">
                  Répartition du Budget par Phase
                </CardTitle>
              </div>
              {totalPhaseBudget > 0 && (
                <span className="text-[0.72rem] font-bold text-[#0f172a] bg-slate-100 px-2.5 py-1 rounded-full tabular-nums shrink-0">
                  Total : {totalPhaseBudget.toLocaleString('fr-FR')} TND
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5 h-[320px] flex items-center justify-center">
            {nonZeroBudgetData.length === 0 || totalPhaseBudget <= 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-[#94a3b8]">
                  <Wallet className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#0f172a] mb-1">
                  Aucun budget alloué par phase
                </h4>
                <p className="text-xs text-[#64748b] max-w-xs [text-wrap:pretty]">
                  Définissez le budget global ou les phases du chantier pour visualiser la répartition financière.
                </p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col sm:flex-row items-center gap-4 sm:gap-6 min-w-0">
                {/* Left: Donut Chart */}
                <div className="w-full sm:w-[190px] h-[150px] sm:h-full shrink-0 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={nonZeroBudgetData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={74}
                        paddingAngle={nonZeroBudgetData.length > 1 ? 3 : 0}
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {nonZeroBudgetData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: unknown, _name: unknown, entry: { payload?: { name?: string } }) => [
                          `${Number(value).toLocaleString('fr-FR')} TND (${
                            totalPhaseBudget > 0
                              ? Math.round(((Number(value) || 0) / totalPhaseBudget) * 100)
                              : 0
                          }%)`,
                          entry?.payload?.name || 'Budget',
                        ]}
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                          fontSize: '12px',
                        }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Right: Clean readable legend list */}
                <div className="flex-1 min-w-0 w-full flex flex-col justify-center gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {budgetData.map((entry, index) => {
                    const val = Number(entry.value) || 0;
                    const pct =
                      totalPhaseBudget > 0
                        ? Math.round((val / totalPhaseBudget) * 100)
                        : 0;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-default"
                        title={`${entry.name} : ${val.toLocaleString('fr-FR')} TND (${pct}%)`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white shadow-2xs"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="truncate text-xs font-semibold text-[#1e293b] group-hover:text-[#0f172a]">
                            {entry.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 tabular-nums">
                          <span className="text-[0.7rem] text-[#64748b] hidden md:inline">
                            {val.toLocaleString('fr-FR')} TND
                          </span>
                          <span className="font-bold text-[#0f172a] bg-slate-100 px-2 py-0.5 rounded-md text-[0.7rem]">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Workforce */}
      <Card className="border-black/5 shadow-xs rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-[#f8fafc] border-b border-black/5 pb-3.5 pt-4 px-6">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0f172a]" />
            <CardTitle className="text-base font-bold text-[#0f172a] [text-wrap:balance]">
              Évolution des Effectifs Présents
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workforceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <RechartsTooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }}
              />
              <Bar
                dataKey="ouvriers"
                name="Ouvriers"
                fill="#0f172a"
                radius={[4, 4, 0, 0]}
                maxBarSize={38}
              />
              <Bar
                dataKey="cadres"
                name="Encadrement / Chefs"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                maxBarSize={38}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
