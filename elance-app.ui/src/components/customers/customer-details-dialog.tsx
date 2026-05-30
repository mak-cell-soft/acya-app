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
  onOpenAccount?: (customer: Customer) => void;
}

export function CustomerDetailsDialog({
  isOpen,
  onClose,
  customer,
  onOpenAccount
}: CustomerDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [articleSearch, setArticleSearch] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [discountRate, setDiscountRate] = useState<number>(0);
  // NOTE: State hooks for date range validity (Date de début and Date de fin)
  const [validFrom, setValidFrom] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");

  const { data: pricingRules, isLoading: rulesLoading } = usePricingGrid(customer?.id || 0);
  const { data: articles } = useArticles();
  const createRule = useCreatePricingRule();
  const deleteRule = useDeletePricingRule();

  // Find the currently selected article details from the full catalog for custom display trigger
  const selectedArticle = useMemo(() => {
    if (!articles || !selectedArticleId) return null;
    return articles.find(a => a.id.toString() === selectedArticleId);
  }, [articles, selectedArticleId]);

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    const filtered = articles.filter(a => 
      a.reference.toLowerCase().includes(articleSearch.toLowerCase()) ||
      a.description.toLowerCase().includes(articleSearch.toLowerCase())
    );

    // NOTE: Radix UI Select Bug Fix
    // If the selected article is filtered out from the list of options, it displays the raw ID (e.g. "52").
    // We inject it dynamically at the start of the list to ensure the Radix Select engine can resolve the label.
    if (selectedArticle && !filtered.some(a => a.id === selectedArticle.id)) {
      return [selectedArticle, ...filtered.slice(0, 9)];
    }

    return filtered.slice(0, 10);
  }, [articles, articleSearch, selectedArticle]);

  if (!customer) return null;

  const initials = (customer.firstname?.[0] || "") + (customer.lastname?.[0] || "");
  const activityLabel = CUSTOMER_ACTIVITIES.find(a => a.key.toString() === customer.jobtitle || a.value === customer.jobtitle)?.value || customer.jobtitle || "—";
  const govLabel = GOUVERNORATES_TN.find(g => g.key.toString() === customer.gouvernorate || g.value === customer.gouvernorate)?.value || customer.gouvernorate || "—";

  // Helper to format dates to French standard (DD/MM/YYYY)
  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // Helper to construct a descriptive validity display string for the table
  const getValidityDisplay = (rule: PricingGrid) => {
    const fromStr = formatDate(rule.validfrom);
    const untilStr = formatDate(rule.validuntil);
    
    if (fromStr && untilStr) {
      return `Du ${fromStr} au ${untilStr}`;
    } else if (fromStr) {
      return `À partir du ${fromStr}`;
    } else if (untilStr) {
      return `Jusqu'au ${untilStr}`;
    } else {
      return "Permanente";
    }
  };

  // Helper to fallback to local article catalog if backend returns REF-ERR
  const getArticleRefFallback = (rule: PricingGrid) => {
    if (rule.merchandisereference && rule.merchandisereference !== "REF-ERR") {
      return rule.merchandisereference;
    }
    const article = articles?.find(
      a => a.id === rule.merchandiseid || a.id === rule.articleid
    );
    return article ? article.reference : (rule.merchandisereference || "—");
  };

  // Helper to fallback to local article catalog if backend returns Article inconnu
  const getArticleNameFallback = (rule: PricingGrid) => {
    if (rule.merchandisename && rule.merchandisename !== "Article inconnu") {
      return rule.merchandisename;
    }
    const article = articles?.find(
      a => a.id === rule.merchandiseid || a.id === rule.articleid
    );
    return article ? article.description : (rule.merchandisename || "—");
  };

  const handleAddRule = () => {
    if (!selectedArticleId || discountRate <= 0) return;
    
    // NOTE: C#/API Contract Assumption
    // The backend ResolveMerchandiseIdAsync maps the provided merchandiseid to the actual Merchandise.
    // We must pass the selected article ID under both merchandiseid and articleid to ensure the entity is correctly resolved and mapped.
    createRule.mutate({
      counterpartid: customer.id,
      merchandiseid: parseInt(selectedArticleId),
      articleid: parseInt(selectedArticleId),
      discountrate: discountRate,
      validfrom: validFrom || undefined,
      validuntil: validUntil || undefined,
      isactive: true,
      updatedbyid: 1
    });
    setSelectedArticleId("");
    setDiscountRate(0);
    setArticleSearch("");
    setValidFrom("");
    setValidUntil("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 
        NOTE: We use 'w-full max-w-full sm:max-w-xl md:max-w-4xl lg:max-w-6xl' here to explicitly override 
        the default 'sm:max-w-md' defined in the base DialogContent component (components/ui/dialog.tsx).
        Without specifying these responsive breakpoint overrides, Tailwind specificity would keep the 
        dialog restricted to md width even on desktop viewports.
      */}
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl md:max-w-4xl lg:max-w-6xl h-[90vh] p-0 overflow-hidden border-forest-100 shadow-2xl rounded-[32px] bg-white flex flex-col">
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
                          <span className="text-sm font-bold text-forest-900">{(customer.maximumsalesbar ?? 0).toLocaleString()} TND</span>
                        </div>
                      </div>
                      {/* Direct shortcut to load the account ledger statement */}
                      {onOpenAccount && (
                        <Button
                          onClick={() => onOpenAccount(customer)}
                          className="w-full mt-4 h-11 rounded-xl bg-forest-600 hover:bg-forest-800 text-white font-bold shadow-lg shadow-forest-600/20 flex items-center justify-center gap-2 transition-all"
                        >
                          <CreditCard className="w-4 h-4" />
                          État de Compte
                        </Button>
                      )}
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
                <div className="space-y-6">
                  {/* Add Rule Form */}
                  <div className="p-6 rounded-3xl bg-sand-50 border border-forest-50 space-y-4">
                    <h4 className="font-heading font-bold text-forest-900 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Ajouter une règle
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-10 gap-4 items-end">
                      <div className="space-y-2 md:col-span-3">
                        <label className="text-[0.65rem] font-bold text-sand-400 uppercase">Article</label>
                        <div>
                          <Select onValueChange={(val) => setSelectedArticleId(val || "")} value={selectedArticleId}>
                            <SelectTrigger className="h-10 rounded-xl bg-white border-forest-50 w-full !w-full">
                              <SelectValue placeholder="Choisir un article">
                                {selectedArticle ? (
                                  selectedArticle.description 
                                    ? `${selectedArticle.reference} - ${selectedArticle.description}`
                                    : selectedArticle.reference
                                ) : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-forest-100 max-h-[300px] overflow-y-auto">
                              {/* Sticky search input inside the select dropdown */}
                              <div className="p-2 sticky top-0 bg-white border-b border-forest-50 z-10" onClick={(e) => e.stopPropagation()}>
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sand-300" />
                                  <Input 
                                    className="pl-8 h-8 text-xs rounded-lg border-forest-50 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    placeholder="Rechercher..."
                                    value={articleSearch}
                                    onChange={(e) => setArticleSearch(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()} // Intercept keyboard events to prevent selecting options via space/enter
                                  />
                                </div>
                              </div>
                              {filteredArticles.length === 0 ? (
                                <div className="p-4 text-center text-xs text-sand-400">Aucun article trouvé</div>
                              ) : (
                                filteredArticles.map(a => (
                                  <SelectItem key={a.id} value={a.id.toString()}>
                                    <span className="font-bold text-xs">{a.reference}</span>
                                    {a.description && (
                                      <span className="text-[0.65rem] text-sand-400 ml-2">— {a.description}</span>
                                    )}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-1">
                        <label className="text-[0.65rem] font-bold text-sand-400 uppercase">Taux (%)</label>
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
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[0.65rem] font-bold text-sand-400 uppercase">Date Début</label>
                        <Input 
                          type="date" 
                          className="h-10 rounded-xl bg-white border-forest-50 text-xs text-forest-800"
                          value={validFrom}
                          onChange={(e) => setValidFrom(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[0.65rem] font-bold text-sand-400 uppercase">Date Fin</label>
                        <Input 
                          type="date" 
                          className="h-10 rounded-xl bg-white border-forest-50 text-xs text-forest-800"
                          value={validUntil}
                          onChange={(e) => setValidUntil(e.target.value)}
                        />
                      </div>
                      <Button 
                        className="w-full h-10 rounded-xl bg-forest-600 hover:bg-forest-800 text-white font-bold shadow-lg shadow-forest-600/20 md:col-span-2"
                        onClick={handleAddRule}
                        disabled={!selectedArticleId || discountRate <= 0}
                      >
                        Ajouter la règle
                      </Button>
                    </div>
                  </div>

                  {/* Rules Table */}
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
                                    {/* Fallback to local catalog if the relation is missing or returned REF-ERR/Article inconnu */}
                                    <div className="font-bold text-forest-900 text-sm">{getArticleRefFallback(rule)}</div>
                                    <div className="text-[0.7rem] text-sand-400 font-medium">{getArticleNameFallback(rule)}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-5">
                                <Badge className="bg-amber-50 text-amber-600 border border-amber-100 rounded-lg font-bold">
                                  -{rule.discountrate}%
                                </Badge>
                              </td>
                              <td className="p-5">
                                <span className="text-xs font-medium text-sand-500">{getValidityDisplay(rule)}</span>
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
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
