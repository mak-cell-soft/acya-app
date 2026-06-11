'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { 
  Plus, 
  MoreHorizontal, 
  Download, 
  Upload,
  History,
  Edit,
  Trash2,
  AlertCircle,
  ChevronDown,
  QrCode,
  Package,
  Layers,
  ArrowUpCircle,
  TreeDeciduous,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useArticles, useCreateArticle, useUpdateArticle, useDeleteArticle } from '@/hooks/use-articles';
import { useStockAll } from '@/hooks/use-stock';
import { ArticleFilters } from '@/components/articles/article-filters';
import { DeleteConfirmDialog } from '@/components/articles/delete-confirm-dialog';
import { ArticleHistoryDialog } from '@/components/articles/article-history-dialog';
import { ArticleFormDialog } from '@/components/articles/article-form-dialog';
import { Article } from '@/types/article';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePagination } from '@/components/shared/table-pagination';
import { useQueryClient } from '@tanstack/react-query';
import { DataImportDialog } from '@/components/shared/data-import-dialog';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import * as XLSX from 'xlsx';

export default function ArticlesPage() {
  // State for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // State for expand/collapse
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // State for dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const queryClient = useQueryClient();
  const { hasPermission } = usePermissionGuard();

  // Queries and Mutations
  const { data: articles, isLoading: isArticlesLoading } = useArticles();
  // NOTE: Retrieve real-time stock details globally to map them to active articles dynamically
  const { data: stocks, isLoading: isStockLoading } = useStockAll();
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle();
  const deleteArticle = useDeleteArticle();

  // Helper to format stock quantities depending on their unit type (e.g. cubic meters M3 need 3 decimals precision)
  const formatQuantity = (qty: number, unit?: string | null) => {
    const isM3 = unit?.toUpperCase().includes('M3') || unit?.toUpperCase().includes('MÈTRE 3') || unit?.toUpperCase().includes('METRE 3');
    if (isM3) {
      return qty.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
    }
  };

  // Group and sum stock quantities by article ID to easily look them up when rendering the "Aperçu Stock" detail panel
  const stockMap = useMemo(() => {
    const map = new Map<number, { total: number; breakdown: { siteName: string; quantity: number; unit: string }[] }>();
    if (!stocks) return map;
    
    stocks.forEach(stock => {
      const articleId = stock.merchandise?.article?.id;
      if (!articleId) return;
      
      const qty = stock.quantity || 0;
      const siteName = stock.site ? `${stock.site.gov || ''} - ${stock.site.address || ''}`.trim() : 'Dépôt Central';
      const unit = stock.merchandise?.article?.unit || 'PCS';
      
      const existing = map.get(articleId) || { total: 0, breakdown: [] };
      existing.total += qty;
      
      const siteBreakdown = existing.breakdown.find(b => b.siteName === siteName);
      if (siteBreakdown) {
        siteBreakdown.quantity += qty;
      } else {
        existing.breakdown.push({ siteName, quantity: qty, unit });
      }
      
      map.set(articleId, existing);
    });
    
    return map;
  }, [stocks]);

  // Client-side filtering
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    
    return articles.filter(article => {
      const matchesSearch = 
        article.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.description.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesCategory = selectedCategory === 'all' || article.categoryid.toString() === selectedCategory;
      const matchesSubCategory = selectedSubCategory === 'all' || article.subcategoryid.toString() === selectedSubCategory;
      
      return matchesSearch && matchesCategory && matchesSubCategory;
    });
  }, [articles, searchTerm, selectedCategory, selectedSubCategory]);

  // Paginated articles
  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredArticles.slice(startIndex, startIndex + pageSize);
  }, [filteredArticles, currentPage, pageSize]);

  // Handlers
  const handleCreate = (model: any) => {
    createArticle.mutate(model, {
      onSuccess: () => setIsFormOpen(false)
    });
  };

  const handleUpdate = (model: any) => {
    if (selectedArticle) {
      updateArticle.mutate({ id: selectedArticle.id, model }, {
        onSuccess: () => {
          setIsFormOpen(false);
          setSelectedArticle(null);
        }
      });
    }
  };

  const handleDelete = () => {
    if (selectedArticle) {
      deleteArticle.mutate(selectedArticle.id, {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setSelectedArticle(null);
        }
      });
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedSubCategory('all');
    setCurrentPage(1);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExport = () => {
    if (!articles || articles.length === 0) return;

    const exportData = articles.map(article => ({
      'Référence': article.reference || '',
      'Désignation': article.description || '',
      'Catégorie': article.category?.description || '',
      'Sous-Catégorie': article.subcategory?.description || '',
      'Est Bois (O/N)': article.iswood ? 'O' : 'N',
      'Epaisseur': article.thickness?.name || '',
      'Largeur': article.width?.name || '',
      'Longueurs': article.lengths || '',
      'Unité': article.unit || '',
      'P.U HT': article.sellprice_ht || 0,
      'TVA (%)': article.tva?.value || 0,
      'P.U TTC (TND)': article.sellprice_ttc || 0,
      'Marge Profit (%)': article.profitmarginpercentage || 0,
      'Prix Achat TTC': article.lastpurchaseprice_ttc || 0,
      'Seuil Alerte': article.minquantity || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Articles');
    
    const maxWidths = exportData.reduce((acc: any, row) => {
      Object.keys(row).forEach(key => {
        const val = row[key as keyof typeof row]?.toString() || '';
        acc[key] = Math.max(acc[key] || key.length, val.length);
      });
      return acc;
    }, {});
    
    worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[key] + 2 }));

    XLSX.writeFile(workbook, `articles_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-corp-blue-900">Gestion des Articles</h1>
            <p className="text-sand-400 font-medium mt-1">Gérez votre catalogue de bois, panneaux et accessoires.</p>
          </div>
          <div className="flex items-center gap-3">
            {hasPermission('articles', 'canAdd') && (
              <Button 
                variant="outline" 
                onClick={() => setIsImportOpen(true)}
                className="h-11 rounded-xl border-corp-blue-100 text-corp-blue-600 font-bold hover:bg-corp-blue-50 px-6"
              >
                <Layers className="w-4 h-4 mr-2" /> Import / Export
              </Button>
            )}
            {hasPermission('articles', 'canAdd') && (
              <Button 
                className="h-11 bg-corp-blue-600 text-white hover:bg-corp-blue-800 font-bold shadow-lg shadow-corp-blue-600/20 px-6"
                onClick={() => { setSelectedArticle(null); setIsFormOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-2" /> Nouvel Article
              </Button>
            )}
          </div>
        </header>

        {/* Filters and Table Card */}
        <Card className="border-corp-blue-100/50 shadow-2xl shadow-corp-blue-900/5 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-md">
          <ArticleFilters 
            searchTerm={searchTerm}
            onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            selectedCategory={selectedCategory}
            onCategoryChange={(val) => { setSelectedCategory(val); setCurrentPage(1); }}
            selectedSubCategory={selectedSubCategory}
            onSubCategoryChange={(val) => { setSelectedSubCategory(val); setCurrentPage(1); }}
            onReset={handleResetFilters}
            count={filteredArticles.length}
          />

          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full min-w-[1000px] text-left border-collapse">
                <thead>
                  <tr className="bg-sand-50/50 border-b border-corp-blue-50">
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest pl-8">
                      <div className="flex items-center gap-2"><QrCode className="w-3 h-3" /> Référence</div>
                    </th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Désignation</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Catégorie</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-right">P.U TTC (TND)</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">TVA</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-right">P.U HT</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-blue-50">
                  {isArticlesLoading ? (
                    <TableSkeleton />
                  ) : filteredArticles.length === 0 ? (
                    <EmptyState />
                  ) : (
                    paginatedArticles.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr 
                          className={cn(
                            "group hover:bg-corp-blue-50/30 transition-all duration-300 cursor-pointer border-l-4 border-transparent",
                            expandedId === item.id && "bg-corp-blue-50/50 border-corp-blue-600"
                          )}
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        >
                          <td className="p-5 pl-8">
                            <span className="font-bold text-corp-blue-900">{item.reference}</span>
                          </td>
                          <td className="p-5">
                            <div className="font-medium text-sand-800">{item.description}</div>
                            <div className="text-[0.7rem] text-sand-400 font-bold uppercase tracking-wider mt-0.5">{item.subcategory?.description}</div>
                          </td>
                          <td className="p-5">
                            <Badge variant="outline" className="bg-white border-corp-blue-100 text-corp-blue-600 font-bold rounded-lg px-2.5 py-1">
                              {item.category?.description}
                            </Badge>
                          </td>
                          <td className="p-5 text-right">
                            <span className="font-bold text-corp-blue-900">{item.sellprice_ttc.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}</span>
                          </td>
                          <td className="p-5 text-center">
                            <Badge className="bg-corp-blue-100 text-corp-blue-600 hover:bg-corp-blue-200 border-none font-bold rounded-lg">
                              {item.tva?.value}
                            </Badge>
                          </td>
                          <td className="p-5 text-right">
                            <span className="font-medium text-sand-400">{item.sellprice_ht.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}</span>
                          </td>
                          <td className="p-5 text-right pr-8">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-sand-300 hover:text-corp-blue-600 hover:bg-corp-blue-100/50 transition-all"
                                onClick={(e) => { e.stopPropagation(); setSelectedArticle(item); setIsHistoryOpen(true); }}
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 text-sand-300 hover:text-corp-blue-900">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl border-corp-blue-100 w-48 shadow-xl p-2">
                                  {hasPermission('articles', 'canUpdate') && (
                                    <DropdownMenuItem 
                                      className="gap-2 font-bold text-corp-blue-900 cursor-pointer rounded-xl h-11"
                                      onClick={() => { setSelectedArticle(item); setIsFormOpen(true); }}
                                    >
                                      <Edit className="w-4 h-4" /> Modifier
                                    </DropdownMenuItem>
                                  )}
                                  {hasPermission('articles', 'canDelete') && (
                                    <DropdownMenuItem 
                                      className="gap-2 font-bold text-rose-600 cursor-pointer hover:text-rose-700 hover:bg-rose-50 rounded-xl h-11"
                                      onClick={() => { setSelectedArticle(item); setIsDeleteOpen(true); }}
                                    >
                                      <Trash2 className="w-4 h-4" /> Supprimer
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <div className="p-1 rounded-full bg-corp-blue-50/50">
                                <ChevronDown className={cn("w-4 h-4 text-corp-blue-300 transition-transform duration-500", expandedId === item.id && "rotate-180 text-corp-blue-600")} />
                              </div>
                            </div>
                          </td>
                        </tr>
                        
                        <AnimatePresence>
                          {expandedId === item.id && (
                            <tr>
                              <td colSpan={7} className="p-0 border-none">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                  className="overflow-hidden bg-gradient-to-b from-corp-blue-50/50 to-transparent border-b border-corp-blue-50"
                                >
                                  <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-12 ml-4">
                                    {item.iswood ? (
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">
                                          <TreeDeciduous className="w-3 h-3" /> Propriétés Bois
                                        </div>
                                        <div className="grid grid-cols-2 gap-8">
                                          <div className="bg-white p-4 rounded-2xl border border-corp-blue-100 shadow-sm">
                                            <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-tighter">Épaisseur</div>
                                            <div className="text-lg font-bold text-corp-blue-900 mt-1">{item.thickness?.name || '--'} <small className="text-sand-300 font-medium">mm</small></div>
                                          </div>
                                          <div className="bg-white p-4 rounded-2xl border border-corp-blue-100 shadow-sm">
                                            <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-tighter">Largeur</div>
                                            <div className="text-lg font-bold text-corp-blue-900 mt-1">{item.width?.name || '--'} <small className="text-sand-300 font-medium">mm</small></div>
                                          </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-corp-blue-100 shadow-sm">
                                          <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-tighter">Longueurs</div>
                                          <div className="text-sm font-bold text-corp-blue-900 mt-2 flex flex-wrap gap-2">
                                            {item.lengths?.replace('[', '').replace(']', '').split(',').map((l, i) => (
                                              <Badge key={i} className="bg-corp-blue-50 text-corp-blue-600 border-corp-blue-100 rounded-lg">{l.trim()} cm</Badge>
                                            )) || '--'}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">
                                          <Package className="w-3 h-3" /> Unité & Stock
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-corp-blue-100 shadow-sm flex items-center justify-between">
                                          <div>
                                            <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Unité de vente</div>
                                            <div className="text-xl font-bold text-corp-blue-900 mt-1">{item.unit}</div>
                                          </div>
                                          <div className="w-12 h-12 rounded-xl bg-corp-blue-50 flex items-center justify-center">
                                            <Layers className="w-6 h-6 text-corp-blue-600" />
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    <div className="space-y-4 border-l border-corp-blue-100/50 pl-12">
                                      <div className="flex items-center gap-2 text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">
                                        <AlertCircle className="w-3 h-3" /> Seuil & Profit
                                      </div>
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                                          <span className="text-sm font-bold text-amber-700">Seuil d&apos;alerte</span>
                                          <span className="text-lg font-bold text-amber-600">{item.minquantity} <small className="text-[0.6rem]">{item.unit}</small></span>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-corp-blue-50/50 rounded-2xl border border-corp-blue-100">
                                          <span className="text-sm font-bold text-corp-blue-700">Marge Profit</span>
                                          <span className="text-lg font-bold text-corp-blue-600">{item.profitmarginpercentage}%</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-4 border-l border-corp-blue-100/50 pl-12">
                                      <div className="flex items-center gap-2 text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">
                                        <History className="w-3 h-3" /> Aperçu Stock
                                      </div>
                                      
                                      <div className="flex flex-col items-center justify-center py-4 bg-white rounded-3xl border border-corp-blue-50 shadow-sm">
                                        {isStockLoading ? (
                                          <div className="flex flex-col items-center gap-2 py-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-corp-blue-600" />
                                            <span className="text-[0.6rem] font-bold text-sand-300 uppercase tracking-widest">Chargement...</span>
                                          </div>
                                        ) : (
                                          <>
                                            <div className={cn(
                                              "text-3xl font-bold tracking-tighter transition-colors duration-300",
                                              (stockMap.get(item.id)?.total || 0) === 0 ? "text-rose-500" : "text-corp-blue-900"
                                            )}>
                                              {formatQuantity(stockMap.get(item.id)?.total || 0, item.unit)}
                                            </div>
                                            <div className="text-[0.65rem] font-bold text-sand-300 uppercase mt-1 tracking-widest">
                                              Stock Total ({item.unit})
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {!isStockLoading && (stockMap.get(item.id)?.breakdown || []).length > 0 && (
                                        <div className="space-y-2 mt-3 max-h-36 overflow-y-auto pr-1">
                                          {(stockMap.get(item.id)?.breakdown || []).map((b, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-sand-50/50 hover:bg-sand-50 p-2.5 rounded-xl border border-corp-blue-50/40 text-[0.75rem] transition-colors">
                                              <span className="text-sand-600 font-medium truncate max-w-[150px]" title={b.siteName}>
                                                {b.siteName}
                                              </span>
                                              <span className="font-bold text-corp-blue-900 font-mono">
                                                {formatQuantity(b.quantity, b.unit)} <span className="text-[0.65rem] font-sans font-medium text-sand-450">{b.unit}</span>
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {!isStockLoading && (stockMap.get(item.id)?.breakdown || []).length === 0 && (
                                        <div className="text-center py-4 text-xs italic text-sand-300 bg-sand-50/30 rounded-2xl border border-dashed border-corp-blue-100">
                                          Aucun stock disponible
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination / Footer */}
            {!isArticlesLoading && filteredArticles.length > 0 && (
              <div className="p-6 border-t border-corp-blue-50 bg-white/50 backdrop-blur-sm">
                <TablePagination
                  currentPage={currentPage}
                  totalItems={filteredArticles.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Scroll Top */}
      <button 
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 w-12 h-12 bg-corp-blue-900 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all group z-50 border border-corp-blue-700"
      >
        <ArrowUpCircle className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
      </button>

      {/* Dialogs */}
      <ArticleFormDialog 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={selectedArticle ? handleUpdate : handleCreate}
        editArticle={selectedArticle}
        isLoading={createArticle.isPending || updateArticle.isPending}
      />

      <ArticleHistoryDialog 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        article={selectedArticle}
      />

      <DeleteConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer l'article"
        description={`Êtes-vous sûr de vouloir supprimer l'article "${selectedArticle?.reference}" ? Cette action est irréversible.`}
        isLoading={deleteArticle.isPending}
      />

      <DataImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        type="article"
        onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['articles'] })}
        onExportXlsx={handleExport}
      />
    </DashboardLayout>
  );
}

