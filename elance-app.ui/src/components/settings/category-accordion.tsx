'use client';

import * as React from 'react';
import { useCategories, useUpdateCategory, useDeleteCategory, useUpdateSubCategory, useDeleteSubCategory } from '@/hooks/use-categories';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, X, FolderTree, Tag, Loader2 } from 'lucide-react';
import { CategoryFormDialog } from './category-form-dialog';

import { TablePagination } from '@/components/shared/table-pagination';

export function CategoryAccordion() {
  const { data: categories, isLoading } = useCategories();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  
  const updateSub = useUpdateSubCategory();
  const deleteSub = useDeleteSubCategory();

  const [editingCatId, setEditingCatId] = React.useState<number | null>(null);
  const [editingSubId, setEditingSubId] = React.useState<number | null>(null);
  const [editValues, setEditValues] = React.useState<any>({});
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<any>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  const paginatedCategories = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (categories || []).slice(start, start + pageSize);
  }, [categories, currentPage, pageSize]);

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [categories?.length, pageSize]);

  const openAddCategory = () => {
    setSelectedCategory(null);
    setIsDialogOpen(true);
  };

  const openAddSubCategory = (e: React.MouseEvent, cat: any) => {
    e.stopPropagation();
    setSelectedCategory(cat);
    setIsDialogOpen(true);
  };

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-corp-blue-600" />;

  return (
    <div className="space-y-6 flex flex-col">
      {/* Add Category Trigger */}
      <div className="flex justify-end">
        <Button 
          onClick={openAddCategory}
          className="bg-corp-blue-600 text-white font-bold h-11 gap-2 px-6 shadow-lg shadow-corp-blue-600/20 hover:bg-corp-blue-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Catégorie
        </Button>
      </div>

      <Accordion className="space-y-3">
        {paginatedCategories.map((cat) => (
          <AccordionItem key={cat.id} value={cat.id.toString()} className="border border-corp-blue-100 rounded-2xl px-6 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between py-1">
              <div className="flex-1 flex items-center gap-4">
                <FolderTree className="w-5 h-5 text-corp-blue-400" />
                {editingCatId === cat.id ? (
                  <div className="flex gap-2 flex-1 max-w-md">
                    <Input 
                      value={editValues.reference || ''} 
                      onChange={(e) => setEditValues({ ...editValues, reference: e.target.value })}
                      className="h-8 rounded-lg border-corp-blue-100"
                    />
                    <Input 
                      value={editValues.description || ''} 
                      onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                      className="h-8 rounded-lg border-corp-blue-100"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-corp-blue-900">{cat.reference}</span>
                      <span className="text-sand-400 text-sm font-medium">{cat.description}</span>
                    </div>
                    {cat.firstchildren && cat.firstchildren.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cat.firstchildren.slice(0, 5).map((sub: any) => (
                          <span key={sub.id} className="text-[10px] px-2 py-0.5 rounded-full bg-corp-blue-50 text-corp-blue-600 font-bold border border-corp-blue-100/50">
                            {sub.reference}
                          </span>
                        ))}
                        {cat.firstchildren.length > 5 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sand-50 text-sand-500 font-bold">
                            +{cat.firstchildren.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 mr-4">
                {editingCatId === cat.id ? (
                  <>
                    <Button onClick={() => updateCat.mutate({ id: cat.id, data: editValues }, { onSuccess: () => setEditingCatId(null) })} variant="ghost" size="icon" className="h-8 w-8 text-emerald-600">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => setEditingCatId(null)} variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={(e) => openAddSubCategory(e, cat)} 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-corp-blue-500 hover:text-corp-blue-700 hover:bg-corp-blue-50 rounded-lg"
                      title="Ajouter sous-catégories"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button onClick={(e) => { e.stopPropagation(); setEditingCatId(cat.id); setEditValues(cat); }} variant="ghost" size="icon" className="h-8 w-8 text-corp-blue-400">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button onClick={(e) => { e.stopPropagation(); deleteCat.mutate(cat.id); }} variant="ghost" size="icon" className="h-8 w-8 text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
              <AccordionTrigger className="hover:no-underline py-4" />
            </div>
            
            <AccordionContent className="pb-6 pt-2 border-t border-corp-blue-50">
              <div className="pl-9 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-sand-400 uppercase tracking-wider">Sous-catégories</h5>
                </div>

                <div className="grid gap-2">
                  {cat.firstchildren?.map((sub: any) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-sand-50/50 hover:bg-sand-50 border border-transparent hover:border-corp-blue-50 transition-all">
                      <div className="flex items-center gap-3">
                        <Tag className="w-3.5 h-3.5 text-corp-blue-300" />
                        {editingSubId === sub.id ? (
                          <div className="flex gap-2">
                            <Input 
                              value={editValues.reference || ''} 
                              onChange={(e) => setEditValues({ ...editValues, reference: e.target.value })}
                              className="h-7 text-xs rounded-lg border-corp-blue-100"
                            />
                            <Input 
                              value={editValues.description || ''} 
                              onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                              className="h-7 text-xs rounded-lg border-corp-blue-100"
                            />
                          </div>
                        ) : (
                          <div className="text-sm">
                            <span className="font-bold text-corp-blue-700">{sub.reference}</span>
                            <span className="ml-2 text-sand-500 font-medium">{sub.description}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {editingSubId === sub.id ? (
                          <>
                            <Button onClick={() => updateSub.mutate({ id: sub.id, data: editValues }, { onSuccess: () => setEditingSubId(null) })} variant="ghost" size="icon" className="h-7 w-7 text-emerald-600">
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button onClick={() => setEditingSubId(null)} variant="ghost" size="icon" className="h-7 w-7 text-red-600">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => { setEditingSubId(sub.id); setEditValues(sub); }} variant="ghost" size="icon" className="h-7 w-7 text-sand-300 hover:text-corp-blue-600">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button onClick={() => deleteSub.mutate(sub.id)} variant="ghost" size="icon" className="h-7 w-7 text-sand-300 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!cat.firstchildren || cat.firstchildren.length === 0) && (
                    <p className="text-xs text-sand-300 font-medium italic pl-1">Aucune sous-catégorie.</p>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
        {paginatedCategories.length === 0 && (
          <div className="h-32 flex items-center justify-center text-sand-400 font-medium border border-dashed border-corp-blue-100 rounded-2xl">
            Aucune catégorie disponible
          </div>
        )}
      </Accordion>

      <TablePagination 
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={categories?.length || 0}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      <CategoryFormDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        category={selectedCategory}
      />
    </div>
  );
}

