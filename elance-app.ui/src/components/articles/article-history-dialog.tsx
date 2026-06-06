'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Article } from "@/types/article";
import { useArticleHistory } from "@/hooks/use-article-history";
import { 
  History, 
  ShoppingCart, 
  Tag, 
  ListOrdered,
  X,
  User,
  Calendar,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface ArticleHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article | null;
}

export function ArticleHistoryDialog({ isOpen, onClose, article }: ArticleHistoryDialogProps) {
  const { purchaseHistory, salesHistory, catalogHistory, isLoading } = useArticleHistory(article?.id || null);

  const tvaValue = article?.tva?.value ? parseFloat(article.tva.value) / 100 : 0;

  const HistoryTable = ({ data, type }: { data: any[], type: 'purchase' | 'sales' | 'catalog' }) => {
    if (isLoading) return <LoadingSkeleton />;
    if (!data || data.length === 0) return <EmptyState type={type} />;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-corp-blue-50 bg-sand-50/50">
              <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Date</th>
              {type !== 'catalog' && (
                <>
                  <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">N° Doc</th>
                  {type === 'purchase' && <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Fournisseur</th>}
                </>
              )}
              <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Modifié par</th>
              <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-right">P.U HT</th>
              <th className="p-4 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-right">P.U TTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corp-blue-50">
            {data.map((item, idx) => {
              const date = item.transactiondate || item.creationdate;
              const priceTTC = item.pricevalue;
              const priceHT = type === 'catalog' ? (priceTTC / (1 + tvaValue)) : priceTTC; // BackEnd for purchase/sales seems to send HT in pricevalue? Angular code says: pricevalueHT = element.pricevalue
              // Re-checking Angular: 
              // Catalog: HT = pricevalue / (1 + articleTvaValue), TTC = pricevalue
              // Sales: HT = pricevalue, TTC = pricevalue * (1 + articleTvaValue)
              // Purchase: HT = pricevalue, TTC = pricevalue * (1 + articleTvaValue)
              
              let finalHT, finalTTC;
              if (type === 'catalog') {
                finalTTC = priceTTC;
                finalHT = priceTTC / (1 + tvaValue);
              } else {
                finalHT = priceTTC;
                finalTTC = priceTTC * (1 + tvaValue);
              }

              return (
                <tr key={idx} className="hover:bg-corp-blue-50/30 transition-colors">
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-sand-300" />
                      <span className="text-sm font-medium text-corp-blue-900">
                        {date ? format(new Date(date), "dd/MM/yyyy", { locale: fr }) : '--'}
                      </span>
                    </div>
                  </td>
                  {type !== 'catalog' && (
                    <>
                      <td className="p-4">
                        <Badge variant="outline" className={cn(
                          "font-bold rounded-lg px-2",
                          type === 'sales' ? "border-amber-100 bg-amber-50 text-amber-600" : "border-corp-blue-100 bg-corp-blue-50 text-corp-blue-600"
                        )}>
                          {item.docnumber}
                        </Badge>
                      </td>
                      {type === 'purchase' && (
                        <td className="p-4">
                          <span className="text-sm font-bold text-corp-blue-900">{item.counterpartname || '--'}</span>
                        </td>
                      )}
                    </>
                  )}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-sand-300" />
                      <span className="text-sm text-sand-400 font-medium">{item.updatedby_name || 'Système'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-sm font-bold text-corp-blue-900">{finalHT.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-sm font-bold text-corp-blue-600 bg-corp-blue-50 px-2 py-1 rounded-lg">
                      {finalTTC.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* // NOTE: Using responsive width constraints (w-full max-w-full on mobile, scaling up to md:max-w-4xl on desktop)
          // to override the default DialogContent max-width layout limits and prevent table compression. */}
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl md:max-w-4xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-none sm:rounded-2xl bg-white">
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-corp-blue-50 flex items-center justify-center border border-corp-blue-100">
              <History className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">Historique des Prix</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/30 font-bold">
                  {article?.reference}
                </Badge>
                <span className="text-muted-foreground text-sm font-medium">{article?.description}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-8 h-8 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-8">
          <Tabs defaultValue="catalog" className="w-full">
            <TabsList className="grid grid-cols-3 h-14 p-1.5 bg-sand-100 rounded-[20px] mb-8">
              <TabsTrigger value="catalog" className="rounded-2xl font-bold data-[state=active]:bg-white data-[state=active]:text-corp-blue-900 data-[state=active]:shadow-lg gap-2">
                <Tag className="w-4 h-4" /> Catalogue
              </TabsTrigger>
              <TabsTrigger value="sales" className="rounded-2xl font-bold data-[state=active]:bg-white data-[state=active]:text-corp-blue-900 data-[state=active]:shadow-lg gap-2">
                <ShoppingCart className="w-4 h-4" /> Ventes
              </TabsTrigger>
              <TabsTrigger value="purchase" className="rounded-2xl font-bold data-[state=active]:bg-white data-[state=active]:text-corp-blue-900 data-[state=active]:shadow-lg gap-2">
                <ListOrdered className="w-4 h-4" /> Achats
              </TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="mt-0 focus-visible:outline-none">
              <div className="rounded-xl border border-corp-blue-50 overflow-hidden bg-sand-50/30">
                <HistoryTable data={catalogHistory.data || []} type="catalog" />
              </div>
            </TabsContent>

            <TabsContent value="sales" className="mt-0 focus-visible:outline-none">
              <div className="rounded-xl border border-corp-blue-50 overflow-hidden bg-sand-50/30">
                <HistoryTable data={salesHistory.data || []} type="sales" />
              </div>
            </TabsContent>

            <TabsContent value="purchase" className="mt-0 focus-visible:outline-none">
              <div className="rounded-xl border border-corp-blue-50 overflow-hidden bg-sand-50/30">
                <HistoryTable data={purchaseHistory.data || []} type="purchase" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  const icons = {
    catalog: Tag,
    sales: ShoppingCart,
    purchase: ListOrdered
  };
  const Icon = icons[type as keyof typeof icons] || History;

  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <div className="w-16 h-16 rounded-3xl bg-sand-100 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-sand-300" />
      </div>
      <h4 className="text-corp-blue-900 font-bold text-lg">Aucun historique</h4>
      <p className="text-sand-400 font-medium max-w-[240px] mt-2">
        Il n&apos;y a pas encore d&apos;enregistrements pour cette catégorie.
      </p>
    </div>
  );
}



