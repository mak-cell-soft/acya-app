'use client';

import React, { useState, useMemo } from 'react';
import { AlertTriangle, Plus, Layers, ClipboardCheck, ArrowDownCircle, Search, Check, Loader2, X, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChantierDetail } from '@/types/chantier';
import { useAddMaterialRequirement, useLogMaterialConsumption } from '@/hooks/use-chantiers';
import { useArticles } from '@/hooks/use-articles';
import { Article } from '@/types/article';
import { cn } from '@/lib/utils';

interface MateriauxTabProps {
  site: ChantierDetail;
}

export function MateriauxTab({ site }: MateriauxTabProps) {
  const [isAddReqOpen, setIsAddReqOpen] = useState(false);
  const [merchandiseId, setMerchandiseId] = useState<number | null>(null);
  const [searchArticle, setSearchArticle] = useState('');
  const [category, setCategory] = useState('Gros œuvre');
  const [materialType, setMaterialType] = useState('Principal');
  const [requiredQty, setRequiredQty] = useState<number>(0);
  const [unit, setUnit] = useState('Tonnes');
  const [minimumQty, setMinimumQty] = useState<number>(0);

  const [isLogConsumptionOpen, setIsLogConsumptionOpen] = useState(false);
  const [consumeMerchandiseId, setConsumeMerchandiseId] = useState<number>(0);
  const [consumedQty, setConsumedQty] = useState<number>(0);
  const [consumeNotes, setConsumeNotes] = useState('');

  const { data: articles = [], isLoading: isArticlesLoading } = useArticles();
  const addRequirement = useAddMaterialRequirement(site.id);
  const logConsumption = useLogMaterialConsumption(site.id);

  const requirements = site.materialRequirements || [];
  const principals = requirements.filter(r => r.materialType === 'Principal');
  const consumables = requirements.filter(r => r.materialType === 'Consumable');

  // Filter articles by search input
  const filteredArticles = useMemo(() => {
    const q = searchArticle.toLowerCase().trim();
    if (!q) return articles;
    return articles.filter(a => {
      const ref = (a.reference || '').toLowerCase();
      const desc = (a.description || '').toLowerCase();
      return ref.includes(q) || desc.includes(q);
    });
  }, [articles, searchArticle]);

  const handleOpenAddModal = () => {
    setMerchandiseId(null);
    setSearchArticle('');
    setRequiredQty(0);
    setMinimumQty(0);
    setCategory('Gros œuvre');
    setMaterialType('Principal');
    setUnit('Tonnes');
    setIsAddReqOpen(true);
  };

  const handleSelectArticle = (article: Article) => {
    setMerchandiseId(article.id);
    if (article.unit) {
      setUnit(article.unit);
    }
    if (article.iswood) {
      setCategory('Bois & Charpente');
    }
    if (article.minquantity && article.minquantity > 0) {
      setMinimumQty(article.minquantity);
    }
  };

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchandiseId || merchandiseId <= 0 || requiredQty <= 0) return;

    await addRequirement.mutateAsync({
      merchandiseId: Number(merchandiseId),
      category: category.trim() || 'Gros œuvre',
      materialType,
      requiredQty: Number(requiredQty),
      unit: unit.trim() || 'Unité',
      minimumQty: Number(minimumQty) || 0
    });

    setIsAddReqOpen(false);
    setMerchandiseId(null);
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
            <h3 className="text-base font-bold text-[#1a1a1a] m-0 [text-wrap:balance]">Gestion & Consommation des Matériaux</h3>
            <span className="text-xs text-[#888780]">Suivi dédié sans impact sur le moteur de stock principal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsLogConsumptionOpen(true)}
            className="rounded-xl text-xs font-bold border-black/10 hover:bg-[#f8f9fa] active:scale-[0.96] transition-transform min-h-[40px]"
          >
            <ArrowDownCircle className="w-4 h-4 mr-1.5 text-[#2563eb]" /> Enregistrer conso
          </Button>
          <Button
            onClick={handleOpenAddModal}
            className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold rounded-xl text-xs px-4 active:scale-[0.96] transition-transform min-h-[40px]"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Déclarer un besoin
          </Button>
        </div>
      </div>

      {/* Matériaux principaux */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-lg font-bold text-[#1a1a1a] m-0 [text-wrap:balance]">Matériaux principaux</h4>
          <span className="text-xs font-semibold text-[#888780] tabular-nums">{principals.length} article(s)</span>
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
                    <div className="min-w-0 pr-2">
                      <h5 className="font-bold text-[#1a1a1a] text-base m-0 truncate">
                        {m.merchandiseDesignation || m.merchandiseRef}
                      </h5>
                      <span className="text-xs text-[#888780] font-medium block truncate mt-0.5">
                        {m.category} · Réf: <span className="font-semibold text-[#1a1a1a]">{m.merchandiseRef}</span>
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-extrabold text-[#1a1a1a] leading-none tabular-nums">{m.remainingQty}</span>
                      <span className="text-xs text-[#888780] font-bold ml-1">{m.unit}</span>
                      <span className="block text-[0.7rem] text-[#888780] mt-0.5">restants</span>
                    </div>
                  </div>

                  <div className="w-full bg-[#f0f0f0] h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        m.isLowStock ? 'bg-[#e24b4a]' : 'bg-[#10b981]'
                      )}
                      style={{ width: `${pctRemaining}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[0.75rem] text-[#888780] mb-2 font-medium tabular-nums">
                    <span>Conso: {m.consumedQty} {m.unit}</span>
                    <span>Total prévu: {m.requiredQty} {m.unit}</span>
                  </div>
                </div>

                {m.isLowStock && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#e24b4a] bg-[#fef2f2] p-2 rounded-xl mt-2 tabular-nums">
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
          <h4 className="text-lg font-bold text-[#1a1a1a] m-0 [text-wrap:balance]">Consommables & Outillage léger</h4>
          <span className="text-xs font-semibold text-[#888780] tabular-nums">{consumables.length} article(s)</span>
        </div>

        <div className="flex flex-col gap-3">
          {consumables.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("w-3 h-3 rounded-full shrink-0", c.isLowStock ? 'bg-[#e24b4a] animate-pulse' : 'bg-[#10b981]')} />
                <div className="min-w-0">
                  <span className="font-bold text-[#1a1a1a] text-sm block truncate">{c.merchandiseDesignation || c.merchandiseRef}</span>
                  <span className="text-xs text-[#888780]">Réf: {c.merchandiseRef}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-sm">
                  <span className="font-extrabold text-[#1a1a1a] tabular-nums">{c.remainingQty}</span> <span className="text-[#888780] font-medium">{c.unit}</span>
                </div>
                <div className="text-xs text-[#888780] hidden sm:block tabular-nums">Seuil min: {c.minimumQty} {c.unit}</div>
              </div>
            </div>
          ))}

          {consumables.length === 0 && (
            <div className="p-6 text-center border border-dashed border-black/10 rounded-2xl text-[#888780] font-medium text-xs bg-white">
              Aucun consommable répertorié pour ce chantier.
            </div>
          )}
        </div>
      </section>

      {/* Modal: Déclarer un besoin matériel */}
      <Dialog open={isAddReqOpen} onOpenChange={setIsAddReqOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a1a]">Déclarer un besoin matériel</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddRequirement} className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                Sélectionner un article du catalogue
              </label>

              {/* Search bar */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#888780]" />
                <Input
                  type="text"
                  placeholder="Rechercher par référence, désignation..."
                  value={searchArticle}
                  onChange={(e) => setSearchArticle(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-[#f8f9fa] border-black/10 focus-visible:ring-1 focus-visible:ring-[#2563eb]"
                />
                {searchArticle && (
                  <button
                    type="button"
                    onClick={() => setSearchArticle('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888780] hover:text-[#1a1a1a]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* List of Articles */}
              <div className="border border-black/10 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto custom-scrollbar divide-y divide-black/5 bg-[#fafafa]">
                {isArticlesLoading && (
                  <div className="py-8 flex flex-col items-center justify-center text-[#888780] gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#2563eb]" />
                    <span className="text-xs">Chargement du catalogue...</span>
                  </div>
                )}

                {!isArticlesLoading && filteredArticles.length === 0 && (
                  <div className="py-6 text-center text-xs text-[#888780]">
                    Aucun article trouvé pour « {searchArticle} »
                  </div>
                )}

                {!isArticlesLoading && filteredArticles.map((a) => {
                  const isSelected = merchandiseId === a.id;

                  return (
                    <div
                      key={a.id}
                      onClick={() => handleSelectArticle(a)}
                      className={cn(
                        "flex items-center justify-between p-2.5 cursor-pointer transition-colors duration-150 hover:bg-[#eff6ff]/60",
                        isSelected ? "bg-[#eff6ff] border-l-4 border-l-[#2563eb]" : "bg-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-black/5",
                          isSelected ? "bg-[#2563eb] text-white" : "bg-[#f0f0f0] text-[#1a1a1a]"
                        )}>
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#1a1a1a] truncate">
                            {a.description || a.reference}
                          </div>
                          <div className="text-[0.7rem] text-[#888780] flex items-center gap-2">
                            <span className="font-semibold text-[#2563eb]">{a.reference}</span>
                            {a.unit && (
                              <>
                                <span>•</span>
                                <span>Unité: {a.unit}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center shrink-0 ml-2">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!merchandiseId && (
                <span className="text-[0.7rem] text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> Veuillez sélectionner un article dans la liste ci-dessus.
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Type de besoin</label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full h-10 px-3 border border-black/10 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                >
                  <option value="Principal">Principal (Gros œuvre / Structure)</option>
                  <option value="Consumable">Consommable (Quincaillerie / Fluides)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Catégorie</label>
                <Input
                  type="text"
                  placeholder="Gros œuvre, Finition..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-xl text-xs h-10"
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
                  className="rounded-xl text-xs h-10 tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Unité</label>
                <Input
                  type="text"
                  placeholder="Tonnes, M3..."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="rounded-xl text-xs h-10"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Seuil d'alerte</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 10"
                  value={minimumQty || ''}
                  onChange={(e) => setMinimumQty(Number(e.target.value))}
                  className="rounded-xl text-xs h-10 tabular-nums"
                />
              </div>
            </div>

            <DialogFooter className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddReqOpen(false)}
                className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!merchandiseId || requiredQty <= 0 || addRequirement.isPending}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-4"
              >
                {addRequirement.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Déclarer le besoin'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Enregistrer une consommation */}
      <Dialog open={isLogConsumptionOpen} onOpenChange={setIsLogConsumptionOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a1a]">Enregistrer une consommation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogConsumption} className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Article concerné</label>
              <select
                value={consumeMerchandiseId}
                onChange={(e) => setConsumeMerchandiseId(Number(e.target.value))}
                className="w-full h-10 px-3 border border-black/10 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                required
              >
                <option value={0}>Sélectionner un article du chantier...</option>
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
                className="rounded-xl text-xs h-10 tabular-nums"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Notes ou référence du bon</label>
              <Input
                type="text"
                placeholder="Ex: Coulage dalle niveau 1, BL 8943"
                value={consumeNotes}
                onChange={(e) => setConsumeNotes(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <DialogFooter className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLogConsumptionOpen(false)}
                className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={consumeMerchandiseId <= 0 || consumedQty <= 0 || logConsumption.isPending}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-4"
              >
                {logConsumption.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Valider la sortie'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
