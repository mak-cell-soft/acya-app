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
import { Supplier, SUPPLIER_CATEGORIES } from "@/types/customer";
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

  const categoryLabel = SUPPLIER_CATEGORIES.find(c => c.id.toString() === supplier.jobtitle)?.value || "Non classé";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-forest-100 shadow-2xl rounded-[32px] bg-white">
        <DialogHeader className="p-8 bg-forest-900 text-white relative">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-forest-800 flex items-center justify-center border border-forest-700 text-emerald-400 font-bold text-2xl">
              {supplier.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <DialogTitle className="font-heading text-3xl font-bold tracking-tight">
                  {supplier.prefix} {supplier.name}
                </DialogTitle>
                <Badge variant="outline" className="border-forest-700 text-emerald-400 bg-forest-800/50 rounded-lg">
                  {supplier.isactive ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <p className="text-forest-300 font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" /> {categoryLabel}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-0">
          <Tabs defaultValue="profile" className="w-full">
            <div className="px-8 bg-forest-900/5 border-b border-forest-100">
              <TabsList className="h-16 bg-transparent gap-8">
                <TabsTrigger 
                  value="profile" 
                  className="h-16 rounded-none border-b-2 border-transparent data-[state=active]:border-forest-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 font-bold text-sand-400 data-[state=active]:text-forest-900"
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
                      <div className="flex items-center gap-2 text-forest-600 font-bold text-xs uppercase tracking-widest">
                        <BadgeInfo className="w-4 h-4" /> Identité Fiscale
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Matricule Fiscal</div>
                          <div className="font-mono font-bold text-forest-900">{supplier.taxregistrationnumber || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Description</div>
                          <div className="text-sm font-medium text-sand-600 italic">"{supplier.description || "Aucune description"}"</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-sand-50/50 border border-sand-100 space-y-4">
                      <div className="flex items-center gap-2 text-forest-600 font-bold text-xs uppercase tracking-widest">
                        <MapPin className="w-4 h-4" /> Localisation
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-forest-900 leading-snug">
                          {supplier.address || "Adresse non renseignée"}
                        </div>
                        <div className="text-xs text-sand-400 font-medium">Tunisie</div>
                      </div>
                      <Button variant="ghost" className="h-8 rounded-lg text-forest-600 hover:bg-forest-50 p-0 font-bold text-xs">
                        Voir sur Maps <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-8 rounded-[32px] bg-forest-900 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                      <Phone className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 space-y-6">
                      <h4 className="font-heading font-bold text-xl">Contact Direct</h4>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                              <Phone className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[0.6rem] font-bold text-forest-400 uppercase tracking-widest">Téléphone</div>
                              <div className="text-sm font-bold">{supplier.phonenumberone}</div>
                            </div>
                          </div>
                          {supplier.phonenumbertwo && (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                                <Phone className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-[0.6rem] font-bold text-forest-400 uppercase tracking-widest">Bureau</div>
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
                              <div className="text-[0.6rem] font-bold text-forest-400 uppercase tracking-widest">E-mail</div>
                              <div className="text-sm font-bold truncate">{supplier.email || "—"}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[0.6rem] font-bold text-forest-400 uppercase tracking-widest">Représentant</div>
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
                  <div className="p-8 rounded-[32px] bg-sand-50 border border-sand-100 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Wallet className="w-24 h-24" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Situation Financière</h4>
                      <div className="text-3xl font-heading font-black text-forest-900">
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
                        <span className="text-forest-900">12 Mai 2026</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-sand-400 uppercase">Échéances en cours</span>
                        <span className="text-rose-600">3 Factures</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-[24px] border border-forest-100 space-y-4">
                    <div className="flex items-center gap-2 text-forest-600 font-bold text-xs uppercase tracking-widest">
                      <Building className="w-4 h-4" /> Banque & RIB
                    </div>
                    {supplier.bankname ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-forest-50 flex items-center justify-center text-forest-600 font-black text-[0.6rem]">
                            {supplier.bankname.substring(0, 3)}
                          </div>
                          <div className="text-sm font-bold text-forest-900">{supplier.bankname}</div>
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
