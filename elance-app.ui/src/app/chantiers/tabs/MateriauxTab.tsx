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
  AlertCircle,
  Wrench,
  Clock,
  History,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChantierDetail } from '@/types/chantier';
import {
  useAddMaterialRequirement,
  useLogMaterialConsumption,
  useChantierConsumptions
} from '@/hooks/use-chantiers';
import { useArticles } from '@/hooks/use-articles';
import { Article, ArticleType } from '@/types/article';
import { cn } from '@/lib/utils';
import { ChantierModal, FormFieldGroup } from '../components/ChantierModal';

interface MateriauxTabProps {
  site: ChantierDetail;
}

export function MateriauxTab({ site }: MateriauxTabProps) {
  // Material requirement modal state
  const [isAddReqOpen, setIsAddReqOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [searchArticle, setSearchArticle] = useState('');
  const [category, setCategory] = useState('Gros œuvre');
  const [materialType, setMaterialType] = useState('Principal');
  const [requiredQty, setRequiredQty] = useState<number>(0);
  const [unit, setUnit] = useState('Tonnes');
  const [minimumQty, setMinimumQty] = useState<number>(0);

  // Service / Prestation modal state
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [selectedServiceArticleId, setSelectedServiceArticleId] = useState<number | null>(null);
  const [searchService, setSearchService] = useState('');
  const [serviceQty, setServiceQty] = useState<number>(1);
  const [serviceUnit, setServiceUnit] = useState('Forfait');
  const [serviceCategory, setServiceCategory] = useState('Prestation externe');

  // Log consumption modal state
  const [isLogConsumptionOpen, setIsLogConsumptionOpen] = useState(false);
  const [consumeReqId, setConsumeReqId] = useState<number>(0);
  const [consumedQty, setConsumedQty] = useState<number>(0);
  const [consumeNotes, setConsumeNotes] = useState('');
  const [consumeTaskId, setConsumeTaskId] = useState<number | null>(null);

  const { data: articles = [], isLoading: isArticlesLoading } = useArticles();
  const { data: consumptions = [], isLoading: isConsumptionsLoading } = useChantierConsumptions(site.id);
  const addRequirement = useAddMaterialRequirement(site.id);
  const logConsumption = useLogMaterialConsumption(site.id);

  const requirements = site.materialRequirements || [];

  // Partition requirements between physical materials and services
  const services = requirements.filter(
    (r) => r.materialType === 'Service' || r.category === 'Prestation'
  );
  const physicalMaterials = requirements.filter(
    (r) => r.materialType !== 'Service' && r.category !== 'Prestation'
  );
  const principals = physicalMaterials.filter((r) => r.materialType === 'Principal');
  const consumables = physicalMaterials.filter((r) => r.materialType === 'Consumable');
  const lowStockCount = physicalMaterials.filter((r) => r.isLowStock).length;

  // Flatten active tasks for consumption assignment
  const allTasks = useMemo(() => {
    return site.phases?.flatMap((p) => p.tasks || []) || [];
  }, [site.phases]);

  // Separate material articles and service articles from catalogue
  const materialArticles = useMemo(() => {
    return articles.filter((a) => a.type !== ArticleType.Service);
  }, [articles]);

  const serviceArticles = useMemo(() => {
    return articles.filter((a) => a.type === ArticleType.Service);
  }, [articles]);

  // Filter physical articles for modal
  const filteredMaterialArticles = useMemo(() => {
    const q = searchArticle.toLowerCase().trim();
    if (!q) return materialArticles;
    return materialArticles.filter((a) => {
      const ref = (a.reference || '').toLowerCase();
      const desc = (a.description || '').toLowerCase();
      return ref.includes(q) || desc.includes(q);
    });
  }, [materialArticles, searchArticle]);

  // Filter service articles for modal
  const filteredServiceArticles = useMemo(() => {
    const q = searchService.toLowerCase().trim();
    if (!q) return serviceArticles;
    return serviceArticles.filter((a) => {
      const ref = (a.reference || '').toLowerCase();
      const desc = (a.description || '').toLowerCase();
      return ref.includes(q) || desc.includes(q);
    });
  }, [serviceArticles, searchService]);

  const handleOpenAddModal = () => {
    setSelectedArticleId(null);
    setSearchArticle('');
    setRequiredQty(0);
    setMinimumQty(0);
    setCategory('Gros œuvre');
    setMaterialType('Principal');
    setUnit('Tonnes');
    setIsAddReqOpen(true);
  };

  const handleSelectMaterialArticle = (article: Article) => {
    setSelectedArticleId(article.id);
    if (article.unit) setUnit(article.unit);
    if (article.iswood) setCategory('Bois & Charpente');
    if (article.minquantity && article.minquantity > 0) setMinimumQty(article.minquantity);
  };

  const handleOpenAddService = () => {
    setSelectedServiceArticleId(null);
    setSearchService('');
    setServiceQty(1);
    setServiceUnit('Forfait');
    setServiceCategory('Prestation externe');
    setIsAddServiceOpen(true);
  };

  const handleSelectServiceArticle = (article: Article) => {
    setSelectedServiceArticleId(article.id);
    if (article.unit) setServiceUnit(article.unit);
  };

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticleId || selectedArticleId <= 0 || requiredQty <= 0) return;

    await addRequirement.mutateAsync({
      articleId: Number(selectedArticleId),
      category: category.trim() || 'Gros œuvre',
      materialType,
      requiredQty: Number(requiredQty),
      unit: unit.trim() || 'Unité',
      minimumQty: Number(minimumQty) || 0,
    });

    setIsAddReqOpen(false);
    setSelectedArticleId(null);
    setRequiredQty(0);
  };

  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceArticleId || selectedServiceArticleId <= 0 || serviceQty <= 0) return;

    await addRequirement.mutateAsync({
      articleId: Number(selectedServiceArticleId),
      category: serviceCategory.trim() || 'Prestation',
      materialType: 'Service',
      requiredQty: Number(serviceQty),
      unit: serviceUnit.trim() || 'Forfait',
      minimumQty: 0,
    });

    setIsAddServiceOpen(false);
    setSelectedServiceArticleId(null);
    setServiceQty(1);
  };

  const handleLogConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (consumeReqId <= 0 || consumedQty <= 0) return;

    const targetReq = requirements.find((r) => r.id === consumeReqId);
    if (!targetReq) return;

    await logConsumption.mutateAsync({
      articleId: targetReq.articleId,
      merchandiseId: targetReq.merchandiseId ?? undefined,
      consumedQty: Number(consumedQty),
      unit: targetReq.unit || 'Unité',
      notes: consumeNotes.trim() || undefined,
      chantierTaskId: consumeTaskId ?? undefined,
    });

    setIsLogConsumptionOpen(false);
    setConsumedQty(0);
    setConsumeNotes('');
    setConsumeReqId(0);
    setConsumeTaskId(null);
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
              Gestion des Matériaux & Prestations
            </h3>
            <span className="text-xs text-[#64748b]">
              Besoins prévus, prestations de service et suivi des consommations réelles
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsLogConsumptionOpen(true)}
            className="rounded-xl text-xs font-bold border-black/15 hover:bg-slate-50 active:scale-[0.96] transition-transform h-9 px-3.5"
          >
            <ArrowDownCircle className="w-4 h-4 mr-1.5 text-[#2563eb]" />
            Consommer
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenAddService}
            className="rounded-xl text-xs font-bold border-[#ddd6fe] text-[#7c3aed] bg-[#f5f3ff] hover:bg-[#ede9fe] active:scale-[0.96] transition-transform h-9 px-3.5"
          >
            <Briefcase className="w-4 h-4 mr-1.5 text-[#8b5cf6]" />
            Ajouter une prestation
          </Button>
          <Button
            onClick={handleOpenAddModal}
            className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold rounded-xl text-xs px-4 active:scale-[0.96] transition-transform h-9 shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Déclarer un besoin matériel
          </Button>
        </div>
      </div>

      {/* KPI mini-cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <span className="text-[0.7rem] font-bold text-[#7c3aed] uppercase tracking-wider">
            Services & Prestations
          </span>
          <div className="text-2xl font-extrabold text-[#7c3aed] tabular-nums mt-0.5">
            {services.length}
          </div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-black/5 shadow-xs">
          <span className="text-[0.7rem] font-bold text-[#64748b] uppercase tracking-wider">
            Alertes Stock Bas
          </span>
          <div
            className={cn(
              'text-2xl font-extrabold tabular-nums mt-0.5',
              lowStockCount > 0 ? 'text-[#dc2626]' : 'text-[#10b981]'
            )}
          >
            {lowStockCount}
          </div>
        </div>
      </div>

      {/* SECTION 1: Matériaux principaux */}
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
              Aucun besoin en matériau principal enregistré. Cliquez sur « Déclarer un besoin matériel ».
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: Consommables */}
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
                <div className="text-xs sm:text-sm tabular-nums">
                  <span className="text-[#64748b]">Consommé : {c.consumedQty} / </span>
                  <span className="font-extrabold text-[#0f172a]">{c.remainingQty}</span>{' '}
                  <span className="text-[#64748b] font-medium">{c.unit} restants</span>
                </div>
                <div className="text-xs text-[#64748b] hidden sm:block tabular-nums">
                  Prévu : {c.requiredQty} {c.unit}
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

      {/* SECTION 3: Services / Prestations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center ring-1 ring-[#ddd6fe]">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-[#0f172a] m-0 [text-wrap:balance]">
              Services / Prestations (Sous-traitance & Interventions)
            </h4>
          </div>
          <span className="text-xs font-bold text-[#7c3aed] bg-[#f5f3ff] border border-[#ddd6fe] px-2.5 py-0.5 rounded-full tabular-nums">
            {services.length} prestation(s)
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {services.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-4 bg-white border border-purple-100 rounded-2xl shadow-xs hover:border-purple-200 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-[#ddd6fe]">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#0f172a] text-xs sm:text-sm block truncate">
                    {s.merchandiseDesignation || s.merchandiseRef}
                  </span>
                  <span className="text-[0.7rem] text-[#7c3aed] font-medium">
                    {s.category || 'Prestation externe'} · Réf: <span className="font-mono">{s.merchandiseRef}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="text-xs sm:text-sm tabular-nums">
                  <span className="text-[#64748b]">Volume prévu : </span>
                  <strong className="text-[#0f172a]">{s.requiredQty}</strong>{' '}
                  <span className="text-[#64748b]">{s.unit}</span>
                </div>
                <div className="text-xs sm:text-sm tabular-nums">
                  <span className="text-[#64748b]">Réalisé : </span>
                  <strong className="text-[#10b981]">{s.consumedQty}</strong>{' '}
                  <span className="text-[#64748b]">{s.unit}</span>
                </div>
                <div className="text-xs text-[#7c3aed] bg-[#f5f3ff] px-2.5 py-1 rounded-lg font-bold tabular-nums">
                  Reste : {s.remainingQty} {s.unit}
                </div>
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div className="p-8 text-center border border-dashed border-purple-200 rounded-2xl text-[#64748b] text-xs bg-white">
              Aucune prestation de service enregistrée pour ce chantier. Cliquez sur « Ajouter une prestation ».
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: Historique des Consommations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#eff6ff] text-[#2563eb] flex items-center justify-center ring-1 ring-[#bfdbfe]">
              <History className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-[#0f172a] m-0 [text-wrap:balance]">
              Historique des Consommations & Sorties Réelles
            </h4>
          </div>
          <span className="text-xs font-bold text-[#2563eb] bg-[#eff6ff] border border-[#bfdbfe] px-2.5 py-0.5 rounded-full tabular-nums">
            {consumptions.length} mouvement(s)
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-black/5 shadow-xs overflow-hidden">
          {isConsumptionsLoading && (
            <div className="p-8 text-center text-xs text-[#64748b] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#2563eb]" /> Chargement de l&apos;historique...
            </div>
          )}

          {!isConsumptionsLoading && consumptions.length === 0 && (
            <div className="p-8 text-center text-xs text-[#64748b]">
              Aucune consommation enregistrée à ce jour pour ce chantier.
            </div>
          )}

          {!isConsumptionsLoading && consumptions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] border-b border-black/5 text-[#64748b] font-bold uppercase tracking-wider text-[0.68rem]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Article / Matériau</th>
                    <th className="py-3 px-4 text-right">Quantité sortie</th>
                    <th className="py-3 px-4">Tâche associée</th>
                    <th className="py-3 px-4">Enregistré par</th>
                    <th className="py-3 px-4">Notes / Réf BL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {consumptions.map((c) => (
                    <tr key={c.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-4 text-[#0f172a] font-medium tabular-nums whitespace-nowrap">
                        {new Date(c.consumedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#0f172a] block">
                          {c.articleDesignation || c.merchandiseDesignation || c.merchandiseRef || `Article #${c.articleId}`}
                        </span>
                        {c.articleCode && (
                          <span className="text-[0.68rem] text-[#64748b] font-mono">{c.articleCode}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-[#0f172a] tabular-nums whitespace-nowrap">
                        {c.consumedQty} <span className="font-medium text-[#64748b]">{c.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-[#475569]">
                        {c.taskLabel ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium text-[0.7rem]">
                            {c.taskLabel}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#475569] font-medium">
                        {c.recordedByName || `Utilisateur #${c.recordedById}`}
                      </td>
                      <td className="py-3 px-4 text-[#64748b] text-[0.72rem] max-w-[200px] truncate">
                        {c.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Modal: Déclarer un besoin matériel (Catalogue physique) */}
      <ChantierModal
        open={isAddReqOpen}
        onOpenChange={setIsAddReqOpen}
        title="Déclarer un besoin matériel"
        description="Sélectionnez un article physique du catalogue pour planifier sa quantité nécessaire sur le chantier."
        icon={Package}
        maxWidthClass="sm:max-w-[480px]"
        onSubmit={handleAddRequirement}
        submitLabel="Déclarer le besoin"
        isSubmitting={addRequirement.isPending}
        submitDisabled={!selectedArticleId || requiredQty <= 0}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Article du catalogue (Matériau)" required>
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

              {!isArticlesLoading && filteredMaterialArticles.length === 0 && (
                <div className="py-6 text-center text-xs text-[#64748b]">
                  Aucun article matériel trouvé pour « {searchArticle} »
                </div>
              )}

              {!isArticlesLoading &&
                filteredMaterialArticles.map((a) => {
                  const isSelected = selectedArticleId === a.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => handleSelectMaterialArticle(a)}
                      className={cn(
                        'flex items-center justify-between p-2.5 cursor-pointer transition-colors duration-150',
                        isSelected ? 'bg-[#eff6ff] border-l-4 border-l-[#2563eb]' : 'bg-white hover:bg-[#f8fafc]'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                            isSelected ? 'bg-[#2563eb] text-white' : 'bg-slate-100 text-[#475569]'
                          )}
                        >
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#0f172a] truncate">
                            {a.description || a.reference}
                          </div>
                          <div className="text-[0.68rem] text-[#64748b] font-mono">
                            Réf: {a.reference}
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

            {!selectedArticleId && (
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

      {/* Modal: Ajouter une Prestation / Service */}
      <ChantierModal
        open={isAddServiceOpen}
        onOpenChange={setIsAddServiceOpen}
        title="Ajouter une prestation / service"
        description="Associez une intervention de service ou prestation externe au chantier (sans gestion de stock physique)."
        icon={Briefcase}
        iconColor="text-[#8b5cf6]"
        iconBg="bg-[#f5f3ff]"
        maxWidthClass="sm:max-w-[480px]"
        onSubmit={handleAddServiceSubmit}
        submitLabel="Enregistrer la prestation"
        isSubmitting={addRequirement.isPending}
        submitDisabled={!selectedServiceArticleId || serviceQty <= 0}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Service / Prestation du catalogue" required>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <Input
                type="text"
                placeholder="Rechercher une prestation, service..."
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs rounded-xl bg-[#f8fafc] border-black/15 focus:border-[#8b5cf6]"
              />
              {searchService && (
                <button
                  type="button"
                  onClick={() => setSearchService('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="border border-black/10 rounded-xl overflow-hidden max-h-[180px] overflow-y-auto custom-scrollbar divide-y divide-black/5 bg-[#fafafa]">
              {isArticlesLoading && (
                <div className="py-6 flex flex-col items-center justify-center text-[#64748b] gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#8b5cf6]" />
                  <span className="text-xs">Chargement des prestations...</span>
                </div>
              )}

              {!isArticlesLoading && filteredServiceArticles.length === 0 && (
                <div className="py-6 text-center text-xs text-[#64748b]">
                  {serviceArticles.length === 0
                    ? 'Aucun article de type Service disponible dans le catalogue.'
                    : `Aucun service trouvé pour « ${searchService} »`}
                </div>
              )}

              {!isArticlesLoading &&
                filteredServiceArticles.map((a) => {
                  const isSelected = selectedServiceArticleId === a.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => handleSelectServiceArticle(a)}
                      className={cn(
                        'flex items-center justify-between p-2.5 cursor-pointer transition-colors duration-150',
                        isSelected ? 'bg-[#f5f3ff] border-l-4 border-l-[#8b5cf6]' : 'bg-white hover:bg-[#f8fafc]'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                            isSelected ? 'bg-[#8b5cf6] text-white' : 'bg-purple-100 text-[#7c3aed]'
                          )}
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#0f172a] truncate">
                            {a.description || a.reference}
                          </div>
                          <div className="text-[0.68rem] text-[#7c3aed] font-mono">
                            Réf: {a.reference}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shrink-0 ml-2 shadow-2xs">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {!selectedServiceArticleId && (
              <span className="text-[0.7rem] text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Veuillez sélectionner une prestation dans la liste.
              </span>
            )}
          </FormFieldGroup>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormFieldGroup label="Volume / Quantité" required>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 1"
                value={serviceQty || ''}
                onChange={(e) => setServiceQty(Number(e.target.value))}
                required
                className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#8b5cf6] tabular-nums font-bold"
              />
            </FormFieldGroup>

            <FormFieldGroup label="Unité">
              <Input
                type="text"
                placeholder="Forfait, Heures..."
                value={serviceUnit}
                onChange={(e) => setServiceUnit(e.target.value)}
                className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#8b5cf6]"
              />
            </FormFieldGroup>

            <FormFieldGroup label="Catégorie / Prestataire">
              <Input
                type="text"
                placeholder="Sous-traitance, Maçonnerie..."
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#8b5cf6]"
              />
            </FormFieldGroup>
          </div>
        </div>
      </ChantierModal>

      {/* Modal: Enregistrer une consommation */}
      <ChantierModal
        open={isLogConsumptionOpen}
        onOpenChange={setIsLogConsumptionOpen}
        title="Enregistrer une consommation / sortie"
        description="Déduisez les quantités de matériaux réellement utilisées sur le chantier."
        icon={ArrowDownCircle}
        maxWidthClass="sm:max-w-[460px]"
        onSubmit={handleLogConsumption}
        submitLabel="Valider la sortie"
        isSubmitting={logConsumption.isPending}
        submitDisabled={consumeReqId <= 0 || consumedQty <= 0}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Article / Matériau concerné" required>
            <select
              value={consumeReqId}
              onChange={(e) => setConsumeReqId(Number(e.target.value))}
              className="w-full h-9.5 px-3 border border-black/15 rounded-xl text-xs font-medium bg-white focus:outline-none focus:border-[#2563eb]"
              required
            >
              <option value={0}>Sélectionner un article du chantier...</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.merchandiseDesignation || r.merchandiseRef} (Reste : {r.remainingQty} {r.unit})
                </option>
              ))}
            </select>
          </FormFieldGroup>

          {allTasks.length > 0 && (
            <FormFieldGroup label="Tâche associée (optionnel)">
              <select
                value={consumeTaskId ?? ''}
                onChange={(e) => setConsumeTaskId(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-9.5 px-3 border border-black/15 rounded-xl text-xs font-medium bg-white focus:outline-none focus:border-[#2563eb]"
              >
                <option value="">-- Aucune tâche spécifique --</option>
                {allTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} {t.subLabel ? `(${t.subLabel})` : ''}
                  </option>
                ))}
              </select>
            </FormFieldGroup>
          )}

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

          <FormFieldGroup label="Notes ou référence du bon (BL, justificatif)">
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
