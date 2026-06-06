'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isLoading
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-xl border-corp-blue-100 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-corp-blue-900 text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sand-400 font-medium">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel 
            variant="ghost" 
            className="rounded-xl font-bold text-sand-400 hover:bg-sand-50"
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction 
            variant="destructive" 
            className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Suppression..." : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


