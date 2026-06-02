import React, { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/use-auth-store';
import { useSites } from '@/hooks/use-enterprise';
import { useArticles } from '@/hooks/use-articles';
import { useStockAll, useStockBySite } from '@/hooks/use-stock';
import { useCreateInventory } from '@/hooks/use-inventory';
import { useAppVariables } from '@/hooks/use-app-variables';
import { AppVariable } from '@/types/article';
import { exportInventoryTemplate, parseInventoryImport, ExcelInventoryRow, ParseResult } from '@/lib/excel-inventory';
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
import { DocumentTypes, DocStatus } from '@/types/document';

interface ExcelInventoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExcelInventoryDialog({ isOpen, onClose }: ExcelInventoryDialogProps) {
  const { user } = useAuthStore();
  const { data: allSites = [] } = useSites();
  const { data: allArticles = [] } = useArticles();
  const { data: allLengths = [] } = useAppVariables('Length');
  const { mutate: createInventory, isPending: isCreating } = useCreateInventory();

  // Export State
  const [exportSiteId, setExportSiteId] = useState<string>(user?.defaultSiteId?.toString() || '');
  const [includeZeroStock, setIncludeZeroStock] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Import State
  const [importSiteId, setImportSiteId] = useState<string>(user?.defaultSiteId?.toString() || '');
  const [phase, setPhase] = useState<'upload' | 'loading' | 'preview'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // We need stocks for export. We'll fetch them on demand or use useStockBySite conditionally.
  const { data: currentSiteStocks = [], isLoading: isLoadingStocks } = useStockBySite(
    exportSiteId ? { id: parseInt(exportSiteId) } : null
  );

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

  const validateAndSetFile = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx') {
      toast.error('Format de fichier invalide. Veuillez importer un fichier .xlsx.');
      return;
    }
    setSelectedFile(file);
  };

  const handleExport = async () => {
    if (!exportSiteId) {
      toast.error('Veuillez sélectionner un site.');
      return;
    }
    if (isLoadingStocks) {
      toast.info('Chargement des stocks en cours...');
      return;
    }
    const site = allSites.find(s => s.id.toString() === exportSiteId);
    if (!site) return;

    setIsExporting(true);
    try {
      await exportInventoryTemplate(allArticles, currentSiteStocks, site, includeZeroStock);
      toast.success('Modèle téléchargé avec succès.');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la génération du fichier.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;
    setPhase('loading');
    const result = await parseInventoryImport(selectedFile);
    setParseResult(result);
    setPhase('preview');
  };

  const handleCreateInventory = () => {
    if (!parseResult || parseResult.rows.length === 0) {
      toast.error('Aucune donnée valide à importer.');
      return;
    }
    if (!importSiteId) {
      toast.error('Veuillez sélectionner un site.');
      return;
    }

    const groups = new Map<string, any>();

    parseResult.rows.forEach(row => {
      const key = `${row.articleId}_${row.packageReference}`;
      if (!groups.has(key)) {
        groups.set(key, {
          article: allArticles.find(a => a.id === row.articleId) || { id: row.articleId },
          packagereference: row.packageReference,
          quantity: row.isWood ? 0 : row.newStock,
          iswood: row.isWood,
          lisoflengths: []
        });
      }
      
      const group = groups.get(key);
      if (row.isWood && row.woodLengthsDetails) {
        const article = group.article as any;
        const thicknessVal = parseFloat(article?.thickness?.value?.toString().replace(',', '.') || '0');
        const widthVal = parseFloat(article?.width?.value?.toString().replace(',', '.') || '0');

        row.woodLengthsDetails.forEach(detail => {
          const lengthAppVar = allLengths.find((l: AppVariable) => l.name === detail.lengthName);
          if (lengthAppVar) {
            const lengthValue = parseFloat(lengthAppVar.value?.toString().replace(',', '.') || '0');
            const detailQuantity = detail.nbpieces * lengthValue * thicknessVal * widthVal;
            
            group.lisoflengths.push({
              length: lengthAppVar,
              nbpieces: detail.nbpieces,
              quantity: parseFloat(detailQuantity.toFixed(4))
            });
            group.quantity += detailQuantity;
          }
        });
      }
    });

    const merchandises = Array.from(groups.values());

    const payload = {
      type: DocumentTypes.inventory,
      docstatus: DocStatus.Created,
      sales_site: { id: parseInt(importSiteId) },
      description: `Inventaire importé via Excel - ${new Date().toLocaleDateString('fr-FR')}`,
      updatedbyid: parseInt(user?.id?.toString() || '1'),
      merchandises
    };

    createInventory(payload as any, {
      onSuccess: () => {
        handleResetAndClose();
      }
    });
  };

  const handleResetAndClose = () => {
    setSelectedFile(null);
    setParseResult(null);
    setPhase('upload');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleResetAndClose}>
      <DialogContent 
        showCloseButton={false} 
        className="w-full max-w-full sm:max-w-xl md:max-w-2xl p-0 overflow-hidden border-forest-100 shadow-2xl rounded-none sm:rounded-[32px] bg-white font-sans"
      >
        <DialogHeader className="p-6 bg-gradient-to-r from-forest-900 to-forest-800 text-white relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-forest-800 flex items-center justify-center border border-forest-700 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="font-heading text-xl font-bold">
                Import / Export Inventaire
              </DialogTitle>
              <p className="text-forest-300 text-xs mt-1">
                Générez un modèle Excel pour votre comptage, puis importez-le.
              </p>
            </div>
          </div>
          <button 
            onClick={handleResetAndClose}
            className="absolute right-6 top-6 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-6">
          <Tabs defaultValue="export" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-6 bg-stone-100 p-1 rounded-xl">
              <TabsTrigger value="export" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-forest-700 data-[state=active]:shadow-sm">
                1. Exporter le modèle
              </TabsTrigger>
              <TabsTrigger value="import" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-forest-700 data-[state=active]:shadow-sm">
                2. Importer le comptage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sélectionnez le site pour le comptage</Label>
                  <Select value={exportSiteId} onValueChange={(val) => setExportSiteId(val || '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un site...">
                        {allSites.find(s => s.id.toString() === exportSiteId)?.address || "Choisir un site..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allSites.map(site => (
                        <SelectItem key={site.id} value={site.id.toString()}>
                          {site.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="include-zeros" 
                    checked={includeZeroStock}
                    onCheckedChange={(c) => setIncludeZeroStock(!!c)}
                  />
                  <Label htmlFor="include-zeros" className="cursor-pointer font-normal text-stone-600">
                    Inclure les articles avec un stock de 0
                  </Label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-stone-100">
                <Button 
                  onClick={handleExport}
                  disabled={!exportSiteId || isExporting}
                  className="bg-forest-600 hover:bg-forest-700 text-white rounded-xl h-11 px-8"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Télécharger le modèle Excel
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-6">
              <AnimatePresence mode="wait">
                {phase === 'upload' && (
                  <motion.div
                    key="upload-phase"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label>Sélectionnez le site de destination</Label>
                      <Select value={importSiteId} onValueChange={(val) => setImportSiteId(val || '')}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choisir un site...">
                            {allSites.find(s => s.id.toString() === importSiteId)?.address || "Choisir un site..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {allSites.map(site => (
                            <SelectItem key={site.id} value={site.id.toString()}>
                              {site.address}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[160px]",
                        isDragging 
                          ? "border-forest-600 bg-forest-50/20 shadow-inner" 
                          : "border-stone-200 hover:border-forest-600 hover:bg-stone-50"
                      )}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".xlsx" 
                        className="hidden" 
                      />
                      {selectedFile ? (
                        <div className="flex flex-col items-center text-center space-y-2">
                          <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                          <p className="font-bold text-stone-900">{selectedFile.name}</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                            className="text-rose-500 h-8"
                          >
                            Retirer
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center space-y-2 text-stone-500">
                          <CloudUpload className="w-8 h-8" />
                          <p className="font-bold text-stone-900">Glissez-déposez le fichier rempli ici</p>
                          <p className="text-xs">ou cliquez pour parcourir (.xlsx)</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-stone-100">
                      <Button 
                        disabled={!selectedFile || !importSiteId}
                        onClick={handleProcessFile}
                        className="bg-forest-600 hover:bg-forest-700 text-white rounded-xl h-11 px-8"
                      >
                        Analyser le fichier
                      </Button>
                    </div>
                  </motion.div>
                )}

                {phase === 'loading' && (
                  <motion.div
                    key="loading-phase"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-12 gap-4"
                  >
                    <Loader2 className="w-8 h-8 text-forest-600 animate-spin" />
                    <p className="text-sm font-bold text-stone-600">Analyse en cours...</p>
                  </motion.div>
                )}

                {phase === 'preview' && parseResult && (
                  <motion.div
                    key="preview-phase"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center bg-stone-50 p-3 rounded-lg border border-stone-100">
                      <div className="text-sm font-bold text-stone-700">
                        <span className="text-emerald-600">{parseResult.rows.length}</span> lignes reconnues
                      </div>
                      {parseResult.errors.length > 0 && (
                        <div className="text-sm font-bold text-rose-600 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {parseResult.errors.length} erreurs
                        </div>
                      )}
                    </div>

                    {parseResult.errors.length > 0 && (
                      <div className="max-h-[100px] overflow-y-auto border border-rose-100 rounded-lg p-2 text-xs bg-rose-50 text-rose-700 space-y-1">
                        {parseResult.errors.map((e, i) => (
                          <div key={i}>Ligne {e.rowIndex}: {e.message}</div>
                        ))}
                      </div>
                    )}

                    <div className="border border-stone-200 rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 sticky top-0">
                          <tr>
                            <th className="p-2 font-bold text-stone-600">Référence</th>
                            <th className="p-2 font-bold text-stone-600">Colis</th>
                            <th className="p-2 font-bold text-stone-600">Ancien</th>
                            <th className="p-2 font-bold text-emerald-700">Nouveau / Détails</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {parseResult.rows.slice(0, 50).map((r, i) => (
                            <tr key={i} className="hover:bg-stone-50">
                              <td className="p-2 font-medium truncate max-w-[120px]" title={r.designation}>{r.reference}</td>
                              <td className="p-2">{r.packageReference}</td>
                              <td className="p-2 text-stone-500">{r.oldStock}</td>
                              <td className="p-2 font-bold text-emerald-600 bg-emerald-50/50">
                                {r.isWood 
                                  ? r.woodLengthsDetails?.filter(d => d.nbpieces > 0).map(d => `${d.nbpieces}/${d.lengthName}`).join(' - ') || '0'
                                  : r.newStock}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parseResult.rows.length > 50 && (
                        <div className="p-2 text-center text-xs text-stone-500 bg-stone-50">
                          ... et {parseResult.rows.length - 50} autres lignes
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                      <Button variant="outline" onClick={() => setPhase('upload')} className="rounded-xl h-11">
                        Retour
                      </Button>
                      <Button 
                        disabled={parseResult.rows.length === 0 || isCreating}
                        onClick={handleCreateInventory}
                        className="bg-forest-600 hover:bg-forest-700 text-white rounded-xl h-11 px-8"
                      >
                        {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Créer l'Inventaire
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
