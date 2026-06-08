import { Wrench, Truck, ShieldCheck, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function MagasinTab({ site }: { site: any }) {
  const tools = [{ name: 'Bétonnière 350L', loc: 'Zone A', qty: 2 }, { name: 'Grue à tour', loc: 'Centre', qty: 1 }];
  const vehicles = [{ plate: '234 TUN 5543', label: 'Camionnette Isuzu', driver: 'Mounir S.' }];

  return (
    <div className="flex flex-col gap-8">
      <Card className="bg-[#1a1a1a] text-white border-none rounded-2xl shadow-xl overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-[#2563eb]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">Responsable Magasin</span>
              <h3 className="text-xl font-bold m-0 mt-1">Ahmed Mansouri</h3>
              <span className="text-sm text-white/70 mt-1 block">📞 +216 22 334 455</span>
            </div>
          </div>
          <div className="flex gap-6 md:gap-10 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-10 w-full md:w-auto justify-center">
            <div className="text-center">
              <span className="block text-3xl font-extrabold text-[#2563eb]">{tools.length}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-white/50 mt-1 block">Outils</span>
            </div>
            <div className="text-center">
              <span className="block text-3xl font-extrabold text-[#2563eb]">{vehicles.length}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-white/50 mt-1 block">Véhicules</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-[#888780]" />
              <h3 className="text-lg font-bold text-[#1a1a1a] m-0">Outils fixes</h3>
            </div>
            <div className="flex flex-col gap-3">
              {tools.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-xl shadow-sm">
                  <div>
                    <div className="font-semibold text-[#1a1a1a]">{t.name}</div>
                    <div className="text-xs text-[#888780]">{t.loc}</div>
                  </div>
                  <div className="font-bold text-[#1a1a1a] bg-[#f0f0f0] px-3 py-1 rounded-full text-sm">× {t.qty}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-[#888780]" />
              <h3 className="text-lg font-bold text-[#1a1a1a] m-0">Véhicules assignés</h3>
            </div>
            <div className="flex flex-col gap-3">
              {vehicles.map((v, i) => (
                <Card key={i} className="border-black/5 shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xs font-bold text-[#888780] bg-[#f0f0f0] px-2 py-0.5 rounded w-fit mb-1">{v.plate}</div>
                        <h4 className="font-bold text-[#1a1a1a] m-0">{v.label}</h4>
                      </div>
                      <Truck className="w-5 h-5 text-[#2563eb]" />
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-black/5 pt-3">
                      <span className="text-[#888780]">Livreur</span>
                      <span className="font-semibold text-[#1a1a1a]">{v.driver}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
