'use client';

import * as React from 'react';
import { useEnterprise, useUpdateEnterprise } from '@/hooks/use-enterprise';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Save, Loader2, History, AlertCircle } from 'lucide-react';

export function AuditTab() {
  const { data: enterprise, isLoading } = useEnterprise();
  const updateEnterprise = useUpdateEnterprise();
  
  const [retention, setRetention] = React.useState(12);

  React.useEffect(() => {
    if (enterprise) {
      setRetention(enterprise.auditRetentionMonths);
    }
  }, [enterprise]);

  const onSave = () => {
    updateEnterprise.mutate({
      auditRetentionMonths: retention
    });
  };

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-forest-600" />;

  return (
    <div className="space-y-12">
      <section className="grid lg:grid-cols-3 gap-8">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-forest-900 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-forest-50 text-forest-600">
              <Shield className="w-5 h-5" />
            </div>
            Sécurité & Audit
          </h3>
          <p className="text-[0.9rem] text-sand-400 font-medium leading-relaxed">
            Configurez les politiques de conservation des traces et des journaux d'activité.
          </p>
        </div>
        <Card className="lg:col-span-2 border-forest-100 rounded-xl shadow-sm bg-white overflow-hidden">
          <CardContent className="p-8 space-y-8">
            <div className="flex items-start gap-6 p-6 rounded-2xl bg-amber-50 border border-amber-100">
              <div className="p-2 bg-white rounded-xl shadow-sm text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-amber-900 font-bold">Important : Rétention des données</h4>
                <p className="text-amber-700/80 text-sm font-medium leading-relaxed">
                  Les journaux d'audit permettent de tracer chaque action effectuée sur le système. 
                  Une durée de rétention plus longue augmente la taille de la base de données mais garantit une traçabilité historique complète.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-md">
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-forest-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-forest-400" /> Durée de conservation
                </Label>
                <div className="flex items-center gap-4">
                  <Input 
                    type="number"
                    value={retention}
                    onChange={(e) => setRetention(parseInt(e.target.value))}
                    min={1}
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:bg-white focus:border-forest-600 font-bold text-lg w-32 pl-4"
                  />
                  <span className="text-forest-900 font-bold">Mois</span>
                </div>
                <p className="text-xs text-sand-400 font-medium mt-2 italic">
                  * Les données plus anciennes que cette période seront archivées ou supprimées.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-forest-50">
              <Button 
                onClick={onSave}
                disabled={updateEnterprise.isPending}
                className="bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20 gap-2 h-12 px-8 transition-all duration-300"
              >
                {updateEnterprise.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Enregistrer les paramètres
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

