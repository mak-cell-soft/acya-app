'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import {
  DEFAULT_VALIDITY_DURATION,
  DEFAULT_VALIDITY_UNIT,
  DEFAULT_COMMERCIAL_CONDITIONS,
  VALIDITY_UNITS,
  generateValiditySentence,
  validateValidityDuration
} from '@/lib/quotation-utils';

export interface QuoteValidityConfig {
  validityDuration: number;
  validityUnit: 'days' | 'months';
  commercialConditions: string;
}

export interface QuoteValidityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  config: QuoteValidityConfig;
  onSave: (newConfig: QuoteValidityConfig) => void;
}

interface QuoteValidityFormProps {
  initialConfig: QuoteValidityConfig;
  onClose: () => void;
  onSave: (newConfig: QuoteValidityConfig) => void;
}

function QuoteValidityForm({
  initialConfig,
  onClose,
  onSave
}: QuoteValidityFormProps) {
  const [durationInput, setDurationInput] = useState<string>(
    String(initialConfig.validityDuration || DEFAULT_VALIDITY_DURATION)
  );
  const [unit, setUnit] = useState<'days' | 'months'>(
    initialConfig.validityUnit || DEFAULT_VALIDITY_UNIT
  );
  const [conditions, setConditions] = useState<string>(
    initialConfig.commercialConditions !== undefined && initialConfig.commercialConditions !== null
      ? initialConfig.commercialConditions
      : DEFAULT_COMMERCIAL_CONDITIONS
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamically generated validity sentence based on current local inputs
  const validitySentence = useMemo(() => {
    const parsed = parseInt(durationInput, 10);
    return generateValiditySentence(isNaN(parsed) || parsed <= 0 ? 0 : parsed, unit);
  }, [durationInput, unit]);

  // Full preview lines
  const previewLines = useMemo(() => {
    const lines = [validitySentence];
    const trimmedCustom = (conditions || '').trim();
    if (trimmedCustom) {
      const customLines = trimmedCustom
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
      for (const line of customLines) {
        // Avoid duplicate validity sentence if user typed it
        if (line.toLowerCase() !== validitySentence.toLowerCase()) {
          lines.push(line);
        }
      }
    }
    return lines;
  }, [validitySentence, conditions]);

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDurationInput(val);
    if (errorMessage) {
      setErrorMessage(validateValidityDuration(val));
    }
  };

  const handleUnitChange = (newUnit: 'days' | 'months' | null) => {
    if (newUnit) {
      setUnit(newUnit);
    }
  };

  const handleSave = () => {
    const error = validateValidityDuration(durationInput);
    if (error) {
      setErrorMessage(error);
      return;
    }

    const parsedDuration = parseInt(durationInput.trim(), 10);
    const cleanedConditions = (conditions || '').trim();

    onSave({
      validityDuration: parsedDuration,
      validityUnit: unit,
      commercialConditions: cleanedConditions
    });

    onClose();
  };

  return (
    <>
      {/* Content body */}
      <div className="px-6 py-5 space-y-5 text-sm">
        {/* Validity period section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-corp-blue-950 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-corp-blue-600" />
              Durée de validité du devis
            </label>
            <span className="text-[11px] font-semibold text-sand-400">
              Obligatoire
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-sand-500 block mb-1">
                Durée (nombre entier)
              </label>
              <Input
                id="quote-validity-duration-input"
                type="number"
                min="1"
                step="1"
                value={durationInput}
                onChange={handleDurationChange}
                placeholder="Ex: 15"
                className={`h-10 text-sm font-semibold rounded-xl bg-sand-50/60 border-sand-200 focus:bg-white ${
                  errorMessage ? 'border-red-400 focus:ring-red-400' : 'focus:border-corp-blue-600'
                }`}
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-sand-500 block mb-1">
                Unité de temps
              </label>
              <Select value={unit} onValueChange={handleUnitChange}>
                <SelectTrigger 
                  id="quote-validity-unit-select"
                  className="h-10 text-sm font-semibold rounded-xl bg-sand-50/60 border-sand-200 focus:bg-white focus:border-corp-blue-600"
                >
                  <SelectValue placeholder="Sélectionner l'unité">
                    {VALIDITY_UNITS.find(u => u.key === unit)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-sand-200 shadow-lg">
                  {VALIDITY_UNITS.map(opt => (
                    <SelectItem key={opt.key} value={opt.key} className="text-sm font-medium">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error feedback */}
          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-200 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Dynamic sentence badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-corp-blue-50/70 border border-corp-blue-100 text-xs font-medium text-corp-blue-900">
            <Sparkles className="w-3.5 h-3.5 text-corp-blue-600 shrink-0" />
            <span>Mention générée :</span>
            <strong className="text-corp-blue-950 font-bold ml-1">{validitySentence}</strong>
          </div>
        </div>

        {/* Commercial conditions section */}
        <div className="space-y-2 pt-2 border-t border-sand-100">
          <div className="flex items-center justify-between">
            <label 
              htmlFor="quote-commercial-conditions-textarea"
              className="text-xs font-bold text-corp-blue-950 uppercase tracking-wider flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-corp-blue-600" />
              Conditions commerciales complémentaires
            </label>
            <span className="text-[11px] font-medium text-sand-400">
              Lignes additionnelles
            </span>
          </div>

          <Textarea
            id="quote-commercial-conditions-textarea"
            rows={3}
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="Ex: Dans la limite du stock disponible.&#10;Sous réserve de confirmation de commande."
            className="text-xs leading-relaxed font-normal rounded-xl bg-sand-50/60 border-sand-200 focus:bg-white focus:border-corp-blue-600 resize-none"
          />
          <p className="text-[11px] text-sand-400 leading-tight">
            Saisissez une condition par ligne. La mention de validité est automatiquement incluse.
          </p>
        </div>

        {/* Document rendering preview */}
        <div className="space-y-1.5 pt-2 border-t border-sand-100">
          <span className="text-[11px] font-bold text-sand-500 uppercase tracking-wider block">
            Aperçu sur le document (Devis)
          </span>
          <div className="p-3.5 rounded-xl bg-sand-50 border border-sand-200/80 space-y-1 text-xs">
            <div className="font-bold text-corp-blue-950 text-[11px] uppercase tracking-wide pb-1 border-b border-sand-200/60">
              Conditions commerciales
            </div>
            <ul className="space-y-0.5 pt-1 text-sand-700">
              {previewLines.map((line, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-sand-400 font-bold">•</span>
                  <span className={idx === 0 ? 'font-medium text-corp-blue-950' : ''}>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <DialogFooter className="px-6 py-4 bg-sand-50/60 border-t border-sand-100 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-9 px-4 text-xs font-semibold rounded-xl border-sand-300 hover:bg-sand-100 text-sand-700"
        >
          Annuler
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          className="h-9 px-5 text-xs font-bold rounded-xl bg-corp-blue-600 hover:bg-corp-blue-700 text-white shadow-sm transition-all"
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          Enregistrer
        </Button>
      </DialogFooter>
    </>
  );
}

export function QuoteValidityDialog({
  isOpen,
  onClose,
  config,
  onSave
}: QuoteValidityDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden bg-white border border-sand-200 rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-b from-corp-blue-50/50 to-white border-b border-sand-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-corp-blue-600/10 border border-corp-blue-600/20 flex items-center justify-center text-corp-blue-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-corp-blue-950">
                Validité et conditions commerciales
              </DialogTitle>
              <DialogDescription className="text-xs text-sand-500 font-medium">
                Définissez la durée de validité et les conditions affichées sur le devis.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isOpen && (
          <QuoteValidityForm
            key={`${config.validityDuration}-${config.validityUnit}-${config.commercialConditions}`}
            initialConfig={config}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
