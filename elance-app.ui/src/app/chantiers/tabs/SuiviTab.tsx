import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SuiviTab({ site }: { site: any }) {
  const timeline = [
    { date: '2025-01-10', title: 'Ouverture de chantier', desc: 'Installation de chantier terminée.', status: 'done' },
    { date: '2025-02-05', title: 'Fondations validées', desc: 'Validation par le bureau de contrôle.', status: 'done' },
    { date: '2025-03-01', title: 'Coulage Dalle RDC', desc: 'En attente de coulage.', status: 'pending' },
  ];

  const trades = [
    { label: 'Gros oeuvre', val: 65, color: '#1a1a1a' },
    { label: 'Plomberie', val: 20, color: '#2563eb' },
    { label: 'Électricité', val: 10, color: '#639922' },
  ];

  const alerts = [
    { type: 'critical', msg: 'Retard de livraison acier de 3 jours.' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Timeline Column */}
      <div className="lg:col-span-7">
        <Card className="border-black/5 shadow-sm rounded-2xl h-full">
          <CardHeader className="border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">Cycle de vie du chantier</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col">
              {timeline.map((ev, i) => (
                <div key={i} className="flex gap-4 relative pb-8 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-[3px] z-10 bg-white ${ev.status === 'done' ? 'border-[#639922]' : 'border-[#f0f0f0]'}`} />
                    {i < timeline.length - 1 && <div className="w-[2px] h-full bg-[#f0f0f0] absolute top-4 left-[7px]" />}
                  </div>
                  <div className="-mt-1">
                    <div className="text-xs font-bold text-[#888780] mb-1">{new Date(ev.date).toLocaleDateString('fr-FR')}</div>
                    <div className="font-bold text-[#1a1a1a] text-sm">{ev.title}</div>
                    <div className="text-sm text-[#888780] mt-1">{ev.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-5 flex flex-col gap-8">
        <Card className="border-black/5 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">Avancement par corps de métier</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-5">
              {trades.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-semibold text-[#1a1a1a]">{t.label}</span>
                    <span className="text-xs font-bold text-[#888780]">{t.val}%</span>
                  </div>
                  <div className="w-full bg-[#f0f0f0] h-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${t.val}%`, backgroundColor: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-black/5 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">Alertes & Vigilance</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3">
              {alerts.length > 0 ? alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${a.type === 'critical' ? 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]' : 'bg-[#fffbeb] border-[#fde68a] text-[#d97706]'}`}>
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">{a.msg}</span>
                </div>
              )) : (
                <div className="flex items-center gap-2 text-[#639922] font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" /> Aucune alerte en cours
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