function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i}>
          <td className="p-5 pl-8"><Skeleton className="h-6 w-24 rounded-lg" /></td>
          <td className="p-5"><Skeleton className="h-6 w-48 rounded-lg" /><Skeleton className="h-4 w-32 mt-2 rounded-lg" /></td>
          <td className="p-5"><Skeleton className="h-8 w-24 rounded-lg" /></td>
          <td className="p-5"><Skeleton className="h-6 w-20 ml-auto rounded-lg" /></td>
          <td className="p-5 text-center"><Skeleton className="h-6 w-12 mx-auto rounded-lg" /></td>
          <td className="p-5"><Skeleton className="h-6 w-20 ml-auto rounded-lg" /></td>
          <td className="p-5"><Skeleton className="h-10 w-24 ml-auto rounded-xl" /></td>
        </tr>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={7} className="p-20 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-sand-50 flex items-center justify-center mb-6">
            <Package className="w-10 h-10 text-sand-200" />
          </div>
          <h3 className="text-corp-blue-900 text-xl font-bold">Aucun article trouvé</h3>
          <p className="text-sand-400 font-medium max-w-[300px] mt-2">
            Nous n&apos;avons trouvé aucun article correspondant à vos critères de recherche.
          </p>
        </div>
      </td>
    </tr>
  );
}

