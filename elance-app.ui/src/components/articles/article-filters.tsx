'use client';

import { useMemo } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  LayoutGrid, 
  TreeDeciduous, 
  QrCode, 
  ArrowUp, 
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from '@/hooks/use-categories';

export type SortDirection = 'none' | 'asc' | 'desc';

interface ArticleFiltersProps {
  referenceSearch: string;
  onReferenceSearchChange: (value: string) => void;
  designationSearch: string;
  onDesignationSearchChange: (value: string) => void;
  selectedType?: string;
  onTypeChange?: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedSubCategory: string;
  onSubCategoryChange: (value: string) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (value: SortDirection) => void;
  onReset: () => void;
  count: number;
}

export function ArticleFilters({
  referenceSearch,
  onReferenceSearchChange,
  designationSearch,
  onDesignationSearchChange,
  selectedType = 'all',
  onTypeChange,
  selectedCategory,
  onCategoryChange,
  selectedSubCategory,
  onSubCategoryChange,
  sortDirection,
  onSortDirectionChange,
  onReset,
  count
}: ArticleFiltersProps) {
  const { data: categories } = useCategories();

  const filteredSubCategories = useMemo(() => {
    if (!selectedCategory || !categories) return [];
    const cat = categories.find(c => c.id.toString() === selectedCategory);
    return cat?.firstchildren || [];
  }, [selectedCategory, categories]);

  const hasActiveFilters = 
    Boolean(referenceSearch.trim()) ||
    Boolean(designationSearch.trim()) ||
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedSubCategory !== 'all' ||
    sortDirection !== 'none';

  return (
    <div className="flex flex-col gap-4 p-6 border-b border-corp-blue-50 bg-white/50 backdrop-blur-sm">
      {/* Search Inputs Row: Référence & Désignation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Reference Search */}
        <div className="relative">
          <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
          <Input 
            placeholder="Rechercher par référence..." 
            aria-label="Rechercher par référence"
            className="pl-10 pr-9 h-11 rounded-xl border-corp-blue-50 bg-sand-50/50 hover:bg-white focus:bg-white focus:border-corp-blue-600 focus:ring-corp-blue-600 transition-all font-medium text-corp-blue-900 placeholder:text-sand-400"
            value={referenceSearch}
            onChange={(e) => onReferenceSearchChange(e.target.value)}
          />
          {referenceSearch && (
            <button 
              type="button"
              onClick={() => onReferenceSearchChange('')}
              aria-label="Effacer la recherche par référence"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-300 hover:text-corp-blue-600 p-0.5 rounded-md hover:bg-sand-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Designation Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
          <Input 
            placeholder="Rechercher par désignation..." 
            aria-label="Rechercher par désignation"
            className="pl-10 pr-9 h-11 rounded-xl border-corp-blue-50 bg-sand-50/50 hover:bg-white focus:bg-white focus:border-corp-blue-600 focus:ring-corp-blue-600 transition-all font-medium text-corp-blue-900 placeholder:text-sand-400"
            value={designationSearch}
            onChange={(e) => onDesignationSearchChange(e.target.value)}
          />
          {designationSearch && (
            <button 
              type="button"
              onClick={() => onDesignationSearchChange('')}
              aria-label="Effacer la recherche par désignation"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-300 hover:text-corp-blue-600 p-0.5 rounded-md hover:bg-sand-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Filters, Sort & Article Count Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {onTypeChange && (
            <Select value={selectedType} onValueChange={(val) => { if (val) onTypeChange(val); }}>
              <SelectTrigger 
                aria-label="Filtrer par type d'article"
                className="w-full sm:w-[160px] h-11 rounded-xl border-corp-blue-50 bg-white font-bold text-corp-blue-900"
              >
                <SelectValue placeholder="Tous les types">
                  {selectedType === 'all' && 'Tous les types'}
                  {selectedType === 'merchandise' && 'Marchandises'}
                  {selectedType === 'service' && 'Services'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-corp-blue-100 shadow-xl">
                <SelectItem value="all" className="font-bold">Tous les types</SelectItem>
                <SelectItem value="merchandise" className="font-medium">Marchandises</SelectItem>
                <SelectItem value="service" className="font-medium">Services</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={selectedCategory} onValueChange={(val) => { if (val) onCategoryChange(val); onSubCategoryChange('all'); }}>
            <SelectTrigger 
              aria-label="Filtrer par catégorie"
              className="w-full sm:w-[190px] h-11 rounded-xl border-corp-blue-50 bg-white font-bold text-corp-blue-900"
            >
              <SelectValue placeholder="Toutes les catégories">
                {selectedCategory === 'all' 
                  ? 'Toutes les catégories' 
                  : categories?.find(c => c.id.toString() === selectedCategory)?.description}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-corp-blue-100 shadow-xl">
              <SelectItem value="all" className="font-bold">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-sand-400" />
                  Toutes les catégories
                </div>
              </SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()} className="font-medium">
                  {cat.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={selectedSubCategory} 
            onValueChange={(val) => { if (val) onSubCategoryChange(val); }}
            disabled={selectedCategory === 'all' || filteredSubCategories.length === 0}
          >
            <SelectTrigger 
              aria-label="Filtrer par sous-catégorie"
              className="w-full sm:w-[190px] h-11 rounded-xl border-corp-blue-50 bg-white font-bold text-corp-blue-900"
            >
              <SelectValue placeholder="Toutes les sous-catégories">
                {selectedSubCategory === 'all' 
                  ? 'Toutes les sous-catégories' 
                  : filteredSubCategories.find(sub => sub.id.toString() === selectedSubCategory)?.description}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-corp-blue-100 shadow-xl">
              <SelectItem value="all" className="font-bold">Toutes les sous-catégories</SelectItem>
              {filteredSubCategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id.toString()} className="font-medium">
                  {sub.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reference Sort Selector */}
          <Select 
            value={sortDirection} 
            onValueChange={(val) => onSortDirectionChange(val as SortDirection)}
          >
            <SelectTrigger 
              aria-label="Trier par référence"
              className="w-full sm:w-[200px] h-11 rounded-xl border-corp-blue-50 bg-white font-bold text-corp-blue-900"
            >
              <SelectValue placeholder="Tri : Référence">
                {sortDirection === 'none' && (
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-sand-400" />
                    <span>Tri : Par défaut</span>
                  </div>
                )}
                {sortDirection === 'asc' && (
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-4 h-4 text-corp-blue-600" />
                    <span>Référence A → Z</span>
                  </div>
                )}
                {sortDirection === 'desc' && (
                  <div className="flex items-center gap-2">
                    <ArrowDown className="w-4 h-4 text-corp-blue-600" />
                    <span>Référence Z → A</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-corp-blue-100 shadow-xl">
              <SelectItem value="none" className="font-medium text-sand-600">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-sand-400" />
                  <span>Tri par défaut</span>
                </div>
              </SelectItem>
              <SelectItem value="asc" className="font-bold text-corp-blue-900">
                <div className="flex items-center gap-2">
                  <ArrowUp className="w-4 h-4 text-corp-blue-600" />
                  <span>Référence (A → Z)</span>
                </div>
              </SelectItem>
              <SelectItem value="desc" className="font-bold text-corp-blue-900">
                <div className="flex items-center gap-2">
                  <ArrowDown className="w-4 h-4 text-corp-blue-600" />
                  <span>Référence (Z → A)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              type="button"
              onClick={onReset}
              className="h-11 text-rose-500 font-bold hover:bg-rose-50 hover:text-rose-600 gap-2 rounded-xl px-3 transition-colors"
              title="Effacer tous les filtres"
            >
              <Filter className="w-4 h-4" />
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Filtered Articles Count Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-corp-blue-50 rounded-xl border border-corp-blue-100/50 ml-auto">
          <TreeDeciduous className="w-4 h-4 text-corp-blue-600 shrink-0" />
          <span className="text-sm font-bold text-corp-blue-900 whitespace-nowrap">
            {count} {count <= 1 ? 'Article' : 'Articles'}
          </span>
        </div>
      </div>
    </div>
  );
}

