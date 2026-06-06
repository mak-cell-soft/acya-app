'use client';

import * as React from 'react';
import { useEnterprise, useUpdateEnterprise } from '@/hooks/use-enterprise';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DOCUMENT_TYPES } from '@/lib/constants/settings';
import { Hash, Calendar, Save, Loader2, FileText } from 'lucide-react';
import { DocumentNumberingConfig } from '@/types/settings';

export function NumberingTab() {
  const { data: enterprise, isLoading } = useEnterprise();
  const updateEnterprise = useUpdateEnterprise();
  
  const [config, setConfig] = React.useState<DocumentNumberingConfig>({
    prefixes: {},
    yearFormat: 2,
    incrementLength: 3
  });

  React.useEffect(() => {
    if (enterprise?.documentNumberingConfig) {
      try {
        const parsed = JSON.parse(enterprise.documentNumberingConfig);
        setConfig(parsed);
      } catch (e) {
        console.error('Failed to parse numbering config', e);
      }
    }
  }, [enterprise]);

  const handlePrefixChange = (id: number, value: string) => {
    setConfig({
      ...config,
      prefixes: { ...config.prefixes, [id]: value }
    });
  };

  const onSave = () => {
    updateEnterprise.mutate({
      documentNumberingConfig: JSON.stringify(config)
    });
  };

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-corp-blue-600" />;

  return (
    <div className="space-y-12">
      <section className="grid lg:grid-cols-3 gap-8">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-corp-blue-900 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-corp-blue-50 text-corp-blue-600">
              <Hash className="w-5 h-5" />
            </div>
            Format de Numérotation
          </h3>
          <p className="text-[0.9rem] text-sand-400 font-medium leading-relaxed">
            Définissez la structure globale de vos références documentaires.
          </p>
        </div>
        <Card className="lg:col-span-2 border-corp-blue-100 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-corp-blue-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-corp-blue-400" /> Format de l'Année
              </Label>
              <Select 
                value={(config.yearFormat || 2).toString()} 
                onValueChange={(val) => setConfig({ ...config, yearFormat: parseInt(val || '2') })}
              >
                <SelectTrigger className="h-12 rounded-xl bg-sand-50 border-corp-blue-100 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">YY (ex: 24)</SelectItem>
                  <SelectItem value="4">YYYY (ex: 2024)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-corp-blue-900">Longueur de l'incrément</Label>
              <Select 
                value={(config.incrementLength || 3).toString()} 
                onValueChange={(val) => setConfig({ ...config, incrementLength: parseInt(val || '3') })}
              >
                <SelectTrigger className="h-12 rounded-xl bg-sand-50 border-corp-blue-100 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 chiffres (01)</SelectItem>
                  <SelectItem value="3">3 chiffres (001)</SelectItem>
                  <SelectItem value="4">4 chiffres (0001)</SelectItem>
                  <SelectItem value="5">5 chiffres (00001)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="h-px bg-corp-blue-50" />

      <section className="grid lg:grid-cols-3 gap-8">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-corp-blue-900 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-corp-blue-50 text-corp-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            Préfixes des Documents
          </h3>
          <p className="text-[0.9rem] text-sand-400 font-medium leading-relaxed">
            Personnalisez les préfixes pour chaque type de document (Ventes, Achats, Stock).
          </p>
        </div>
        <Card className="lg:col-span-2 border-corp-blue-100 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {DOCUMENT_TYPES.map((doc) => (
                <div key={doc.id} className="space-y-2">
                  <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">{doc.name}</Label>
                  <div className="relative group">
                    <Input 
                      value={config.prefixes[doc.id] || ''} 
                      onChange={(e) => handlePrefixChange(doc.id, e.target.value.toUpperCase())}
                      placeholder="PRÉFIXE"
                      className="h-11 rounded-xl bg-sand-50/50 border-corp-blue-100 focus:bg-white focus:border-corp-blue-600 transition-all font-bold tracking-widest pl-4"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-corp-blue-200 group-focus-within:text-corp-blue-400">
                      -{config.yearFormat === 2 ? '24' : '2024'}-001
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-10">
              <Button 
                onClick={onSave}
                disabled={updateEnterprise.isPending}
                className="bg-corp-blue-600 text-white hover:bg-corp-blue-800 font-bold shadow-lg shadow-corp-blue-600/20 gap-2 h-12 px-8 transition-all duration-300"
              >
                {updateEnterprise.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Enregistrer la configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

