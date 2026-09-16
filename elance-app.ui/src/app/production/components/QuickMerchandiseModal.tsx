'use client';

import React, { useState, useEffect } from 'react';
import { ProductionModal } from './ProductionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, PackagePlus, Sparkles } from 'lucide-react';
import { useQuickCreateMerchandise } from '@/hooks/use-production';
import { articleService } from '@/services/components/article.service';

interface QuickMerchandiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (merchandiseId: number, ref: string, designation: string) => void;
}

export function QuickMerchandiseModal({ isOpen, onClose, onCreated }: QuickMerchandiseModalProps) {
  const quickCreateMutation = useQuickCreateMerchandise();

  const [articles, setArticles] = useState<{ id: number; reference: string; description: string }[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [packageReference, setPackageReference] = useState('');
  const [description, setDescription] = useState('');
  const [allowNegativStock, setAllowNegativStock] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingArticles(true);
      articleService
        .getAll()
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setArticles(list);
          if (list.length > 0 && !selectedArticleId) {
            setSelectedArticleId(list[0].id);
          }
        })
        .catch((err) => console.error('Error fetching articles for quick create:', err))
        .finally(() => setLoadingArticles(false));

      // Auto-suggest reference
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setPackageReference(`LOT-FAB-${randomSuffix}`);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticleId) return;

    const res = await quickCreateMutation.mutateAsync({
      articleId: selectedArticleId,
      packageReference: packageReference.trim(),
      description: description.trim() || undefined,
      isInvoicible: true,
      allowNegativStock,
    });

    const chosenArticle = articles.find((a) => a.id === selectedArticleId);
    onCreated(res.id, res.packageReference, chosenArticle?.description || res.description);
    onClose();
  };

  return (
    <ProductionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer un Lot / Produit Sortant à la volée"
      subtitle="Générez instantanément un lot de marchandise pour référencer la sortie de cette étape (décision Q3)."
      icon={<PackagePlus className="w-5 h-5 text-amber-400" />}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-xs text-slate-700 font-bold">Article du Catalogue Parent *</Label>
          <select
            value={selectedArticleId ?? ''}
            onChange={(e) => setSelectedArticleId(parseInt(e.target.value))}
            required
            className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-corp-blue-500"
          >
            {loadingArticles ? (
              <option value="">Chargement des articles...</option>
            ) : articles.length === 0 ? (
              <option value="">Aucun article trouvé</option>
            ) : (
              articles.map((art) => (
                <option key={art.id} value={art.id}>
                  {art.reference ? `[${art.reference}] ` : ''}
                  {art.description}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <Label className="text-xs text-slate-700 font-bold">Référence du Lot / Colis *</Label>
          <div className="relative mt-1.5">
            <Input
              type="text"
              required
              value={packageReference}
              onChange={(e) => setPackageReference(e.target.value)}
              placeholder="ex: LOT-PAN-01"
              className="text-xs font-mono font-bold uppercase"
            />
            <button
              type="button"
              onClick={() => setPackageReference(`LOT-FAB-${Math.floor(100 + Math.random() * 900)}`)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-corp-blue-600 hover:text-corp-blue-700 font-semibold flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Auto
            </button>
          </div>
        </div>

        <div>
          <Label className="text-xs text-slate-700 font-bold">Description / Spécification du lot</Label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex: Panneaux rabotés 2400x1200x18mm"
            className="mt-1.5 text-xs"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-800">Autoriser stock négatif</p>
            <p className="text-[11px] text-slate-400">Permet la vente ou consommation même si le stock comptable est nul.</p>
          </div>
          <Switch checked={allowNegativStock} onCheckedChange={setAllowNegativStock} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="h-10 text-xs">
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={quickCreateMutation.isPending || !selectedArticleId}
            className="h-10 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            {quickCreateMutation.isPending ? 'Création...' : 'Créer et associer'}
          </Button>
        </div>
      </form>
    </ProductionModal>
  );
}
