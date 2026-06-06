'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { Supplier } from "@/types/customer";

interface DeleteSupplierDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  supplier: Supplier | null;
  isLoading?: boolean;
}

export function DeleteSupplierDialog({
  isOpen,
  onClose,
  onConfirm,
  supplier,
  isLoading
}: DeleteSupplierDialogProps) {
  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-forest-100 shadow-2xl rounded-2xl bg-white">
        <div className="p-8 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mx-auto">
            <Trash2 className="w-8 h-8" />
          </div>
          
          <div className="text-center space-y-2">
            <DialogTitle className="font-heading text-2xl font-bold text-forest-900 tracking-tight">
              Supprimer le fournisseur ?
            </DialogTitle>
            <DialogDescription className="text-sand-400 font-medium px-4">
              Vous êtes sur le point de supprimer <span className="text-forest-900 font-bold">{supplier.name}</span>. 
              Cette action marquera le fournisseur comme inactif.
            </DialogDescription>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              Les données historiques (achats, paiements, état de compte) seront conservées pour la comptabilité, 
              mais vous ne pourrez plus créer de nouvelles transactions avec ce fournisseur.
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 bg-sand-50 border-t border-forest-50 gap-3">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 h-12 font-bold text-sand-400 hover:bg-white"
          >
            Annuler
          </Button>
          <Button 
            type="button" 
            disabled={isLoading}
            onClick={onConfirm}
            className="flex-1 h-12 bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/20 gap-2"
          >
            {isLoading ? "Suppression..." : "Confirmer"}
          </Button>
        </DialogFooter>
        
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 w-8 h-8 bg-sand-100 flex items-center justify-center hover:bg-sand-200 transition-all text-sand-400"
        >
          <X className="w-4 h-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}


