'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Mail,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { approvalService, ApprovalConfig } from '@/services/components/approval.service';

interface ApprovalSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enterpriseId: number;
}

export function ApprovalSettingsDialog({
  isOpen,
  onClose,
  enterpriseId
}: ApprovalSettingsDialogProps) {
  const [thresholdAmount, setThresholdAmount] = useState<number>(0);
  const [approverEmails, setApproverEmails] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<number>(0);

  const availableRoles = [
    { value: 'Admin', label: 'Administrateur' },
    { value: 'SuperAdmin', label: 'Super Administrateur' },
    { value: 'Manager', label: 'Responsable Achat/Vente' }
  ];

  useEffect(() => {
    if (isOpen && enterpriseId > 0) {
      loadConfig();
    }
  }, [isOpen, enterpriseId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const config: ApprovalConfig = await approvalService.getConfig(enterpriseId);
      if (config) {
        setConfigId(config.id || 0);
        setThresholdAmount(config.thresholdAmount || 0);
        setApproverEmails(config.approverEmails || '');
        setSelectedRoles(config.approverRoles ? JSON.parse(config.approverRoles) : []);
      }
    } catch (err) {
      console.error('Failed to load approval config:', err);
      toast.error('Erreur lors du chargement des paramètres d’approbation.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (thresholdAmount < 0) {
      toast.warning('Le seuil d’approbation doit être supérieur ou égal à 0.');
      return;
    }

    setSaving(true);
    try {
      const configPayload: ApprovalConfig = {
        id: configId,
        enterpriseId,
        thresholdAmount,
        approverEmails: approverEmails.trim() || null,
        approverRoles: JSON.stringify(selectedRoles)
      };

      await approvalService.saveConfig(configPayload);
      toast.success('Configuration d’approbation enregistrée avec succès.');
      onClose();
    } catch (err: any) {
      console.error('Failed to save config:', err);
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde des paramètres.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        />

        {/* Modal panel */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-950 text-white flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-amber-500 font-mono">
                Configuration
              </span>
              <h2 className="text-base font-serif font-bold text-amber-50 flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-500 animate-spin-slow" /> Paramètres d&apos;Approbation
              </h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:bg-slate-800 hover:text-white w-8 h-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto bg-[#fdfdfd]">
            <p className="text-xs font-semibold text-slate-500">
              Configurez le seuil monétaire et déterminez quels rôles ou emails d’approbateurs reçoivent les demandes d’approbation de commande.
            </p>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-900" />
                <span className="text-xs font-bold font-mono">Chargement de la configuration...</span>
              </div>
            ) : (
              <div className="space-y-4 font-sans text-xs">
                {/* Threshold Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                    Seuil de déclenchement (TND) *
                  </label>
                  <div className="relative flex items-center">
                    <Input
                      type="number"
                      min="0"
                      value={thresholdAmount}
                      onChange={(e) => setThresholdAmount(parseFloat(e.target.value) || 0)}
                      className="border-slate-200 rounded-xl pr-12 text-xs font-semibold h-11 focus-visible:ring-amber-900 font-mono"
                    />
                    <span className="absolute right-4 text-xs font-bold text-slate-400 font-mono">TND</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Les commandes d’achat dépassant ce seuil seront bloquées jusqu’à approbation.
                  </span>
                </div>

                <Separator className="bg-slate-100 my-1" />

                {/* Emails Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                    Emails des approbateurs
                  </label>
                  <Input
                    type="text"
                    value={approverEmails}
                    onChange={(e) => setApproverEmails(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                    className="border-slate-200 rounded-xl text-xs font-semibold h-11 focus-visible:ring-amber-900"
                  />
                  <span className="text-[10px] text-slate-400 font-medium">
                    Séparez les différentes adresses par des virgules.
                  </span>
                </div>

                <Separator className="bg-slate-100 my-1" />

                {/* Roles Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                    Rôles autorisés à approuver
                  </label>
                  <div className="space-y-2.5 bg-slate-50/50 p-4 border border-slate-150 rounded-2xl">
                    {availableRoles.map((role) => (
                      <div key={role.value} className="flex items-center space-x-3">
                        <Checkbox
                          id={`role-${role.value}`}
                          checked={selectedRoles.includes(role.value)}
                          onCheckedChange={() => handleRoleToggle(role.value)}
                          className="border-slate-300 rounded-md focus-visible:ring-amber-900 data-[state=checked]:bg-amber-900 data-[state=checked]:border-amber-900"
                        />
                        <label
                          htmlFor={`role-${role.value}`}
                          className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                        >
                          {role.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs"
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={loading || saving}
              onClick={handleSave}
              className="bg-amber-900 hover:bg-amber-950 text-white shadow-md px-6 h-10 font-bold text-xs gap-2 flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


