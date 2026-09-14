'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChantierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  submitVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  customFooter?: React.ReactNode;
  danger?: boolean;
}

export function ChantierModal({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  iconColor = 'text-[#2563eb]',
  iconBg = 'bg-[#eff6ff]',
  children,
  maxWidthClass = 'sm:max-w-[500px]',
  onSubmit,
  submitLabel = 'Enregistrer',
  cancelLabel = 'Annuler',
  isSubmitting = false,
  submitDisabled = false,
  submitVariant = 'default',
  customFooter,
  danger = false,
}: ChantierModalProps) {
  const content = (
    <>
      <DialogHeader className="pb-3 border-b border-black/5">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-black/5',
                iconBg
              )}
            >
              <Icon className={cn('w-5 h-5', iconColor)} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base sm:text-lg font-bold text-[#1a1a1a] tracking-tight [text-wrap:balance]">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-xs text-[#64748b] mt-0.5 leading-normal [text-wrap:pretty]">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>
      </DialogHeader>

      <div className="py-3 max-h-[70vh] overflow-y-auto custom-scrollbar px-0.5">
        {children}
      </div>

      {customFooter ? (
        customFooter
      ) : (
        <DialogFooter className="mt-2 pt-3 border-t border-black/5 flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-semibold px-4 h-9 border-black/15 text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] active:scale-[0.96] transition-transform"
          >
            {cancelLabel}
          </Button>

          {onSubmit && (
            <Button
              type="submit"
              disabled={isSubmitting || submitDisabled}
              variant={danger ? 'destructive' : submitVariant}
              className={cn(
                'rounded-xl text-xs font-bold px-5 h-9 active:scale-[0.96] transition-transform shadow-xs',
                !danger && submitVariant === 'default' && 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white',
                danger && 'bg-[#dc2626] hover:bg-[#b91c1c] text-white'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Traitement...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          )}
        </DialogFooter>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          maxWidthClass,
          'rounded-2xl p-6 bg-white border border-black/10 shadow-2xl font-sans'
        )}
      >
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-1">
            {content}
          </form>
        ) : (
          <div className="flex flex-col gap-1">{content}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function FormFieldGroup({
  label,
  required = false,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-[0.72rem] font-bold text-[#475569] uppercase tracking-wider flex items-center justify-between">
        <span>
          {label} {required && <span className="text-red-500 font-bold">*</span>}
        </span>
        {hint && <span className="text-[0.68rem] text-[#94a3b8] font-normal normal-case">{hint}</span>}
      </label>
      {children}
      {error && <span className="text-[0.7rem] text-red-600 font-medium">{error}</span>}
    </div>
  );
}

export function FormSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 py-1', className)}>
      {title && (
        <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[#94a3b8] border-b border-black/5 pb-1">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
