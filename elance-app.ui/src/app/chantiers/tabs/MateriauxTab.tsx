import React, { useState } from 'react';
import { AlertTriangle, Plus, Layers, ClipboardCheck, ArrowDownCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChantierDetail } from '@/types/chantier';
import { useAddMaterialRequirement, useLogMaterialConsumption } from '@/hooks/use-chantiers';

interface MateriauxTabProps {
  site: ChantierDetail;
}

export function MateriauxTab({ site }: MateriauxTabProps) {
  const [isAddReqOpen, setIsAddReqOpen] = useState(false);
  const [merchandiseId, setMerchandiseId] = useState<number>(0);
  const [category, setCategory] = useState('Gros œuvre');
  const [materialType, setMaterialType] = useState('Principal');
  const [requiredQty, setRequiredQty] = useState<number>(0);
  const [unit, setUnit] = useState('Tonnes');
  const [minimumQty, setMinimumQty] = useState<number>(0);

  const [isLogConsumptionOpen, setIsLogConsumptionOpen] = useState(false);
  const [consumeMerchandiseId, setConsumeMerchandiseId] = useState<number>(0);
  const [consumedQty, setConsumedQty] = useState<number>(0);
  const [consumeNotes, setConsumeNotes] = useState('');

  const addRequirement = useAddMaterialRequirement(site.id);
  const logConsumption = useLogMaterialConsumption(site.id);

  const requirements = site.materialRequirements || [];
  const principals = requirements.filter(r => r.materialType === 'Principal');
  const consumables = requirements.filter(r => r.materialType === 'Consumable');

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (merchandiseId <= 0 || requiredQty <= 0) return;

    await addRequirement.mutateAsync({
      merchandiseId: Number(merchandiseId),
      category,
      materialType,
      requiredQty: Number(requiredQty),
      unit,
      minimumQty: Number(minimumQty)
    });

    setIsAddReqOpen(false);
    setMerchandiseId(0);
    setRequiredQty(0);
  };

  const handleLogConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (consumeMerchandiseId <= 0 || consumedQty <= 0) return;

    const targetReq = requirements.find(r => r.merchandiseId === consumeMerchandiseId);

    await logConsumption.mutateAsync({
      merchandiseId: consumeMerchandiseId,
      consumedQty: Number(consumedQty),
      unit: targetReq?.unit || 'Unité',
      notes: consumeNotes.trim() || undefined
    });

    setIsLogConsumptionOpen(false);
    setConsumedQty(0);
    setConsumeNotes('');
  };

  return (
    <div className="flex flex-col gap-10 font-['Outfit',sans-serif]">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl border border-black/5 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1a1a1a] m-0">Gestion & Consommation des Matériaux</h3>
            <span className="text-xs text-[#888780]">Suivi dédié (Option C) sans impact sur le moteur de stock principal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsLogConsumptionOpen(true)}
            className="rounded-xl text-xs font-bold border-black/10 hover:bg-[#f8f9fa]"
          >
            <ArrowDownCircle className="w-4 h-4 mr-1.5 text-[#2563eb]" /> Enregistrer conso
          </Button>
          <Button
            onClick={() => setIsAddReqOpen(true)}
            className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold rounded-xl text-xs px-4"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Déclarer un besoin
          </Button>
        </div>
      </div>

      {/* Matériaux principaux */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-lg font-bold text-[#1a1a1a] m-0">Matériaux principaux</h4>
          <span className="text-xs font-semibold text-[#888780]">{principals.length} article(s)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {principals.map((m) => {
            const pctRemaining = m.requiredQty > 0 ? Math.min(100, Math.round((m.remainingQty / m.requiredQty) * 100)) : 0;
            return (
              <div
                key={m.id}
                className="p-5 bg-white border border-black/5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between"
              >
                {m.isLowStock && <div className="absolute top-0 left-0 w-full h-1 bg-[#e24b4a]" />}
                <div>
                  <div className="flex justify-between items-start mb-3 mt-1">
                    <div>
                      <h5 className="font-bold text-[#1a1a1a] text-base m-0">{m.merchandiseDesignation || m.merchandiseRef}</h5>
                      <span className="text-xs text-[#888780] font-medium">{m.category} · Réf: {m.merchandiseRef}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-[#1a1a1a] leading-none">{m.remainingQty}</span>
                      <span className="text-xs text-[#888780] font-bold ml-1">{m.unit}</span>
                      <span className="block text-[0.7rem] text-[#888780] mt-0.5">restants</span>
                    </div>
                  </div>

                  <div className="w-full bg-[#f0f0f0] h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${m.isLowStock ? 'bg-[#e24b4a]' : 'bg-[#639922]'}`}
                      style={{ width: `${pctRemaining}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[0.75rem] text-[#888780] mb-2 font-medium">
                    <span>Conso: {m.consumedQty} {m.unit}</span>
                    <span>Total prévu: {m.requiredQty} {m.unit}</span>
                  </div>
                </div>

                {m.isLowStock && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#e24b4a] bg-[#fef2f2] p-2 rounded-xl mt-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Seuil d'alerte atteint (&lt; {m.minimumQty} {m.unit})
                  </div>
                )}
              </div>
            );
          })}

          {principals.length === 0 && (
            <div className="col-span-full p-8 text-center border border-dashed border-black/10 rounded-2xl text-[#888780] font-medium text-xs bg-white">
              Aucun besoin en matériau principal enregistré. Cliquez sur « Déclarer un besoin ».
            </div>
          )}
        </div>
      </section>

      {/* Consommables */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-lg font-bold text-[#1a1a1a] m-0">Consommables & Outillage léger</h4>
          <span className="text-xs font-semibold text-[#888780]">{consumables.length} article(s)</span>
        </div>

        <div className="flex flex-col gap-3">
          {consumables.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${c.isLowStock ? 'bg-[#e24b4a] animate-pulse' : 'bg-[#639922]'}`} />
                <div>
                  <span className="font-bold text-[#1a1a1a] text-sm block">{c.merchandiseDesignation || c.merchandiseRef}</span>
                  <span className="text-xs text-[#888780]">Réf: {c.merchandiseRef}</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-sm">
                  <span className="font-extrabold text-[#1a1a1a]">{c.remainingQty}</span> <span className="text-[#888780] font-medium">{c.unit}</span>
                </div>
                <div className="text-xs text-[#888780] hidden sm:block">Seuil min: {c.minimumQty} {c.unit}</div>
              </div>
            </div>
          ))}

          {consumables.length === 0 && (
            <div className="p-6 text-center border border-dashed border-black/10 rounded-xl text-[#888780] font-medium text-xs bg-white">
              Aucun consommable répertorié pour ce chantier.
            </div>
          )}
        </div>
      </section>

      {/* Modal: Déclarer un besoin */}
      <Dialog open={isAddReqOpen} onOpenChange={setIsAddReqOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl font-['Outfit',sans-serif]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Déclarer un besoin matériel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRequirement} className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">ID Article (Catalogue Marchandises)</label>
              <Input
                type="number"
                placeholder="Ex: 5"
                value={merchandiseId || ''}
                onChange={(e) => setMerchandiseId(Number(e.target.value))}
                required
                className="rounded-xl"
              />
              <span className="text-[0.7rem] text-[#888780] mt-1 block">ID de l'article dans le catalogue de marchandise ACYA.</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Type</label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full h-10 px-3 border border-black/10 rounded-xl text-sm font-medium bg-white"
                >
                  <option value="Principal">Principal</option>
                  <option value="Consumable">Consommable</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Catégorie</label>
                <Input
                  type="text"
                  placeholder="Gros œuvre, Finition..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Quantité</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 50"
                  value={requiredQty || ''}
                  onChange={(e) => setRequiredQty(Number(e.target.value))}
                  required
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Unité</label>
                <Input
                  type="text"
                  placeholder="Tonnes, M3..."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Seuil Min.</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 10"
                  value={minimumQty || ''}
                  onChange={(e) => setMinimumQty(Number(e.target.value))}
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddReqOpen(false)} className="rounded-xl text-xs font-semibold">
                Annuler
              </Button>
              <Button type="submit" disabled={addRequirement.isPending} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold">
                {addRequirement.isPending ? 'Enregistrement...' : 'Valider'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Enregistrer une consommation */}
      <Dialog open={isLogConsumptionOpen} onOpenChange={setIsLogConsumptionOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl font-['Outfit',sans-serif]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Enregistrer une consommation de matériau</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogConsumption} className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Article concerné</label>
              <select
                value={consumeMerchandiseId}
                onChange={(e) => setConsumeMerchandiseId(Number(e.target.value))}
                className="w-full h-10 px-3 border border-black/10 rounded-xl text-sm font-medium bg-white"
                required
              >
                <option value={0}>Sélectionner un article...</option>
                {requirements.map(r => (
                  <option key={r.id} value={r.merchandiseId}>
                    {r.merchandiseDesignation || r.merchandiseRef} (Reste: {r.remainingQty} {r.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Quantité consommée</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 5"
                value={consumedQty || ''}
                onChange={(e) => setConsumedQty(Number(e.target.value))}
                required
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Notes ou référence du bon</label>
              <Input
                type="text"
                placeholder="Ex: Coulage dalle niveau 1, BL 8943"
                value={consumeNotes}
                onChange={(e) => setConsumeNotes(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsLogConsumptionOpen(false)} className="rounded-xl text-xs font-semibold">
                Annuler
              </Button>
              <Button type="submit" disabled={logConsumption.isPending} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold">
                {logConsumption.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
