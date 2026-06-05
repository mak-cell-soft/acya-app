'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { importService, ImportReport } from '@/services/components/import.service';
import { useAuthStore } from '@/store/use-auth-store';
import { 
  CloudUpload, 
  Download, 
  CheckCircle2, 
  XCircle, 
  FileSpreadsheet, 
  Loader2, 
  X, 
  AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * DataImportDialogProps Defines the inputs expected by the reusable import component.
 */
interface DataImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'customer' | 'provider' | 'article';
  onImportSuccess: () => void; // Hook for invalidating page-specific React Query cache on successful records creation
}

/**
 * DataImportDialog Component
 * 
 * A high-fidelity, premium modal allowing users to import client, supplier, or article data via Excel/CSV templates.
 * Styled with our forest-green theme matching the original WoodApp aesthetics.
 * Uses Framer Motion for rich phase transitions and file drag-over micro-animations.
 */
export function DataImportDialog({
  isOpen,
  onClose,
  type,
  onImportSuccess,
}: DataImportDialogProps) {
  // CENTRALIZED STATE MANAGEMENT
  // NOTE: Phase state controls the visual layout of our dialog
  const [phase, setPhase] = useState<'upload' | 'loading' | 'report'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AUTH STATE EXTRACTION
  // NOTE: Fetching the active user details from our global zustand store to attach to the request params.
  const { user } = useAuthStore();

  // LABELS AND CONFIG MAPPINGS
  // Maps our internal key types to human readable French labels matching the database entities.
  const labelMap = {
    customer: { plural: 'clients', singular: 'client' },
    provider: { plural: 'fournisseurs', singular: 'fournisseur' },
    article: { plural: 'articles', singular: 'article' },
  };

  const currentLabel = labelMap[type];

  // DRAG AND DROP HANDLERS
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  /**
   * Validates file type and size to prevent sending corrupt documents to our C# API endpoints.
   */
  const validateAndSetFile = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'csv') {
      toast.error('Format de fichier invalide. Veuillez importer un fichier .xlsx ou .csv.');
      return;
    }
    // Limit file size to 10MB to maintain responsive backend processing
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux. La limite est de 10 Mo.');
      return;
    }
    setSelectedFile(file);
  };

  // ACTIONS
  /**
   * Triggers the corresponding Excel download from the Next.js public directory
   */
  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    toast.info('Préparation du modèle...');
    const fileName = `template_${type === 'provider' ? 'provider' : type}.${format}`;
    const url = `/assets/templates/${fileName}`;
    window.open(url, '_blank');
  };

  /**
   * Dispatches the multipart import request to the backend.
   * C# API assumption: counterparts imports require the capitalized counterpart Type parameter ('CUSTOMER' | 'PROVIDER').
   */
  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier.');
      return;
    }

    if (!user || !user.id || !user.enterpriseId) {
      toast.error('Votre session est expirée ou invalide. Veuillez vous reconnecter.');
      return;
    }

    setPhase('loading');

    try {
      let resultReport: ImportReport;

      if (type === 'article') {
        resultReport = await importService.importArticles(
          selectedFile,
          user.id,
          user.enterpriseId
        );
      } else {
        // Mapping type to either 'CUSTOMER' or 'PROVIDER' uppercase string
        const counterpartType = type === 'customer' ? 'CUSTOMER' : 'PROVIDER';
        resultReport = await importService.importCounterParts(
          selectedFile,
          counterpartType,
          user.id,
          user.enterpriseId
        );
      }

      setReport(resultReport);
      setPhase('report');

      // Notify parent page if some records succeeded so they can refresh the table queries
      if (resultReport.successCount > 0) {
        onImportSuccess();
      }

      // Display summary toast based on status
      if (resultReport.successCount > 0 && resultReport.errorCount === 0) {
        toast.success(`${resultReport.successCount} ${currentLabel.plural} importés avec succès.`);
      } else if (resultReport.successCount > 0) {
        toast.warning(`${resultReport.successCount} importés, mais ${resultReport.errorCount} ligne(s) contiennent des erreurs.`);
      } else {
        toast.error('L\'importation a échoué. Veuillez vérifier les erreurs ci-dessous.');
      }
    } catch (err: any) {
      console.error('Import process failed:', err);
      toast.error('Une erreur technique s\'est produite lors de l\'importation.');
      setPhase('upload');
    }
  };

  /**
   * Resets all internal dialog states upon closure or completion.
   */
  const handleResetAndClose = () => {
    setSelectedFile(null);
    setReport(null);
    setPhase('upload');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleResetAndClose}>
      <DialogContent 
        showCloseButton={false} 
        className="w-full max-w-full sm:max-w-xl md:max-w-2xl p-0 overflow-hidden border-forest-100 shadow-2xl rounded-none sm:rounded-[32px] bg-white font-sans"
      >
        {/* PREMIUM FOREST GREEN HEADER BLOCK */}
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-forest-50 flex items-center justify-center border border-forest-100 text-emerald-600 font-bold text-xl shadow-inner">
              <CloudUpload className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                Importer des {currentLabel.plural}
              </DialogTitle>
              <p className="text-muted-foreground text-sm font-medium">
                Alimentez votre base de données avec des fichiers Excel ou CSV.
              </p>
            </div>
          </div>
          <button 
            onClick={handleResetAndClose}
            className="absolute right-6 top-6 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 hover:scale-105 transition-all text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-8">
          <AnimatePresence mode="wait">
            
            {/* PHASE 1: UPLOAD FORM */}
            {phase === 'upload' && (
              <motion.div
                key="upload-phase"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* STEP 1: MODÈLE DE TÉLÉCHARGEMENT */}
                <div className="bg-sand-50/50 p-6 rounded-2xl border border-sand-100 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-timber-100 text-timber-600 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-sm text-forest-900">Modèles recommandés</h4>
                      <p className="text-xs font-medium text-sand-400 mt-1">
                        Utilisez notre structure pour vous assurer de la bonne cohérence des colonnes (Noms, Codes, TVA, etc.).
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 pl-11">
                    <Button 
                      variant="outline" 
                      onClick={() => downloadTemplate('xlsx')}
                      className="rounded-xl h-10 border-forest-100 text-forest-600 font-bold hover:bg-forest-50 text-xs px-4"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                      Modèle Excel (.xlsx)
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => downloadTemplate('csv')}
                      className="rounded-xl h-10 border-forest-100 text-forest-600 font-bold hover:bg-forest-50 text-xs px-4"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2 text-blue-500" />
                      Modèle CSV (.csv)
                    </Button>
                  </div>
                </div>

                {/* STEP 2: DRAG & DROP ZONE */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-forest-800 block">
                    Fichier de données
                  </span>
                  
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden min-h-[180px]",
                      isDragging 
                        ? "border-forest-600 bg-forest-50/20 scale-[0.99] shadow-inner" 
                        : "border-forest-100 hover:border-forest-600 hover:bg-forest-50/10"
                    )}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".xlsx,.csv" 
                      className="hidden" 
                    />

                    {selectedFile ? (
                      <div className="flex flex-col items-center text-center space-y-3 animate-in fade-in duration-300">
                        <div className="w-14 h-14 rounded-2xl bg-forest-50 text-forest-600 flex items-center justify-center border border-forest-100 shadow-sm">
                          <FileSpreadsheet className="w-7 h-7 text-emerald-600 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-heading font-bold text-forest-900 max-w-[280px] truncate px-2">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-sand-400 font-mono">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Supprimer
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-sand-50 text-sand-400 flex items-center justify-center border border-sand-100">
                          <CloudUpload className="w-6 h-6 text-sand-400" />
                        </div>
                        <div>
                          <p className="font-heading font-bold text-forest-900">
                            Glissez-déposez votre fichier ici
                          </p>
                          <p className="text-xs font-medium text-sand-400 mt-1">
                            ou cliquez pour parcourir vos dossiers (.xlsx ou .csv)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-forest-50">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleResetAndClose}
                    className="rounded-xl h-11 border-forest-100 text-forest-600 font-bold hover:bg-forest-50 px-6"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="button"
                    disabled={!selectedFile}
                    onClick={handleImport}
                    className="rounded-xl h-11 bg-forest-600 hover:bg-forest-800 text-white font-bold px-8 shadow-lg shadow-forest-600/20 disabled:bg-sand-100 disabled:text-sand-400 disabled:shadow-none transition-all duration-300"
                  >
                    Lancer l'importation
                  </Button>
                </div>
              </motion.div>
            )}

            {/* PHASE 2: LOADING SPINNER */}
            {phase === 'loading' && (
              <motion.div
                key="loading-phase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 gap-4 text-center"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-forest-50 border-t-forest-600 animate-spin" />
                  <Loader2 className="w-6 h-6 text-forest-600 animate-spin absolute inset-0 m-auto" />
                </div>
                <div className="space-y-1 mt-2">
                  <h4 className="font-heading font-bold text-lg text-forest-900">Traitement de l'importation</h4>
                  <p className="text-sm font-medium text-sand-400 max-w-[320px]">
                    Analyse des colonnes, validation des contraintes métiers et persistance de vos {currentLabel.plural}...
                  </p>
                </div>
              </motion.div>
            )}

            {/* PHASE 3: REPORT SUMMARY */}
            {phase === 'report' && report && (
              <motion.div
                key="report-phase"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="text-center pb-4">
                  <h4 className="font-heading font-bold text-xl text-forest-900">Rapport d'importation</h4>
                  <p className="text-xs font-medium text-sand-400 mt-1">
                    Analyse finale de l'intégration du fichier.
                  </p>
                </div>

                {/* STATS HIGHLIGHT */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-emerald-700 tracking-tight leading-none">
                        {report.successCount}
                      </div>
                      <div className="text-[0.65rem] font-bold text-emerald-600 uppercase tracking-widest mt-1">
                        Réussis
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "p-5 rounded-2xl flex items-center gap-4 border transition-colors",
                    report.errorCount > 0 
                      ? "bg-rose-50 border-rose-100" 
                      : "bg-sand-50 border-sand-100"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      report.errorCount > 0 
                        ? "bg-rose-500/10 text-rose-600" 
                        : "bg-sand-100 text-sand-400"
                    )}>
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={cn(
                        "text-2xl font-black tracking-tight leading-none",
                        report.errorCount > 0 ? "text-rose-700" : "text-sand-600"
                      )}>
                        {report.errorCount}
                      </div>
                      <div className={cn(
                        "text-[0.65rem] font-bold uppercase tracking-widest mt-1",
                        report.errorCount > 0 ? "text-rose-600" : "text-sand-400"
                      )}>
                        Échecs
                      </div>
                    </div>
                  </div>
                </div>

                {/* DETAILED ERRORS LIST (IF ANY) */}
                {report.errorCount > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider pl-1">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      Détails des anomalies ({report.errorCount})
                    </div>
                    
                    <div className="border border-rose-100 rounded-2xl overflow-hidden bg-rose-50/10 max-h-[220px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-rose-50/50 border-b border-rose-100 font-bold text-rose-700">
                            <th className="py-2.5 px-4 font-mono text-[0.65rem] w-20">Ligne</th>
                            <th className="py-2.5 px-4">Description de l'erreur</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100/50 font-medium">
                          {report.errors.map((err, idx) => (
                            <tr key={idx} className="hover:bg-rose-50/30 text-rose-900 transition-colors">
                              <td className="py-2.5 px-4 font-mono text-rose-600">L{err.rowIndex}</td>
                              <td className="py-2.5 px-4 text-xs font-sans leading-relaxed">{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* FOOTER ACTIONS */}
                <div className="flex items-center justify-end pt-6 border-t border-forest-50">
                  <Button 
                    type="button"
                    onClick={handleResetAndClose}
                    className="rounded-xl h-11 bg-forest-600 hover:bg-forest-800 text-white font-bold px-8 shadow-lg shadow-forest-600/20"
                  >
                    Terminer
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
