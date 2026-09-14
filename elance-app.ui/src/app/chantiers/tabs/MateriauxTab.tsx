'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Plus,
  Layers,
  ArrowDownCircle,
  Search,
  Check,
  Loader2,
  X,
  Package,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChantierDetail } from '@/types/chantier';
import { useAddMaterialRequirement, useLogMaterialConsumption } from '@/hooks/use-chantiers';
import { useArticles } from '@/hooks/use-articles';
import { Article } from '@/types/article';
import { cn } from '@/lib/utils';
import { ChantierModal, FormFieldGroup } from '../components/ChantierModal';

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
  const principals = requirements.filter((r) => r.materialType === 'Principal');
  const consumables = requirements.filter((r) => r.materialType === 'Consumable');
  const lowStockCount = requirements.filter((r) => r.isLowStock).length;

  // Filter articles by search input
  const filteredArticles = useMemo(() => {
    const q = searchArticle.toLowerCase().trim();
    if (!q) return articles;
    return articles.filter((a) => {
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
    if (article.unit) setUnit(article.unit);
    if (article.iswood) setCategory('Bois & Charpente');
    if (article.minquantity && article.minquantity > 0) setMinimumQty(article.minquantity);
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
      minimumQty: Number(minimumQty) || 0,
    });

    setIsAddReqOpen(false);
    setMerchandiseId(null);
    setRequiredQty(0);
  };

  const handleLogConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (consumeMerchandiseId <= 0 || consumedQty <= 0) return;

    const targetReq = requirements.find((r) => r.merchandiseId === consumeMerchandiseId);

    await logConsumption.mutateAsync({
      merchandiseId: consumeMerchandiseId,
      consumedQty: Number(consumedQty),
      unit: targetReq?.unit || 'Unité',
      notes: consumeNotes.trim() || undefined,
    });

    setIsLogConsumptionOpen(false);
    setConsumedQty(0);
    setConsumeNotes('');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl border border-black/5 shadow-xs gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb] ring-1 ring-black/5">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0f172a] m-0 [text-wrap:balance]">
              Gestion & Approvisionnement des Matériaux
            </h3>
            <span className="text-xs text-[#64748b]">
              Suivi dédié aux besoins et consommations sur site
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setIsLogConsumptionOpen(true)}
            className="rounded-xl text-xs font-bold border-black/15 hover:bg-slate-50 active:scale-[0.96] transition-transform h-9.5 px-3.5"
          >
            <ArrowDownCircle className="w-4 h-4 mr-1.5 text-[#2563eb]" />
            Consommer
          </Button>
          <Button
            onClick={handleOpenAddModal}
            className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold rounded-xl text-xs px-4 active:scale-[0.96] transition-transform h-9.5 shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Déclarer un besoin
          </Button>
        </div>
      </div>

      {/* KPI mini-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-black/5 shadow-xs">
          <span className="text-[0.7rem] font-bold text-[#64748b] uppercase tracking-wider">
            Matériaux Principaux
          </span>
          <div className="text-2xl font-extrabold text-[#0f172a] tabular-nums mt-0.5">
            {principals.length}
          </div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-black/5 shadow-xs">
          <span className="text-[0.7rem] font-bold text-[#64748b] uppercase tracking-wider">
            Consommables & Outillage
          </span>
          <div className="text-2xl font-extrabold text-[#0f172a] tabular-nums mt-0.5">
            {consumables.length}
          </div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-black/5 shadow-xs">
          <span className="text-[0.7rem] font-bold text-[#64748b] uppercase tracking-wider">
            Alertes Stock Bas
          </span>
          <div className={cn('text-2xl font-extrabold tabular-nums mt-0.5', lowStockCount > 0 ? 'text-[#dc2626]' : 'text-[#10b981]')}>
            {lowStockCount}
          </div>
        </div>
      </div>

      {/* Matériaux principaux */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm sm:text-base font-bold text-[#0f172a] m-0 [text-wrap:balance]">
            Matériaux Principaux (Gros Œuvre & Structure)
          </h4>
          <span className="text-xs font-bold text-[#64748b] bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
            {principals.length} article(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {principals.map((m) => {
            const pctRemaining =
              m.requiredQty > 0
                ? Math.min(100, Math.round((m.remainingQty / m.requiredQty) * 100))
                : 0;

            return (
              <div
                key={m.id}
                className="p-5 bg-white border border-black/5 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-black/15 transition-colors"
              >
                {m.isLowStock && <div className="absolute top-0 left-0 right-0 h-1 bg-[#dc2626]" />}

                <div>
                  <div className="flex justify-between items-start mb-3 mt-0.5">
                    <div className="min-w-0 pr-2">
                      <h5 className="font-bold text-[#0f172a] text-sm sm:text-base m-0 truncate">
                        {m.merchandiseDesignation || m.merchandiseRef}
                      </h5>
                      <span className="text-xs text-[#64748b] block truncate mt-0.5">
                        {m.category} · Réf:{' '}
                        <strong className="text-[#0f172a] font-mono">{m.merchandiseRef}</strong>
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xl font-extrabold text-[#0f172a] tabular-nums">
                        {m.remainingQty}
                      </span>
                      <span className="text-xs text-[#64748b] font-bold ml-1">{m.unit}</span>
                      <span className="block text-[0.68rem] text-[#94a3b8] mt-0.5">restants</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        m.isLowStock ? 'bg-[#dc2626]' : 'bg-[#10b981]'
                      )}
                      style={{ width: `${pctRemaining}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[0.72rem] text-[#64748b] mb-1 font-medium tabular-nums">
                    <span>Consommé : {m.consumedQty} {m.unit}</span>
                    <span>Prévu : {m.requiredQty} {m.unit}</span>
                  </div>
                </div>

                {m.isLowStock && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#dc2626] bg-red-50 p-2 rounded-xl mt-3 tabular-nums border border-red-200/50">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Seuil d&apos;alerte atteint (&lt; {m.minimumQty} {m.unit})</span>
                  </div>
                )}
              </div>
            );
          })}

          {principals.length === 0 && (
            <div className="col-span-full p-8 text-center border border-dashed border-black/10 rounded-2xl text-[#64748b] text-xs bg-white">
              Aucun besoin en matériau principal enregistré. Cliquez sur « Déclarer un besoin ».
            </div>
          )}
        </div>
      </section>

      {/* Consommables */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm sm:text-base font-bold text-[#0f172a] m-0 [text-wrap:balance]">
            Consommables & Outillage Léger
          </h4>
          <span className="text-xs font-bold text-[#64748b] bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
            {consumables.length} article(s)
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {consumables.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3.5 bg-white border border-black/5 rounded-2xl shadow-xs hover:border-black/15 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-2.5 h-2.5 rounded-full shrink-0',
                    c.isLowStock ? 'bg-[#dc2626] animate-pulse' : 'bg-[#10b981]'
                  )}
                />
                <div className="min-w-0">
                  <span className="font-bold text-[#0f172a] text-xs sm:text-sm block truncate">
                    {c.merchandiseDesignation || c.merchandiseRef}
                  </span>
                  <span className="text-[0.7rem] text-[#64748b] font-mono">
                    Réf: {c.merchandiseRef}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="text-xs sm:text-sm">
                  <span className="font-extrabold text-[#0f172a] tabular-nums">{c.remainingQty}</span>{' '}
                  <span className="text-[#64748b] font-medium">{c.unit}</span>
                </div>
                <div className="text-xs text-[#64748b] hidden sm:block tabular-nums">
                  Seuil min : {c.minimumQty} {c.unit}
                </div>
              </div>
            </div>
          ))}

          {consumables.length === 0 && (
            <div className="p-6 text-center border border-dashed border-black/10 rounded-2xl text-[#64748b] text-xs bg-white">
              Aucun consommable répertorié pour ce chantier.
            </div>
          )}
        </div>
      </section>

      {/* Modal: Déclarer un besoin matériel */}
      <ChantierModal
        open={isAddReqOpen}
        onOpenChange={setIsAddReqOpen}
        title="Déclarer un besoin matériel"
        description="Sélectionnez un article du catalogue pour planifier sa quantité nécessaire sur le chantier."
        icon={Package}
        maxWidthClass="sm:max-w-[480px]"
        onSubmit={handleAddRequirement}
        submitLabel="Déclarer le besoin"
        isSubmitting={addRequirement.isPending}
        submitDisabled={!merchandiseId || requiredQty <= 0}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Article du catalogue" required>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <Input
                type="text"
                placeholder="Rechercher par référence, désignation..."
                value={searchArticle}
                onChange={(e) => setSearchArticle(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs rounded-xl bg-[#f8fafc] border-black/15 focus:border-[#2563eb]"
              />
              {searchArticle && (
                <button
                  type="button"
                  onClick={() => setSearchArticle('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="border border-black/10 rounded-xl overflow-hidden max-h-[180px] overflow-y-auto custom-scrollbar divide-y divide-black/5 bg-[#fafafa]">
              {isArticlesLoading && (
                <div className="py-6 flex flex-col items-center justify-center text-[#64748b] gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#2563eb]" />
                  <span className="text-xs">Chargement du catalogue...</span>
                </div>
              )}

              {!isArticlesLoading && filteredArticles.length === 0 && (
                <div className="py-6 text-center text-xs text-[#64748b]">
                  Aucun article trouvé pour « {searchArticle} »
                </div>
              )}

              {!isArticlesLoading &&
                filteredArticles.map((a) => {
                  const isSelected = merchandiseId === a.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => handleSelectArticle(a)}
                      className={cn(
                        'flex items-center justify-between p-2.5 cursor-pointer transition-colors duration-150',
                        isSelected ? 'bg-[#eff6ff] border-l-4 border-l-[#2563eb]' : 'bg-white hover:bg-[#f8fafc]'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-black/5',
                            isSelected ? 'bg-[#2563eb] text-white' : 'bg-[#f1f5f9] text-[#0f172a]'
                          )}
                        >
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#0f172a] truncate">
                            {a.description || a.reference}
                          </div>
                          <div className="text-[0.7rem] text-[#64748b] flex items-center gap-2">
                            <span className="font-mono text-[#2563eb]">{a.reference}</span>
                            {a.unit && <span>· Unité : {a.unit}</span>}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center shrink-0 ml-2 shadow-2xs">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {!merchandiseId && (
              <span className="text-[0.7rem] text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Veuillez sélectionner un article dans la liste.
              </span>
            )}
          </FormFieldGroup>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormFieldGroup label="Type de besoin" required>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                className="w-full h-9.5 px-3 border border-black/15 rounded-xl text-xs font-medium bg-white focus:outline-none focus:border-[#2563eb]"
              >
                <option value="Principal">Principal (Gros œuvre / Structure)</option>
                <option value="Consumable">Consommable (Outillage / Quincaillerie)</option>
              </select>
            </FormFieldGroup>

            <FormFieldGroup label="Catégorie">
              <Input
                type="text"
                placeholder="Gros œuvre, Finition..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
              />
            </FormFieldGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormFieldGroup label="Quantité" required>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 50"
                value={requiredQty || ''}
                onChange={(e) => setRequiredQty(Number(e.target.value))}
                required
                className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb] tabular-nums font-bold"
              />
            </FormFieldGroup>

            <FormFieldGroup label="Unité">
              <Input
                type="text"
                placeholder="Tonnes, M3..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
              />
            </FormFieldGroup>

            <FormFieldGroup label="Seuil d'alerte">
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 10"
                value={minimumQty || ''}
                onChange={(e) => setMinimumQty(Number(e.target.value))}
                className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb] tabular-nums"
              />
            </FormFieldGroup>
          </div>
        </div>
      </ChantierModal>

      {/* Modal: Enregistrer une consommation */}
      <ChantierModal
        open={isLogConsumptionOpen}
        onOpenChange={setIsLogConsumptionOpen}
        title="Enregistrer une consommation"
        description="Déduisez les quantités de matériaux utilisées sur le chantier."
        icon={ArrowDownCircle}
        maxWidthClass="sm:max-w-[460px]"
        onSubmit={handleLogConsumption}
        submitLabel="Valider la sortie"
        isSubmitting={logConsumption.isPending}
        submitDisabled={consumeMerchandiseId <= 0 || consumedQty <= 0}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Article concerné" required>
            <select
              value={consumeMerchandiseId}
              onChange={(e) => setConsumeMerchandiseId(Number(e.target.value))}
              className="w-full h-9.5 px-3 border border-black/15 rounded-xl text-xs font-medium bg-white focus:outline-none focus:border-[#2563eb]"
              required
            >
              <option value={0}>Sélectionner un article du chantier...</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.merchandiseId}>
                  {r.merchandiseDesignation || r.merchandiseRef} (Reste : {r.remainingQty} {r.unit})
                </option>
              ))}
            </select>
          </FormFieldGroup>

          <FormFieldGroup label="Quantité consommée" required>
            <Input
              type="number"
              step="0.01"
              placeholder="Ex: 5"
              value={consumedQty || ''}
              onChange={(e) => setConsumedQty(Number(e.target.value))}
              required
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb] tabular-nums font-bold"
            />
          </FormFieldGroup>

          <FormFieldGroup label="Notes ou référence du bon">
            <Input
              type="text"
              placeholder="Ex: Coulage dalle niveau 1, BL 8943"
              value={consumeNotes}
              onChange={(e) => setConsumeNotes(e.target.value)}
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
            />
          </FormFieldGroup>
        </div>
      </ChantierModal>
    </div>
  );
}
