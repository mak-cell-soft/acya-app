'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  CreditCard, 
  Building,
  FileText,
  BadgeInfo,
  Calendar,
  X,
  ExternalLink,
  Wallet,
  ArrowUpRight,
  TrendingDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Supplier, SUPPLIER_CATEGORIES, GOUVERNORATES_TN } from "@/types/customer";
import { cn } from "@/lib/utils";
import { Button } from '../ui/button';

interface SupplierDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export function SupplierDetailsDialog({
  isOpen,
  onClose,
  supplier
}: SupplierDetailsDialogProps) {
  if (!supplier) return null;

  const categoryLabel = SUPPLIER_CATEGORIES.find(c => c.id.toString() === supplier.jobtitle || c.value === supplier.jobtitle)?.value || supplier.jobtitle || "Non classé";
  const govLabel = GOUVERNORATES_TN.find(g => g.key.toString() === supplier.gouvernorate || g.value === supplier.gouvernorate)?.value || supplier.gouvernorate || "—";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl md:max-w-5xl lg:max-w-7xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-none sm:rounded-2xl bg-white">
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-corp-blue-50 flex items-center justify-center border border-corp-blue-100 text-emerald-600 font-bold text-2xl">
              {supplier.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-3xl font-bold tracking-tight">
                  {supplier.prefix} {supplier.name}
                </DialogTitle>
                <Badge variant="outline" className="border-corp-blue-100 text-emerald-600 bg-corp-blue-50/50 rounded-lg">
                  {supplier.isactive ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <p className="text-muted-foreground font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" /> {categoryLabel}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-8 h-8 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-0">
          <Tabs defaultValue="profile" className="w-full">
            <div className="px-8 bg-slate-50/50 border-b border-corp-blue-100">
              <TabsList className="h-16 bg-transparent gap-8">
                <TabsTrigger 
                  value="profile" 
                  className="h-16 rounded-none border-b-2 border-transparent data-[state=active]:border-corp-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 font-bold text-sand-400 data-[state=active]:text-corp-blue-900"
                >
                  Profil & Contact
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile" className="p-8 mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Information Card */}
                <div className="md:col-span-2 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="p-6 rounded-3xl bg-sand-50/50 border border-sand-100 space-y-4">
                      <div className="flex items-center gap-2 text-corp-blue-600 font-bold text-xs uppercase tracking-widest">
                        <BadgeInfo className="w-4 h-4" /> Identité Fiscale
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Matricule Fiscal</div>
                          <div className="font-mono font-bold text-corp-blue-900">{supplier.taxregistrationnumber || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Description</div>
                          <div className="text-sm font-medium text-sand-600 italic">"{supplier.description || "Aucune description"}"</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-sand-50/50 border border-sand-100 space-y-4">
                      <div className="flex items-center gap-2 text-corp-blue-600 font-bold text-xs uppercase tracking-widest">
                        <MapPin className="w-4 h-4" /> Localisation
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="text-[0.6rem] text-sand-300 uppercase font-bold">Adresse</div>
                          <div className="text-sm font-bold text-corp-blue-900 leading-snug">
                            {supplier.address || "Adresse non renseignée"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[0.6rem] text-sand-300 uppercase font-bold">Gouvernorat</div>
                          <div className="text-sm font-bold text-corp-blue-900">{govLabel}</div>
                        </div>
                      </div>
                      <Button variant="ghost" className="h-8 rounded-lg text-corp-blue-600 hover:bg-corp-blue-50 p-0 font-bold text-xs">
                        Voir sur Maps <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-8 rounded-2xl bg-corp-blue-50 border border-corp-blue-200 text-corp-blue-900 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                      <Phone className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 space-y-6">
                      <h4 className="font-bold text-xl">Contact Direct</h4>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                              <Phone className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[0.6rem] font-bold text-corp-blue-600 uppercase tracking-widest">Téléphone</div>
                              <div className="text-sm font-bold">{supplier.phonenumberone}</div>
                            </div>
                          </div>
                          {supplier.phonenumbertwo && (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                                <Phone className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-[0.6rem] font-bold text-corp-blue-400 uppercase tracking-widest">Bureau</div>
                                <div className="text-sm font-bold">{supplier.phonenumbertwo}</div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div className="overflow-hidden">
                              <div className="text-[0.6rem] font-bold text-corp-blue-400 uppercase tracking-widest">E-mail</div>
                              <div className="text-sm font-bold truncate">{supplier.email || "—"}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[0.6rem] font-bold text-corp-blue-400 uppercase tracking-widest">Représentant</div>
                              <div className="text-sm font-bold truncate">{supplier.firstname} {supplier.lastname}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-6">
                  <div className="p-8 rounded-2xl bg-sand-50 border border-sand-100 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Wallet className="w-24 h-24" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Situation Financière</h4>
                      <div className="text-3xl font-black text-corp-blue-900">
                        {Math.abs(supplier.openingbalance).toLocaleString('fr-TN', { minimumFractionDigits: 3 })} <span className="text-sm font-bold">TND</span>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1.5 text-xs font-bold",
                        supplier.openingbalance < 0 ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {supplier.openingbalance < 0 ? <TrendingDown className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {supplier.openingbalance < 0 ? "Dette Fournisseur" : "Crédit/Avoir"}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-sand-200 space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-sand-400 uppercase">Dernier Achat</span>
                        <span className="text-corp-blue-900">12 Mai 2026</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-sand-400 uppercase">Échéances en cours</span>
                        <span className="text-rose-600">3 Factures</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl border border-corp-blue-100 space-y-4">
                    <div className="flex items-center gap-2 text-corp-blue-600 font-bold text-xs uppercase tracking-widest">
                      <Building className="w-4 h-4" /> Banque & RIB
                    </div>
                    {supplier.bankname ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-corp-blue-50 flex items-center justify-center text-corp-blue-600 font-black text-[0.6rem]">
                            {supplier.bankname.substring(0, 3)}
                          </div>
                          <div className="text-sm font-bold text-corp-blue-900">{supplier.bankname}</div>
                        </div>
                        <div className="p-3 bg-sand-50 rounded-xl font-mono text-[0.7rem] text-sand-600 break-all leading-tight">
                          {supplier.bankaccountnumber || "RIB NON RENSEIGNÉ"}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-sand-400 italic">Aucune donnée bancaire</div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function User({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}


