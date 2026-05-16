'use client';

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Customer, 
  PricingGrid, 
  CUSTOMER_ACTIVITIES, 
  GOUVERNORATES_TN 
} from "@/types/customer";
import { 
  User, 
  Tag, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Plus, 
  Trash2, 
  Search,
  ChevronRight,
  Info,
  BadgeInfo,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePricingGrid, useCreatePricingRule, useDeletePricingRule } from "@/hooks/use-pricing-grid";
import { useArticles } from "@/hooks/use-articles";
import { cn } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface CustomerDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export function CustomerDetailsDialog({
  isOpen,
  onClose,
  customer
}: CustomerDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [articleSearch, setArticleSearch] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [discountRate, setDiscountRate] = useState<number>(0);

  const { data: pricingRules, isLoading: rulesLoading } = usePricingGrid(customer?.id || 0);
  const { data: articles } = useArticles();
  const createRule = useCreatePricingRule();
  const deleteRule = useDeletePricingRule();

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    return articles.filter(a => 
      a.reference.toLowerCase().includes(articleSearch.toLowerCase()) ||
      a.description.toLowerCase().includes(articleSearch.toLowerCase())
    ).slice(0, 10);
  }, [articles, articleSearch]);

  if (!customer) return null;

  const initials = (customer.firstname?.[0] || "") + (customer.lastname?.[0] || "");
  const activityLabel = CUSTOMER_ACTIVITIES.find(a => a.key.toString() === customer.jobtitle || a.value === customer.jobtitle)?.value || customer.jobtitle || "—";
  const govLabel = GOUVERNORATES_TN.find(g => g.key.toString() === customer.gouvernorate || g.value === customer.gouvernorate)?.value || customer.gouvernorate || "—";

  const handleAddRule = () => {
    if (!selectedArticleId || discountRate <= 0) return;
    createRule.mutate({
      counterpartid: customer.id,
      articleid: parseInt(selectedArticleId),
      discountrate: discountRate,
      isactive: true,
      updatedbyid: 1
    });
    setSelectedArticleId("");
    setDiscountRate(0);
    setArticleSearch("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden border-forest-100 shadow-2xl rounded-[32px] bg-white flex flex-col">
        <DialogHeader className="p-8 bg-forest-900 text-white relative flex-shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-forest-800 to-forest-700 flex items-center justify-center border border-forest-600 text-emerald-400 font-heading text-2xl font-bold shadow-inner">
              {initials || "CL"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <DialogTitle className="font-heading text-3xl font-bold tracking-tight">
                  {customer.firstname} {customer.lastname}
                </DialogTitle>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-none rounded-lg px-2 font-bold text-xs">
                  {customer.prefix}
                </Badge>
              </div>
              <p className="text-forest-300 text-sm font-medium mt-1 flex items-center gap-2">
                <Info className="w-4 h-4" /> {customer.name || "Client Régulier"} • ID: {customer.id}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
            <div className="px-8 border-b border-forest-50 bg-sand-50/30 flex-shrink-0">
              <TabsList className="bg-transparent h-14 p-0 gap-8">
                <TabsTrigger value="info" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-forest-600 data-[state=active]:bg-transparent data-[state=active]:text-forest-900 data-[state=active]:shadow-none font-bold text-sand-400 gap-2 px-1">
                  <User className="w-4 h-4" /> Profil & Contact
                </TabsTrigger>
                <TabsTrigger value="grid" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-forest-600 data-[state=active]:bg-transparent data-[state=active]:text-forest-900 data-[state=active]:shadow-none font-bold text-sand-400 gap-2 px-1">
                  <Tag className="w-4 h-4" /> Grille Tarifaire
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
              <TabsContent value="info" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Personal Info Card */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-[24px] bg-white border border-forest-50 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-forest-600">
                          <BadgeInfo className="w-4 h-4" />
                          <h4 className="text-[0.65rem] font-bold uppercase tracking-widest text-sand-400">Détails Identité</h4>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="text-[0.6rem] text-sand-300 uppercase font-bold">Raison Sociale</div>
                            <div className="font-bold text-forest-900">{customer.name || "—"}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-[0.6rem] text-sand-300 uppercase font-bold">Activité</div>
                              <div className="text-sm font-bold text-forest-800">{activityLabel}</div>
                            </div>
                            <div>
                              <div className="text-[0.6rem] text-sand-300 uppercase font-bold">CIN</div>
                              <div className="text-sm font-mono text-sand-600">{customer.identitycardnumber || "—"}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-[0.6rem] text-sand-300 uppercase font-bold">Matricule Fiscal</div>
                              <div className="text-sm font-mono text-sand-600">{customer.taxregistrationnumber || "—"}</div>
                            </div>
                            <div>
                              <div className="text-[0.6rem] text-sand-300 uppercase font-bold">Patente</div>
                              <div className="text-sm font-mono text-sand-600">{customer.patentecode || "—"}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-[24px] bg-white border border-forest-50 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-forest-600">
                          <MapPin className="w-4 h-4" />
                          <h4 className="text-[0.65rem] font-bold uppercase tracking-widest text-sand-400">Localisation</h4>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="text-[0.6rem] text-sand-300 uppercase font-bold">Adresse</div>
                            <div className="text-sm font-medium text-forest-800 leading-relaxed">{customer.address}</div>
                          </div>
                          <div>
                            <div className="text-[0.6rem] text-sand-300 uppercase font-bold">Gouvernorat</div>
                            <div className="text-sm font-bold text-forest-900">{govLabel}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-[24px] bg-forest-900 text-white shadow-xl space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Phone className="w-4 h-4" />
                        <h4 className="text-[0.65rem] font-bold uppercase tracking-widest text-forest-300">Contact & Communication</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-forest-800 flex items-center justify-center">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[0.6rem] text-forest-400 uppercase font-bold">Principal</div>
                            <div className="text-sm font-bold">{customer.phonenumberone}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-forest-800 flex items-center justify-center">
                            <Phone className="w-4 h-4 opacity-50" />
                          </div>
                          <div>
                            <div className="text-[0.6rem] text-forest-400 uppercase font-bold">Secondaire</div>
                            <div className="text-sm font-bold">{customer.phonenumbertwo || "—"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-forest-800 flex items-center justify-center">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[0.6rem] text-forest-400 uppercase font-bold">Email</div>
                            <div className="text-sm font-bold truncate max-w-[150px]">{customer.email || "—"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary Card */}
                  <div className="space-y-6">
                    <div className="p-8 rounded-[32px] bg-sand-50 border border-forest-50 shadow-inner flex flex-col items-center text-center space-y-6">
                      <CreditCard className="w-12 h-12 text-forest-600" />
                      <div>
                        <div className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest mb-1">Solde Actuel</div>
                        <div className="text-4xl font-heading font-bold text-forest-900 tracking-tight">
                          {customer.openingbalance.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                        </div>
                        <div className="text-[0.6rem] font-bold text-sand-300 uppercase mt-1">TND</div>
                      </div>
                      <div className="w-full space-y-3 pt-6 border-t border-forest-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.65rem] font-bold text-sand-400 uppercase">Remise Max.</span>
                          <Badge className="bg-forest-100 text-forest-700 border-none font-bold">{customer.maximumdiscount}%</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[0.65rem] font-bold text-sand-400 uppercase">Plafond</span>
                          <span className="text-sm font-bold text-forest-900">{customer.maximumsalesbar.toLocaleString()} TND</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 rounded-[24px] bg-white border border-forest-50 space-y-3">
                      <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Notes internes
                      </div>
                      <p className="text-sm text-sand-600 italic leading-relaxed">
                        {customer.notes || "Aucune note particulière pour ce client."}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="grid" className="m-0 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {/* Add Rule Form */}
                  <div className="md:col-span-1 space-y-6">
                    <div className="p-6 rounded-3xl bg-sand-50 border border-forest-50 space-y-6">
                      <h4 className="font-heading font-bold text-forest-900 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Ajouter une règle
                      </h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[0.65rem] font-bold text-sand-400 uppercase">Rechercher Article</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                            <Input 
                              className="pl-10 h-10 rounded-xl bg-white border-forest-50"
                              placeholder="Réf ou désignation..."
                              value={articleSearch}
                              onChange={(e) => setArticleSearch(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[0.65rem] font-bold text-sand-400 uppercase">Sélection Article</label>
                          <Select onValueChange={(val) => setSelectedArticleId(val || "")} value={selectedArticleId}>
                            <SelectTrigger className="h-10 rounded-xl bg-white border-forest-50">
                              <SelectValue placeholder="Choisir un article" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-forest-100">
                              {filteredArticles.map(a => (
                                <SelectItem key={a.id} value={a.id.toString()}>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-xs">{a.reference}</span>
                                    <span className="text-[0.6rem] text-sand-400 truncate max-w-[200px]">{a.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[0.65rem] font-bold text-sand-400 uppercase">Taux de Remise (%)</label>
                          <div className="relative">
                            <Input 
                              type="number" 
                              className="h-10 rounded-xl bg-white border-forest-50 font-bold"
                              value={discountRate}
                              onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-300 font-bold">%</span>
                          </div>
                        </div>
                        <Button 
                          className="w-full h-12 rounded-xl bg-forest-600 hover:bg-forest-800 text-white font-bold shadow-lg shadow-forest-600/20"
                          onClick={handleAddRule}
                          disabled={!selectedArticleId || discountRate <= 0}
                        >
                          Ajouter la règle
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Rules Table */}
                  <div className="md:col-span-3">
                    <div className="rounded-[24px] border border-forest-50 overflow-hidden shadow-sm bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-sand-50/50 border-b border-forest-50">
                            <th className="p-5 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Article</th>
                            <th className="p-5 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Remise</th>
                            <th className="p-5 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Validité</th>
                            <th className="p-5 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-forest-50">
                          {rulesLoading ? (
                            <tr>
                              <td colSpan={4} className="p-10 text-center text-sand-300 italic">Chargement des règles...</td>
                            </tr>
                          ) : pricingRules && pricingRules.length > 0 ? (
                            pricingRules.map((rule) => (
                              <tr key={rule.id} className="hover:bg-sand-50/30 transition-colors">
                                <td className="p-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-forest-50 flex items-center justify-center text-forest-600">
                                      <Tag className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-forest-900 text-sm">{rule.merchandisereference || "REF-???"}</div>
                                      <div className="text-[0.7rem] text-sand-400 font-medium">{rule.merchandisename || "—"}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-5">
                                  <Badge className="bg-amber-50 text-amber-600 border border-amber-100 rounded-lg font-bold">
                                    -{rule.discountrate}%
                                  </Badge>
                                </td>
                                <td className="p-5">
                                  <span className="text-xs font-medium text-sand-500">Permanente</span>
                                </td>
                                <td className="p-5 text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50"
                                    onClick={() => deleteRule.mutate({ id: rule.id, counterPartId: customer.id })}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-10 text-center space-y-4">
                                <div className="flex flex-col items-center gap-2">
                                  <Tag className="w-8 h-8 text-sand-200" />
                                  <p className="text-sand-400 font-medium">Aucune règle négociée pour ce client.</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
