import { Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProductionTab({ site }: { site: any }) {
  const cats = ['Gros oeuvre', 'Second oeuvre'];
  const productions = [
    { cat: 'Gros oeuvre', label: 'Fondations', sub: 'Semelles isolées', status: 'termine', start: '2025-01-10', end: '2025-01-25' },
    { cat: 'Gros oeuvre', label: 'Dalle RDC', sub: 'Coulage béton', status: 'en_cours', start: '2025-02-05', end: '' },
    { cat: 'Second oeuvre', label: 'Plomberie', sub: 'Encastrement', status: 'planifie', start: '2025-03-01', end: '' }
  ];

  return (
    <div className="flex flex-col gap-10">
      {cats.map((c, idx) => {
        const prods = productions.filter(p => p.cat === c);
        return (
          <div key={idx} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-sm bg-[#1a1a1a]" />
                <h3 className="text-lg font-bold text-[#1a1a1a] m-0">{c}</h3>
              </div>
              <Button className="rounded-lg font-semibold bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] transition-colors">
                <Plus className="w-4 h-4 mr-2" /> Ajouter
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {prods.map((p, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-black/5 shadow-sm rounded-xl gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-[#1a1a1a]">{p.label}</div>
                    <div className="text-xs text-[#888780] font-medium">{p.sub}</div>
                  </div>
                  <div className="w-[120px]">
                    <span className={`text-[0.75rem] font-bold px-3 py-1.5 rounded-md ${
                      p.status === 'termine' ? 'bg-[#f0fdf4] text-[#166534]' : 
                      p.status === 'en_cours' ? 'bg-[#e1f5ee] text-[#1d9e75]' : 
                      'bg-[#f0f0f0] text-[#888780]'
                    }`}>
                      {p.status === 'termine' ? 'Terminé' : p.status === 'en_cours' ? 'En cours' : 'Planifié'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#888780] w-[150px]">
                    {new Date(p.start).toLocaleDateString('fr-FR')} - {p.end ? new Date(p.end).toLocaleDateString('fr-FR') : '...'}
                  </div>
                  <Button variant="ghost" size="icon" className="bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] rounded-full shrink-0">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
