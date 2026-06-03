'use client';

import React from 'react';
import { X, Calendar, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
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

  // Format date due to french format "17 juin 2026"
  const formattedDate = new Date(data.dueDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#0f121b]/80 backdrop-blur-md"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-[560px] bg-[#1c2233] border border-white/5 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-white tracking-wide">
                  Échéances du jour
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  {formattedDate}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 custom-scrollbar">
            {data.details && data.details.length > 0 ? (
              data.details.map((item, index) => {
                const supplierObj = suppliers.find(
                  (s) => s.name?.toLowerCase().trim() === item.supplierName?.toLowerCase().trim()
                );

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={item.paymentId || index}
                    className="relative bg-[#242b3d] rounded-xl flex overflow-hidden border border-white/5 shadow-md group"
                  >
                    {/* Cyan indicator line on the left edge */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-l-xl opacity-80" />

                    {/* Left Section: Details */}
                    <div className="flex-1 p-5 pl-6 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] font-medium text-slate-400 tracking-widest uppercase">
                            Fournisseur
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1 group-hover:text-cyan-100 transition-colors">
                            {item.supplierName}
                          </h4>
                        </div>
                        
                        {/* Status badge & Supplier Link */}
                        <div className="flex flex-col items-end gap-2">
                          {item.isPaidAtBank ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md px-1.5 py-0.5 uppercase">
                              <CheckCircle2 className="w-3 h-3" /> Payé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-1.5 py-0.5 uppercase">
                              <Clock className="w-3 h-3" /> En cours
                            </span>
                          )}
                          
                          {supplierObj && onSelectSupplier && (
                            <button
                              onClick={() => {
                                onSelectSupplier(supplierObj.id);
                                onClose();
                              }}
                              className="text-[9px] font-bold text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors uppercase tracking-wider"
                            >
                              Voir fiche
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 mt-5">
                        <div>
                          <span className="text-[9px] font-medium text-slate-400 tracking-widest uppercase">
                            Banque
                          </span>
                          <p className="text-[11px] font-semibold text-slate-200 mt-1">
                            {item.bank || '---'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] font-medium text-slate-400 tracking-widest uppercase">
                            N° Effet
                          </span>
                          <p className="text-[11px] font-semibold text-blue-400 mt-1 font-mono">
                            {item.instrumentNumber || '---'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Amount */}
                    <div className="w-[150px] bg-[#1e2436] p-5 flex flex-col items-end justify-center border-l border-white/5">
                      <span className="text-[9px] font-black text-blue-500 tracking-widest uppercase mb-1">
                        TND
                      </span>
                      <span className="text-lg font-black text-white tracking-tight font-mono">
                        {item.amount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-10">
                <p className="text-xs text-slate-400 font-medium">Aucun effet répertorié.</p>
              </div>
            )}
          </div>

          {/* Footer details */}
          <div className="px-6 py-5 flex items-end justify-between border-t border-white/5 bg-[#1c2233]">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-lg font-bold text-white leading-none">
                {data.instrumentCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Effet(s)
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase mb-1">
                Total
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono tracking-tight text-blue-400 leading-none">
                  {data.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] font-black text-blue-500 uppercase">TND</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
