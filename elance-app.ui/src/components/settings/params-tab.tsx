'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppVariableTable } from './app-variable-table';
import { DimensionTable } from './dimension-table';
import { CategoryAccordion } from './category-accordion';
import { BankTable } from './bank-table';
import { TransporterTable } from './transporter-table';
import { useAppVariables } from '@/hooks/use-app-variables';
import { useEnterprise } from '@/hooks/use-enterprise';
import { Percent, Ruler, Tags, Truck, Landmark, ShieldCheck } from 'lucide-react';

import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataImportDialog } from '@/components/shared/data-import-dialog';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { getBaseApiUrl } from '@/lib/axios';

export function ParamsTab() {
  const { data: enterprise } = useEnterprise();
  const { data: tva } = useAppVariables('Tva');
  const { data: rs } = useAppVariables('RS');
  const { data: taxes } = useAppVariables('Taxe');
  const { data: thicknesses } = useAppVariables('thickness');
  const { data: widths } = useAppVariables('width');
  const { data: lengths } = useAppVariables('Length');

  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getBaseApiUrl()}Reports/settings/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'exportation');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parametres_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export réussi', {
        description: 'Le fichier Excel a été téléchargé avec succès.'
      });
    } catch (error) {
      toast.error('Erreur', {
        description: 'Une erreur est survenue lors de l\'exportation des paramètres.'
      });
    }
  };

  const dimensions = React.useMemo(() => [
    ...(thicknesses?.map(t => ({ ...t, nature: 'thickness' })) || []),
    ...(widths?.map(w => ({ ...w, nature: 'width' })) || [])
  ], [thicknesses, widths]);

  return (
    <div className="space-y-10">
      <div className="flex justify-end gap-3 mb-4">
        <Button 
          onClick={() => setIsImportOpen(true)}
          variant="outline" 
          className="gap-2 bg-white text-corp-blue-900 border-corp-blue-100 hover:bg-corp-blue-50/50 hover:border-corp-blue-200"
        >
          <Upload className="w-4 h-4" /> Import / Export
        </Button>
      </div>
      <Tabs defaultValue="taxes" className="w-full">
        <TabsList className="bg-sand-50/50 p-1 rounded-2xl border border-corp-blue-50 mb-8 h-auto flex-wrap justify-start">
          <TabsTrigger value="taxes" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-corp-blue-900 data-[state=active]:shadow-sm font-bold gap-2">
            <Percent className="w-4 h-4" /> Taxes & TVA
          </TabsTrigger>
          {enterprise?.issalingwood !== false && (
            <TabsTrigger value="dimensions" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-corp-blue-900 data-[state=active]:shadow-sm font-bold gap-2">
              <Ruler className="w-4 h-4" /> Dimensions
            </TabsTrigger>
          )}
          <TabsTrigger value="categories" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-corp-blue-900 data-[state=active]:shadow-sm font-bold gap-2">
            <Tags className="w-4 h-4" /> Catégories
          </TabsTrigger>
          <TabsTrigger value="transporters" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-corp-blue-900 data-[state=active]:shadow-sm font-bold gap-2">
            <Truck className="w-4 h-4" /> Transporteurs
          </TabsTrigger>
          <TabsTrigger value="banks" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-corp-blue-900 data-[state=active]:shadow-sm font-bold gap-2">
            <Landmark className="w-4 h-4" /> Banques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="taxes" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-corp-blue-900 font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                TVA (%)
              </h4>
              <AppVariableTable nature="Tva" data={tva || []} />
            </div>
            <div className="space-y-4">
              <h4 className="text-corp-blue-900 font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                Retenue à la Source (%)
              </h4>
              <AppVariableTable nature="RS" data={rs || []} />
            </div>
            <div className="space-y-4 lg:col-span-2">
              <h4 className="text-corp-blue-900 font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                Autres Taxes (FODEC, etc.)
              </h4>
              <AppVariableTable nature="Taxe" data={taxes || []} />
            </div>
          </div>
        </TabsContent>

        {enterprise?.issalingwood !== false && (
          <TabsContent value="dimensions" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-corp-blue-900 font-bold">Épaisseurs & Largeurs (mm)</h4>
                <DimensionTable nature="Dimension" data={dimensions} />
              </div>
              <div className="space-y-4">
                <h4 className="text-corp-blue-900 font-bold">Longueurs (cm)</h4>
                <DimensionTable nature="Length" data={lengths || []} />
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="categories" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CategoryAccordion />
        </TabsContent>

        <TabsContent value="transporters" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <TransporterTable />
        </TabsContent>

        <TabsContent value="banks" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <BankTable />
        </TabsContent>
      </Tabs>

      <DataImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        type="settings"
        onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['app-variables'] })}
        onExportXlsx={handleExport}
      />
    </div>
  );
}

