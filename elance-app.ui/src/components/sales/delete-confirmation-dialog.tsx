'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  documentNumber: string;
  isDeleting?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  documentNumber,
  isDeleting = false,
}: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="rounded-3xl border-slate-100 shadow-[0_30px_100px_-20px_rgba(3,10,28,0.15)] overflow-hidden p-0 max-w-sm sm:max-w-[420px] bg-white">
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-5 animate-pulse">
            <AlertTriangle className="w-7 h-7" />
          </div>
          
          <AlertDialogTitle className="text-xl font-black tracking-tight text-slate-800 mb-2">
            Confirmer la suppression
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed max-w-[320px] mx-auto">
            Voulez-vous vraiment supprimer le document{' '}
            <span className="font-bold font-mono text-slate-850 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
              {documentNumber || 'Brouillon'}
            </span>{' '}
            ? Cette action est irréversible et restaurera le stock.
          </AlertDialogDescription>
        </div>
        
        <AlertDialogFooter className="m-0 bg-slate-50 border-t border-slate-100 p-4 flex flex-row justify-end gap-3 rounded-b-[24px]">
          <AlertDialogCancel className="h-11 rounded-xl px-5 text-sm font-bold text-slate-650 hover:text-slate-900 border border-slate-200 bg-white w-auto hover:bg-slate-50 transition-colors m-0">
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
              disabled={isDeleting}
              className="h-11 rounded-xl px-5 text-sm font-bold bg-red-600 hover:bg-red-700 text-white w-auto shadow-lg shadow-red-500/10 transition-all flex items-center justify-center gap-2 m-0"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
