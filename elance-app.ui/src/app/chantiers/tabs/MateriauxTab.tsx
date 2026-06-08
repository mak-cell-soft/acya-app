import { AlertTriangle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MateriauxTab({ site }: { site: any }) {
  const materials = [
    { name: 'Ciment CEM II', cat: 'Gros oeuvre', qty: 15, unit: 'Tonnes', min: 20 },
    { name: 'Sable', cat: 'Gros oeuvre', qty: 40, unit: 'M3', min: 10 },
  ];
  
  const consumables = [
    { name: 'Gants de protection', qty: 50, unit: 'paires', min: 20 },
    { name: 'Disques diamant', qty: 2, unit: 'pcs', min: 5 }
  ];

  return (
    <div className="flex flex-col gap-10">
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#1a1a1a] m-0">Matériaux principaux</h3>
          <Button className="bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] font-semibold rounded-xl">
            Réapprovisionner
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {materials.map((m, i) => {
            const isLow = m.qty < m.min;
            const pct = Math.min(100, (m.qty / (m.min * 2)) * 100);
            return (
              <div key={i} className="p-5 bg-white border border-black/5 rounded-2xl shadow-sm relative overflow-hidden">
                {isLow && <div className="absolute top-0 left-0 w-full h-1 bg-[#e24b4a]" />}
                <div className="flex justify-between items-start mb-4 mt-1">
                  <div>
                    <h4 className="font-bold text-[#1a1a1a] m-0">{m.name}</h4>
                    <span className="text-xs text-[#888780] font-medium">{m.cat}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-[#1a1a1a] leading-none">{m.qty}</span>
                    <span className="text-xs text-[#888780] font-bold ml-1">{m.unit}</span>
                  </div>
                </div>
                <div className="w-full bg-[#f0f0f0] h-2 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full ${isLow ? 'bg-[#e24b4a]' : 'bg-[#639922]'}`} style={{ width: `${pct}%` }} />
                </div>
                {isLow && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#e24b4a]">
                    <AlertTriangle className="w-3.5 h-3.5" /> Stock critique (&lt; {m.min})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-[#1a1a1a] m-0">Consommables</h3>
        </div>
        <div className="flex flex-col gap-3">
          {consumables.map((c, i) => {
            const isLow = c.qty < c.min;
            return (
              <div key={i} className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isLow ? 'bg-[#e24b4a] animate-pulse' : 'bg-[#639922]'}`} />
                  <span className="font-semibold text-[#1a1a1a]">{c.name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-sm">
                    <span className="font-bold text-[#1a1a1a]">{c.qty}</span> <span className="text-[#888780]">{c.unit}</span>
                  </div>
                  <div className="text-xs text-[#888780] hidden sm:block">Seuil: {c.min}</div>
                  <Button variant="ghost" size="icon" className="bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] rounded-full">
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
