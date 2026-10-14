'use client';

import React from 'react';
import { ProductionOrder } from '@/types/production';
import { Scale, Coins, Clock, Sparkles, Users, Info, ShieldCheck } from 'lucide-react';

interface CostAnalysisTabProps {
  order: ProductionOrder;
}

export function CostAnalysisTab({ order }: CostAnalysisTabProps) {
  const totalCost = order.totalProductionCost ?? 0;
  const matCost = order.totalMaterialCost ?? 0;
  const laborCost = order.totalLaborCost ?? 0; // Authoritative backend total (manual + employee labor)
  const otherCost = order.totalOtherCost ?? 0;

  // Compute breakdown of labor components across steps
  const manualLaborSum = order.steps.reduce((sum, s) => sum + (s.laborCost ?? 0), 0);
  const employeeLaborSum = order.steps.reduce((sum, s) => sum + (s.employeeLaborCost ?? 0), 0);

  const matPct = totalCost > 0 ? Math.round((matCost / totalCost) * 100) : 0;
  const manualLaborPct = totalCost > 0 ? Math.round((manualLaborSum / totalCost) * 100) : 0;
  const employeeLaborPct = totalCost > 0 ? Math.round((employeeLaborSum / totalCost) * 100) : 0;
  const otherPct = totalCost > 0 ? Math.max(0, 100 - matPct - manualLaborPct - employeeLaborPct) : 0;

  const outputQty = order.actualOutputQuantity ?? order.plannedOutputQuantity;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Scale className="w-5 h-5 text-corp-blue-600" />
          Analyse des Coûts & Structure de Revient
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Ventilation détaillée des charges directes et indirectes engagées sur la fabrication.
        </p>
      </div>

      {/* Primary Cost Proportion Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span>Répartition des Coûts de Fabrication</span>
          <span className="font-mono text-corp-blue-700 text-sm">{totalCost.toFixed(3)} TND</span>
        </div>

        {/* Visual progress segments */}
        <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex">
          {matPct > 0 && (
            <div
              style={{ width: `${matPct}%` }}
              className="bg-amber-500 hover:bg-amber-600 transition-all"
              title={`Matières: ${matPct}%`}
            />
          )}
          {manualLaborPct > 0 && (
            <div
              style={{ width: `${manualLaborPct}%` }}
              className="bg-indigo-500 hover:bg-indigo-600 transition-all"
              title={`Forfait MO Manuel: ${manualLaborPct}%`}
            />
          )}
          {employeeLaborPct > 0 && (
            <div
              style={{ width: `${employeeLaborPct}%` }}
              className="bg-blue-600 hover:bg-blue-700 transition-all"
              title={`MO Ouvriers (Pointage): ${employeeLaborPct}%`}
            />
          )}
          {otherPct > 0 && (
            <div
              style={{ width: `${otherPct}%` }}
              className="bg-purple-500 hover:bg-purple-600 transition-all"
              title={`Autres: ${otherPct}%`}
            />
          )}
        </div>

        {/* Detailed Legend Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
          {/* Materials */}
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
              <div>
                <span className="font-semibold text-amber-950 block">Matières</span>
                <span className="text-[10px] text-amber-700">Consommations</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-amber-950">{matCost.toFixed(3)} TND</span>
              <span className="text-[10px] text-amber-700 block">({matPct}%)</span>
            </div>
          </div>

          {/* Manual Step Labor */}
          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
              <div>
                <span className="font-semibold text-indigo-950 block">Forfait MO Étapes</span>
                <span className="text-[10px] text-indigo-700">Frais manuels</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-indigo-950">{manualLaborSum.toFixed(3)} TND</span>
              <span className="text-[10px] text-indigo-700 block">({manualLaborPct}%)</span>
            </div>
          </div>

          {/* Employee Labor from Work Logs */}
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
              <div>
                <span className="font-semibold text-blue-950 block">MO Ouvriers</span>
                <span className="text-[10px] text-blue-700">Sessions pointées</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-blue-950">{employeeLaborSum.toFixed(3)} TND</span>
              <span className="text-[10px] text-blue-700 block">({employeeLaborPct}%)</span>
            </div>
          </div>

          {/* Other Costs */}
          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
              <div>
                <span className="font-semibold text-purple-950 block">Autres Frais</span>
                <span className="text-[10px] text-purple-700">Charges diverses</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-purple-950">{otherCost.toFixed(3)} TND</span>
              <span className="text-[10px] text-purple-700 block">({otherPct}%)</span>
            </div>
          </div>
        </div>

        {/* Labor Consolidation Callout */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Coins className="w-4 h-4 text-corp-blue-600 shrink-0" />
            <span>
              <strong>Total Main d'Œuvre de Fabrication : </strong>
              Forfait d'étapes ({manualLaborSum.toFixed(3)} TND) + Ouvriers effectifs ({employeeLaborSum.toFixed(3)} TND)
            </span>
          </div>
          <span className="font-mono font-bold text-slate-900 text-sm">
            = {laborCost.toFixed(3)} TND
          </span>
        </div>
      </div>

      {/* Unit Economics Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold tracking-tight">Rentabilité & Coût Unitaire de Sortie</h4>
          </div>
          <span className="text-xs text-slate-400">Calcul Backend Autoritaire</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div>
            <span className="text-slate-400 text-xs font-medium">Quantité Totale Fabriquée</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-white">
                {outputQty}
              </span>
              <span className="text-xs text-slate-400">unités</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 text-xs font-medium">Coût Unitaire de Revient</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-amber-400">
                {(order.unitProductionCost ?? 0).toFixed(3)}
              </span>
              <span className="text-xs text-slate-300 font-bold">TND / U</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 text-xs font-medium">Charge Main d'Œuvre / Unité</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-slate-200">
                {outputQty > 0 ? (laborCost / outputQty).toFixed(3) : '0.000'}
              </span>
              <span className="text-xs text-slate-400">TND / U</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 border-t border-slate-700/80 pt-3 leading-relaxed">
          💡 <strong>Intégrité comptable :</strong> Le coût de revient comprend les matières consommées, le forfait manuel de chaque étape, et les sessions réelles des ouvriers pointés. Les travaux payables hors fabrication (ateliers/maintenance) ne sont jamais inclus dans le coût de fabrication des ordres.
        </p>
      </div>

      {/* Step by Step Breakdown */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Contribution Détaillée par Étape
        </h4>

        <div className="space-y-3 pt-1">
          {order.steps.map((step) => {
            const stepCost = step.totalStepCost ?? 0;
            const stepPct = totalCost > 0 ? Math.round((stepCost / totalCost) * 100) : 0;

            return (
              <div key={step.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Étape #{step.stepNumber}
                    </span>
                    <span className="font-bold text-slate-900">— {step.name}</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    {stepCost.toFixed(3)} TND <span className="text-[11px] text-slate-400 font-normal">({stepPct}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                  <div style={{ width: `${stepPct}%` }} className="h-full bg-corp-blue-600 rounded-full" />
                </div>

                {/* Granular Step Cost Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Matières :</span>
                    <strong className="font-mono text-slate-800">
                      {(step.materialCost ?? 0).toFixed(3)} TND
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Forfait MO :</span>
                    <strong className="font-mono text-indigo-700">
                      {(step.laborCost ?? 0).toFixed(3)} TND
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">MO Ouvriers :</span>
                    <strong className="font-mono text-blue-700">
                      {(step.employeeLaborCost ?? 0).toFixed(3)} TND
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Autres Frais :</span>
                    <strong className="font-mono text-purple-700">
                      {(step.otherCost ?? 0).toFixed(3)} TND
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
