import React from 'react';
import { ProductionStatus, ProductionStepStatus } from '@/types/production';
import { cn } from '@/lib/utils';
import { Clock, Play, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';

interface ProductionStatusBadgeProps {
  status: ProductionStatus;
  className?: string;
}

export function ProductionStatusBadge({ status, className }: ProductionStatusBadgeProps) {
  switch (status) {
    case 'Planned':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-xs',
            className
          )}
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          Planifié
        </span>
      );
    case 'InProgress':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs animate-pulse',
            className
          )}
        >
          <Play className="w-3 h-3 text-blue-600 fill-blue-600" />
          En cours
        </span>
      );
    case 'Completed':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs',
            className
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
          Terminé
        </span>
      );
    case 'Validated':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs',
            className
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Validé (Stock à jour)
        </span>
      );
    case 'Cancelled':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs',
            className
          )}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          Annulé
        </span>
      );
    default:
      return null;
  }
}

interface StepStatusBadgeProps {
  status: ProductionStepStatus;
  className?: string;
}

export function StepStatusBadge({ status, className }: StepStatusBadgeProps) {
  switch (status) {
    case 'Planned':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200',
            className
          )}
        >
          <Clock className="w-3 h-3" />
          En attente
        </span>
      );
    case 'InProgress':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200',
            className
          )}
        >
          <Play className="w-2.5 h-2.5 fill-blue-600" />
          En cours
        </span>
      );
    case 'Completed':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200',
            className
          )}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Achevé
        </span>
      );
    case 'Cancelled':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-600 border border-rose-200',
            className
          )}
        >
          <XCircle className="w-3 h-3" />
          Annulé
        </span>
      );
    default:
      return null;
  }
}
