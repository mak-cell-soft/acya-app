'use client';

import React from 'react';
import { useCustomerRecouvrement } from '@/hooks/use-recouvrement';
import { computeCustomerSolvency, formatCurrency } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Info, ShieldAlert } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface CustomerSolvencyBadgeProps {
  customerId: number;
  creditLimit?: number | null;
  className?: string;
}

export function CustomerSolvencyBadge({ customerId, creditLimit = 0, className }: CustomerSolvencyBadgeProps) {
  const { data: recouvrement, isLoading, isError } = useCustomerRecouvrement(customerId, !!customerId);

  if (!customerId) return null;

  if (isLoading) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sand-100/70 text-sand-500 animate-pulse border border-sand-200", className)}>
        <div className="w-2 h-2 rounded-full bg-sand-400 animate-ping" />
        <span>Calcul solvabilité...</span>
      </div>
    );
  }

  if (isError || !recouvrement) {
    return null;
  }

  const balance = recouvrement.currentBalance || 0;
  const unpaidCount = recouvrement.unpaidInvoices?.length || 0;
  const totalUnpaid = recouvrement.totalUnpaid || 0;
  const limit = creditLimit ?? 0;

  const solvency = computeCustomerSolvency(balance, limit, unpaidCount);

  const statusConfig = {
    green: {
      bgColor: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/80',
      dotColor: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    orange: {
      bgColor: 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100/80',
      dotColor: 'bg-amber-500',
      icon: AlertTriangle,
    },
    red: {
      bgColor: 'bg-red-50 text-red-800 border-red-200/80 hover:bg-red-100/80',
      dotColor: 'bg-red-500 animate-pulse',
      icon: XCircle,
    },
  };

  const currentConfig = statusConfig[solvency.status];
  const Icon = currentConfig.icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-xs cursor-pointer select-none",
            currentConfig.bgColor,
            className
          )}
        >
          <span className="relative flex h-2 w-2">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", currentConfig.dotColor)} />
            <span className={cn("relative inline-flex rounded-full h-2 w-2", currentConfig.dotColor)} />
          </span>
          <Icon className="w-3.5 h-3.5" />
          <span>{solvency.label}</span>
          <Info className="w-3 h-3 opacity-60 ml-0.5 hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-4 rounded-2xl border-sand-200 shadow-2xl bg-white/95 backdrop-blur-xl space-y-3 z-50">
        <div className="flex items-center justify-between border-b border-sand-100 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className={cn(
              "w-4 h-4",
              solvency.status === 'green' ? 'text-emerald-600' : solvency.status === 'orange' ? 'text-amber-600' : 'text-red-600'
            )} />
            <span className="text-xs font-black uppercase tracking-wider text-corp-blue-950">Santé Financière Client</span>
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase",
            solvency.status === 'green' ? 'bg-emerald-100 text-emerald-800' : solvency.status === 'orange' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
          )}>
            {solvency.status.toUpperCase()}
          </span>
        </div>

        <p className="text-xs text-sand-600 font-medium leading-relaxed">
          {solvency.description}
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-2.5 bg-sand-50/80 rounded-xl border border-sand-100 space-y-0.5">
            <span className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block">Solde Débiteur</span>
            <span className={cn("font-black text-xs", balance > 0 ? "text-red-600" : "text-emerald-600")}>
              {formatCurrency(balance)}
            </span>
          </div>

          <div className="p-2.5 bg-sand-50/80 rounded-xl border border-sand-100 space-y-0.5">
            <span className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block">Plafond Crédit</span>
            <span className="font-black text-xs text-corp-blue-900">
              {limit > 0 ? formatCurrency(limit) : 'Non défini'}
            </span>
          </div>

          <div className="p-2.5 bg-sand-50/80 rounded-xl border border-sand-100 space-y-0.5">
            <span className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block">Factures Non Réglées</span>
            <span className="font-black text-xs text-corp-blue-900">
              {unpaidCount} ({formatCurrency(totalUnpaid)})
            </span>
          </div>

          <div className="p-2.5 bg-sand-50/80 rounded-xl border border-sand-100 space-y-0.5">
            <span className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block">Marge Disponible</span>
            <span className={cn(
              "font-black text-xs",
              limit > 0 ? (limit - balance > 0 ? "text-emerald-600" : "text-red-600") : "text-sand-500"
            )}>
              {limit > 0 ? formatCurrency(Math.max(0, limit - balance)) : '—'}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
