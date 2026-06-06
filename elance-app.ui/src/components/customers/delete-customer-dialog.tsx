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
import { Customer } from "@/types/customer";

interface DeleteCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  customer: Customer | null;
  isLoading?: boolean;
}

export function DeleteCustomerDialog({
  isOpen,
  onClose,
  onConfirm,
  customer,
  isLoading
}: DeleteCustomerDialogProps) {
  if (!customer) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-2xl border-rose-100 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-2xl font-bold text-forest-900">
            Supprimer le client ?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sand-500 font-medium pt-2">
            Êtes-vous sûr de vouloir supprimer <span className="font-bold text-forest-900">{customer.firstname} {customer.lastname}</span> ? 
            Cette action est irréversible et supprimera toutes les données associées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-6">
          <AlertDialogCancel onClick={onClose} className="rounded-xl font-bold border-forest-50 text-sand-400">
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            disabled={isLoading}
            className="rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20"
          >
            {isLoading ? "Suppression..." : "Confirmer la suppression"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


