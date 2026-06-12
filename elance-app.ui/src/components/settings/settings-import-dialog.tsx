'use client';

import * as React from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ImportReport {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    rowIndex: number;
    message: string;
  }>;
}

export function SettingsImportDialog() {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [report, setReport] = React.useState<ImportReport | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setReport(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsUploading(true);
    setReport(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}Imports/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'importation');
      }

      const data = await response.json();
      setReport(data);

      if (data.errorCount === 0) {
        toast.success('Importation réussie', {
          description: `${data.successCount} paramètres ont été importés avec succès.`
        });
      } else {
        toast.warning('Importation partielle', {
          description: `${data.successCount} succès, ${data.errorCount} erreurs.`
        });
      }
    } catch (error: any) {
      toast.error('Erreur', {
        description: error.message || 'Une erreur est survenue lors de l\'importation.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setFile(null); setReport(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-white text-corp-blue-900 border-corp-blue-100 hover:bg-corp-blue-50/50 hover:border-corp-blue-200">
          <Upload className="w-4 h-4" />
          Importer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importer les Paramètres</DialogTitle>
          <DialogDescription>
            Importez vos taxes, dimensions, catégories, transporteurs et banques depuis un fichier Excel.
            Les données existantes seront mises à jour et les nouvelles seront ajoutées.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {!report ? (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".xlsx"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer gap-4 w-full"
              >
                <div className="w-12 h-12 rounded-full bg-corp-blue-50 flex items-center justify-center">
                  <FileUp className="w-6 h-6 text-corp-blue-600" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-slate-900">
                    {file ? file.name : "Cliquez pour sélectionner"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Fichiers Excel (.xlsx) uniquement
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${report.errorCount === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {report.errorCount === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Bilan de l'import</p>
                    <p className="text-sm text-slate-500">
                      {report.successCount} lignes importées avec succès
                    </p>
                  </div>
                </div>
              </div>

              {report.errors?.length > 0 && (
                <div className="border border-red-100 rounded-lg overflow-hidden bg-white">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex items-center justify-between">
                    <span className="text-sm font-medium text-red-900">Erreurs rencontrées ({report.errorCount})</span>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-4 space-y-3">
                    {report.errors.map((error, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <span className="font-medium text-red-900 min-w-[60px]">
                          Ligne {error.rowIndex}
                        </span>
                        <span className="text-slate-600">{error.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {report ? "Fermer" : "Annuler"}
          </Button>
          {!report && (
            <Button
              className="bg-corp-blue-600 hover:bg-corp-blue-700 text-white"
              disabled={!file || isUploading}
              onClick={handleImport}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importation...
                </>
              ) : (
                "Lancer l'importation"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
