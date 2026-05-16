'use client';

import { Search, Filter, X, LayoutGrid, TreeDeciduous } from 'lucide-react';
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
import { useMemo } from 'react';

interface ArticleFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedSubCategory: string;
  onSubCategoryChange: (value: string) => void;
  onReset: () => void;
  count: number;
}

export function ArticleFilters({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSubCategory,
  onSubCategoryChange,
  onReset,
  count
}: ArticleFiltersProps) {
  const { data: categories } = useCategories();

  const filteredSubCategories = useMemo(() => {
    if (!selectedCategory || !categories) return [];
    const cat = categories.find(c => c.id.toString() === selectedCategory);
    return cat?.firstchildren || [];
  }, [selectedCategory, categories]);

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 p-6 border-b border-forest-50 bg-white/50 backdrop-blur-sm">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
        <Input 
          placeholder="Rechercher par référence, désignation..." 
          className="pl-10 h-11 rounded-xl border-forest-50 bg-sand-50/50 focus:border-forest-600 focus:ring-forest-600 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-300 hover:text-forest-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedCategory} onValueChange={(val) => { if (val) onCategoryChange(val); onSubCategoryChange('all'); }}>
          <SelectTrigger className="w-[200px] h-11 rounded-xl border-forest-50 bg-white font-bold text-forest-900">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-forest-100 shadow-xl">
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
          <SelectTrigger className="w-[200px] h-11 rounded-xl border-forest-50 bg-white font-bold text-forest-900">
            <SelectValue placeholder="Toutes les sous-catégories" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-forest-100 shadow-xl">
            <SelectItem value="all" className="font-bold">Toutes les sous-catégories</SelectItem>
            {filteredSubCategories.map((sub) => (
              <SelectItem key={sub.id} value={sub.id.toString()} className="font-medium">
                {sub.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-6 w-[1px] bg-forest-100 mx-1 hidden md:block" />

        {(searchTerm || selectedCategory !== 'all' || selectedSubCategory !== 'all') && (
          <Button 
            variant="ghost" 
            onClick={onReset}
            className="h-11 rounded-xl text-rose-500 font-bold hover:bg-rose-50 hover:text-rose-600 gap-2"
          >
            <Filter className="w-4 h-4" />
            Réinitialiser
          </Button>
        )}

        <div className="flex items-center gap-2 px-4 py-2 bg-forest-50 rounded-xl border border-forest-100/50">
          <TreeDeciduous className="w-4 h-4 text-forest-600" />
          <span className="text-sm font-bold text-forest-900 whitespace-nowrap">{count} Articles</span>
        </div>
      </div>
    </div>
  );
}
