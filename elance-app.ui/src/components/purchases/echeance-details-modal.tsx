'use client';

import React from 'react';
import { X, Calendar, Landmark, Ticket, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupplierEcheanceDto } from '@/types/payment';
import { motion, AnimatePresence } from 'framer-motion';

interface EcheanceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SupplierEcheanceDto | null;
  suppliers?: any[];
  onSelectSupplier?: (supplierId: number) => void;
}

export function EcheanceDetailsModal({
  isOpen,
  onClose,
  data,
  suppliers = [],
  onSelectSupplier
}: EcheanceDetailsModalProps) {
  if (!isOpen || !data) return null;

  // Format date due to french format "19 Mai 2026"
  const formattedDate = new Date(data.dueDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop glassmorphism overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 22 }}
          className="relative w-full max-w-lg bg-white/95 border border-slate-100 rounded-[28px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] backdrop-blur-md"
        >
          {/* Top colored accent line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />

          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100/80 flex items-center justify-between bg-white/40">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100/50 flex items-center justify-center text-amber-600 shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                  Échéances du jour
                </h2>
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">
                  {formattedDate}
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 custom-scrollbar">
            <div className="space-y-3">
              {data.details && data.details.length > 0 ? (
                data.details.map((item, index) => {
                  // Attempt lookup of supplier object by name to allow fast redirection
                  const supplierObj = suppliers.find(
                    (s) => s.name?.toLowerCase().trim() === item.supplierName?.toLowerCase().trim()
                  );

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={item.paymentId || index}
                      className="group relative bg-white border border-slate-150 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                    >
                      {/* Hover Glow effect */}
                      <div className="absolute inset-0 bg-amber-50/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 pointer-events-none" />

                      <div className="space-y-2 z-10 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                              Fournisseur
                            </span>
                            <h4 className="text-xs font-bold text-slate-800 group-hover:text-amber-800 transition-colors">
                              {item.supplierName}
                            </h4>
                          </div>
                          <div className="sm:hidden">
                            {item.isPaidAtBank ? (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5 uppercase">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Payé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-1.5 py-0.5 uppercase">
                                <Clock className="w-2.5 h-2.5" /> En cours
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5">
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                            <Landmark className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.bank || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold font-mono">
                            <Ticket className="w-3.5 h-3.5 text-slate-400" />
                            <span>N° {item.instrumentNumber}</span>
                          </div>
                          {item.documentNumber && (
                            <span className="text-[9px] text-amber-800 font-black font-mono bg-amber-50 border border-amber-100/50 px-2 py-0.5 rounded-md">
                              Facture: {item.documentNumber}
                            </span>
                          )}
                        </div>

                        {supplierObj && onSelectSupplier && (
                          <div className="pt-1">
                            <Button
                              onClick={() => {
                                onSelectSupplier(supplierObj.id);
                                onClose();
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[9px] font-black tracking-wider uppercase border border-slate-100 hover:border-amber-200 text-slate-550 hover:text-amber-800 hover:bg-amber-50/50 rounded-lg px-2 shadow-2xs gap-1"
                            >
                              Fiche Fournisseur
                              <ArrowRight className="w-3 h-3 text-amber-500" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="text-right z-10 flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                        <div className="hidden sm:block">
                          {item.isPaidAtBank ? (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5 uppercase">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Payé en Banque
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-1.5 py-0.5 uppercase">
                              <Clock className="w-2.5 h-2.5" /> En cours
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2 inline-flex flex-col items-end group-hover:bg-amber-50/20 group-hover:border-amber-100 transition-all ml-auto sm:ml-0">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Montant
                          </span>
                          <span className="text-[13px] font-black text-slate-800 font-mono mt-0.5 tracking-tight group-hover:text-amber-700">
                            {item.amount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">TND</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-400 font-medium">Aucun effet répertorié.</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer details */}
          <div className="px-6 py-4.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-200/50 flex items-center justify-center text-slate-600 font-mono text-[11px] font-bold">
                {data.instrumentCount}
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Effet(s)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Total
              </span>
              <div className="bg-slate-900 text-white rounded-xl px-4 py-2 flex items-baseline gap-1 shadow-sm border border-slate-800">
                <span className="text-[13px] font-black font-mono tracking-tight text-amber-300">
                  {data.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">TND</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
