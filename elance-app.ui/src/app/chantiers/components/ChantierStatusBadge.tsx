'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChantierStatus, ChantierFlag } from '@/types/chantier';

interface ChantierStatusBadgeProps {
  status: ChantierStatus | number;
  className?: string;
  size?: 'sm' | 'md';
}

export function ChantierStatusBadge({
  status,
  className,
  size = 'md',
}: ChantierStatusBadgeProps) {
  const statusStr = String(status);
  const isCompleted = statusStr === 'Completed' || statusStr === '3';
  const isInProgress = statusStr === 'InProgress' || statusStr === '1';
  const isOnHold = statusStr === 'OnHold' || statusStr === '2';

  let label = 'Planifié';
  let badgeStyle = 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]';
  let dotStyle = 'bg-[#94a3b8]';

  if (isCompleted) {
    label = 'Terminé';
    badgeStyle = 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]';
    dotStyle = 'bg-[#10b981]';
  } else if (isInProgress) {
    label = 'En cours';
    badgeStyle = 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]';
    dotStyle = 'bg-[#2563eb] animate-pulse';
  } else if (isOnHold) {
    label = 'En pause';
    badgeStyle = 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]';
    dotStyle = 'bg-[#f59e0b]';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold rounded-full border shadow-2xs select-none',
        size === 'sm' ? 'text-[0.68rem] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        badgeStyle,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotStyle)} />
      <span>{label}</span>
    </span>
  );
}

export function ChantierHealthIndicator({
  healthFlag,
  className,
}: {
  healthFlag?: ChantierFlag | number;
  className?: string;
}) {
  const flagStr = String(healthFlag ?? '');
  const isGreen = flagStr === 'Green' || flagStr === '0';
  const isOrange = flagStr === 'Orange' || flagStr === '1';

  let color = 'bg-[#ef4444]';
  let label = 'Critique';

  if (isGreen) {
    color = 'bg-[#10b981]';
    label = 'Nominal';
  } else if (isOrange) {
    color = 'bg-[#f59e0b]';
    label = 'Vigilance';
  }

  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      title={`État du chantier : ${label}`}
    >
      <span className={cn('w-2 h-2 rounded-full ring-2 ring-white shadow-2xs', color)} />
    </div>
  );
}
