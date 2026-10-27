'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, AlertCircle, Info, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageGuidance } from '@/hooks/use-page-guidance';
import { cn } from '@/lib/utils';

export interface PrerequisiteBannerProps {
  id: string;
  title: string;
  description: string;
  severity?: 'blocking' | 'recommended' | 'info';
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function PrerequisiteBanner({
  id,
  title,
  description,
  severity = 'blocking',
  action,
  className,
}: PrerequisiteBannerProps) {
  const router = useRouter();
  const { isPrerequisiteDismissed, dismissPrerequisite } = usePageGuidance();

  if (isPrerequisiteDismissed(id)) {
    return null;
  }

  const isBlocking = severity === 'blocking';
  const isRecommended = severity === 'recommended';

  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans shadow-sm transition-all animate-in fade-in slide-in-from-top-2 duration-300",
        isBlocking && "bg-rose-50/70 border-rose-200 text-rose-950",
        isRecommended && "bg-amber-50/70 border-amber-200 text-amber-950",
        !isBlocking && !isRecommended && "bg-corp-blue-50/70 border-corp-blue-200 text-corp-blue-950",
        className
      )}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
            isBlocking && "bg-rose-100 text-rose-600 border border-rose-200",
            isRecommended && "bg-amber-100 text-amber-700 border border-amber-200",
            !isBlocking && !isRecommended && "bg-corp-blue-100 text-corp-blue-700 border border-corp-blue-200"
          )}
        >
          {isBlocking ? (
            <AlertCircle className="w-5 h-5" />
          ) : isRecommended ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Info className="w-5 h-5" />
          )}
        </div>

        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold leading-tight">
              {title}
            </h4>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                isBlocking && "bg-rose-100 text-rose-700 border border-rose-200",
                isRecommended && "bg-amber-100 text-amber-800 border border-amber-200",
                !isBlocking && !isRecommended && "bg-corp-blue-100 text-corp-blue-800 border border-corp-blue-200"
              )}
            >
              {isBlocking ? 'Prérequis Requis' : isRecommended ? 'Recommandé' : 'Information'}
            </span>
          </div>
          <p className="text-xs text-sand-600 leading-normal font-normal">
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-rose-100/50">
        {action && (
          <Button
            size="sm"
            onClick={() => router.push(action.href)}
            className={cn(
              "rounded-xl text-xs font-bold gap-1.5 shadow-2xs h-9 px-4",
              isBlocking && "bg-rose-600 hover:bg-rose-700 text-white",
              isRecommended && "bg-amber-600 hover:bg-amber-700 text-white",
              !isBlocking && !isRecommended && "bg-corp-blue-600 hover:bg-corp-blue-700 text-white"
            )}
          >
            <span>{action.label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}

        <button
          type="button"
          onClick={() => dismissPrerequisite(id)}
          className="p-1.5 text-sand-400 hover:text-sand-600 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
          title="Masquer cet avertissement"
          aria-label="Masquer cet avertissement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
