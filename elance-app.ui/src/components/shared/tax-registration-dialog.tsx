'use client';

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaxRegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  initialValue?: string;
}

export function TaxRegistrationDialog({
  isOpen,
  onClose,
  onConfirm,
  initialValue = ""
}: TaxRegistrationDialogProps) {
  const [parts, setParts] = useState({
    part1: "", // 1234567P
    part2a: "", // A
    part2b: "", // M
    part3: "000" // 000
  });

  useEffect(() => {
    if (isOpen && initialValue) {
      const p = initialValue.split('/');
      if (p.length >= 4) {
        setParts({
          part1: p[0] || "",
          part2a: p[1] || "",
          part2b: p[2] || "",
          part3: p[3] || "000"
        });
      } else {
        // Fallback for non-formatted values
        setParts({
          part1: initialValue,
          part2a: "A",
          part2b: "M",
          part3: "000"
        });
      }
    }
  }, [isOpen, initialValue]);

  const isValid = () => {
    const p1Regex = /^\d{7}[A-Z]$/;
    const p2Regex = /^[A-Z]$/;
    const p3Regex = /^\d{3}$/;
    
    return p1Regex.test(parts.part1) && 
           p2Regex.test(parts.part2a) && 
           p2Regex.test(parts.part2b) && 
           p3Regex.test(parts.part3);
  };

  const handleConfirm = () => {
    if (isValid()) {
      onConfirm(`${parts.part1}/${parts.part2a}/${parts.part2b}/${parts.part3}`);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-[32px] border-forest-100 shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 bg-forest-900 text-white">
          <DialogTitle className="font-heading text-2xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-800 flex items-center justify-center border border-forest-700">
              <AlertCircle className="w-5 h-5 text-emerald-400" />
            </div>
            Matricule Fiscal
          </DialogTitle>
          <p className="text-forest-300 text-xs font-medium mt-2 leading-relaxed">
            Saisissez les composants de l'identifiant fiscal selon le format standard (Tunisie).
          </p>
        </DialogHeader>

        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between gap-3">
            {/* Part 1 */}
            <div className="flex-1 space-y-2">
              <Label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Identifiant</Label>
              <Input 
                className="h-12 rounded-xl border-forest-100 font-bold font-mono text-center text-lg focus:ring-forest-600 focus:border-forest-600"
                placeholder="1234567P"
                maxLength={8}
                value={parts.part1}
                onChange={(e) => setParts({ ...parts, part1: e.target.value.toUpperCase() })}
              />
            </div>

            <span className="text-2xl font-bold text-sand-300 pt-6">/</span>

            {/* Part 2A */}
            <div className="w-16 space-y-2">
              <Label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-center block">Cat.</Label>
              <Input 
                className="h-12 rounded-xl border-forest-100 font-bold font-mono text-center text-lg focus:ring-forest-600 focus:border-forest-600"
                placeholder="A"
                maxLength={1}
                value={parts.part2a}
                onChange={(e) => setParts({ ...parts, part2a: e.target.value.toUpperCase() })}
              />
            </div>

            <span className="text-2xl font-bold text-sand-300 pt-6">/</span>

            {/* Part 2B */}
            <div className="w-16 space-y-2">
              <Label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-center block">TVA</Label>
              <Input 
                className="h-12 rounded-xl border-forest-100 font-bold font-mono text-center text-lg focus:ring-forest-600 focus:border-forest-600"
                placeholder="M"
                maxLength={1}
                value={parts.part2b}
                onChange={(e) => setParts({ ...parts, part2b: e.target.value.toUpperCase() })}
              />
            </div>

            <span className="text-2xl font-bold text-sand-300 pt-6">/</span>

            {/* Part 3 */}
            <div className="w-20 space-y-2">
              <Label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-center block">Code</Label>
              <Input 
                className="h-12 rounded-xl border-forest-100 font-bold font-mono text-center text-lg focus:ring-forest-600 focus:border-forest-600"
                placeholder="000"
                maxLength={3}
                value={parts.part3}
                onChange={(e) => setParts({ ...parts, part3: e.target.value })}
              />
            </div>
          </div>

          <div className={cn(
            "p-4 rounded-2xl flex items-center gap-3 transition-colors",
            isValid() ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-sand-50 border border-sand-100 text-sand-400"
          )}>
            {isValid() ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <div className="text-xs">
              <div className="font-bold uppercase tracking-widest text-[0.6rem]">Format Final</div>
              <div className="font-mono text-sm mt-0.5">
                {parts.part1 || "________"} / {parts.part2a || "_"} / {parts.part2b || "_"} / {parts.part3 || "___"}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 border-t border-forest-50 bg-sand-50/30 gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="rounded-xl font-bold text-sand-400"
          >
            Annuler
          </Button>
          <Button 
            disabled={!isValid()}
            onClick={handleConfirm}
            className="rounded-xl bg-forest-600 hover:bg-forest-800 text-white font-bold shadow-lg shadow-forest-600/20 px-8"
          >
            Confirmer l'Identifiant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
