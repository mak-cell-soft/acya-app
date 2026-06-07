'use client';

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User, 
  Building2, 
  UserPlus, 
  UserPen, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Building,
  FileText,
  BadgeInfo
} from "lucide-react";
import { 
  Customer, 
  FULL_PREFIXES, 
  SOCIETY_PREFIXES, 
  CUSTOMER_PREFIXES, 
  CUSTOMER_ACTIVITIES, 
  GOUVERNORATES_TN, 
  BANKS_TN 
} from "@/types/customer";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxRegistrationDialog } from "@/components/shared/tax-registration-dialog";

const customerSchema = z.object({
  prefix: z.string().min(1, "Le préfixe est requis"),
  name: z.string().optional(),
  description: z.string().optional(),
  firstname: z.string().min(1, "Le prénom est requis"),
  lastname: z.string().min(1, "Le nom est requis"),
  identitycardnumber: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  taxregistrationnumber: z.string().optional(),
  patentecode: z.string().optional(),
  address: z.string().min(1, "L'adresse est requise"),
  gouvernorate: z.string().min(1, "Le gouvernorat est requis"),
  maximumdiscount: z.coerce.number().min(0).max(100),
  maximumsalesbar: z.coerce.number().min(0),
  notes: z.string().optional(),
  phonenumberone: z.string().min(8, "8 chiffres minimum"),
  phonenumbertwo: z.string().optional(),
  jobtitle: z.string().min(1, "L'activité est requise"),
  bankname: z.string().optional(),
  bankaccountnumber: z.string().optional(),
  openingbalance: z.coerce.number(),
  isTypeBoth: z.boolean().default(false),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editCustomer: Customer | null;
  isLoading?: boolean;
}

export function CustomerFormDialog({
  isOpen,
  onClose,
  onSave,
  editCustomer,
  isLoading
}: CustomerFormDialogProps) {
  const [mode, setMode] = useState<"society" | "individual">("individual");
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      prefix: "",
      name: "",
      description: "",
      firstname: "",
      lastname: "",
      identitycardnumber: "",
      email: "",
      taxregistrationnumber: "",
      patentecode: "",
      address: "",
      gouvernorate: "23", // Tunis by default
      maximumdiscount: 0,
      maximumsalesbar: 0,
      notes: "",
      phonenumberone: "",
      phonenumbertwo: "",
      jobtitle: "1",
      bankname: "",
      bankaccountnumber: "",
      openingbalance: 0,
      isTypeBoth: false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (editCustomer) {
        const isSoc = SOCIETY_PREFIXES.some(p => p.id === editCustomer.prefix);
        setMode(isSoc ? "society" : "individual");

        const activityId = CUSTOMER_ACTIVITIES.find(
          a => a.key.toString() === editCustomer.jobtitle || a.value === editCustomer.jobtitle
        )?.key.toString() || "1";

        form.reset({
          prefix: editCustomer.prefix || CUSTOMER_PREFIXES[0].id,
          name: editCustomer.name || "",
          description: editCustomer.description || "",
          firstname: editCustomer.firstname || "",
          lastname: editCustomer.lastname || "",
          identitycardnumber: editCustomer.identitycardnumber || "",
          email: editCustomer.email || "",
          taxregistrationnumber: editCustomer.taxregistrationnumber || "",
          patentecode: editCustomer.patentecode || "",
          address: editCustomer.address || "",
          gouvernorate: editCustomer.gouvernorate?.toString() || "23",
          maximumdiscount: editCustomer.maximumdiscount || 0,
          maximumsalesbar: editCustomer.maximumsalesbar ?? 0,
          notes: editCustomer.notes || "",
          phonenumberone: editCustomer.phonenumberone || "",
          phonenumbertwo: editCustomer.phonenumbertwo || "",
          jobtitle: activityId,
          bankname: editCustomer.bankname || "",
          bankaccountnumber: editCustomer.bankaccountnumber || "",
          openingbalance: editCustomer.openingbalance || 0,
          isTypeBoth: editCustomer.isTypeBoth || false,
        });
      } else {
        setMode("individual");
        form.reset({
          prefix: CUSTOMER_PREFIXES[0].id,
          name: "",
          description: "",
          firstname: "",
          lastname: "",
          identitycardnumber: "",
          email: "",
          taxregistrationnumber: "",
          patentecode: "",
          address: "",
          gouvernorate: "23",
          maximumdiscount: 0,
          maximumsalesbar: 0,
          notes: "",
          phonenumberone: "",
          phonenumbertwo: "",
          jobtitle: "1",
          bankname: "",
          bankaccountnumber: "",
          openingbalance: 0,
          isTypeBoth: false,
        });
      }
    }
  }, [isOpen, editCustomer, form]);

  const handleModeChange = (newMode: string) => {
    const m = newMode as "society" | "individual";
    setMode(m);
    form.setValue("prefix", m === "society" ? SOCIETY_PREFIXES[0].id : CUSTOMER_PREFIXES[0].id);
  };

  const onSubmit = (values: CustomerFormValues) => {
    const model = {
      ...values,
      type: values.isTypeBoth ? 'Both' : 'Customer',
      updatedbyid: 1, // Mock
      id: editCustomer ? editCustomer.id : 0,
      guid: editCustomer ? editCustomer.guid : undefined,
    };
    onSave(model);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 
        NOTE: showCloseButton={false} disables the default close button of DialogContent 
        to avoid having duplicate close buttons. We keep our custom visible close button in DialogHeader.
      */}
      <DialogContent 
        showCloseButton={false}
        className="w-full max-w-full sm:max-w-xl md:max-w-3xl lg:max-w-5xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-none sm:rounded-2xl bg-background h-full sm:h-auto max-h-screen sm:max-h-[90vh] flex flex-col"
      >
        <DialogHeader className="border-b border-border pb-4 mb-4 p-6 sm:p-8 relative shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-corp-blue-50 flex items-center justify-center border border-corp-blue-100 text-emerald-600 shrink-0">
              {editCustomer ? <UserPen className="w-5 h-5 sm:w-6 sm:h-6" /> : <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                {editCustomer ? "Modifier le Client" : "Nouveau Client"}
              </DialogTitle>
              <p className="text-muted-foreground text-[0.7rem] sm:text-sm font-medium mt-1">
                {editCustomer ? `ID: ${editCustomer.id} — ${editCustomer.firstname} ${editCustomer.lastname}` : "Enregistrez un nouveau client régulier."}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute rounded-full right-4 top-4 sm:right-6 sm:top-6 w-8 h-8 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
            {/* Mode Selection */}
            {!editCustomer && (
              <div className="flex justify-center">
                <Tabs value={mode} onValueChange={handleModeChange} className="w-full max-w-md">
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-sand-50 border border-corp-blue-50 h-12">
                    <TabsTrigger value="individual" className="rounded-xl font-bold gap-2">
                      <User className="w-4 h-4" /> <span className="hidden xs:inline">Personne Physique</span><span className="xs:hidden">Physique</span>
                    </TabsTrigger>
                    <TabsTrigger value="society" className="rounded-xl font-bold gap-2">
                      <Building2 className="w-4 h-4" /> <span className="hidden xs:inline">Société / Entreprise</span><span className="xs:hidden">Société</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
              {/* Left Column: Core Identity */}
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-corp-blue-50">
                    <BadgeInfo className="w-4 h-4 text-corp-blue-600" />
                    <h3 className="font-bold text-corp-blue-900">Identité</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="prefix"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Civilité</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="transition-all">
                                <SelectValue placeholder="Titre" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-corp-blue-100">
                              {(mode === 'society' ? SOCIETY_PREFIXES : CUSTOMER_PREFIXES).map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.id}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastname"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Nom</FormLabel>
                          <FormControl>
                            <Input className="transition-all" placeholder="Nom" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="firstname"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Prénom</FormLabel>
                          <FormControl>
                            <Input className="transition-all" placeholder="Prénom" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {mode === 'society' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Raison Sociale</FormLabel>
                            <FormControl>
                              <Input className="font-bold" placeholder="Nom de l'entreprise" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Description</FormLabel>
                            <FormControl>
                              <Input  placeholder="Description courte" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="identitycardnumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">CIN</FormLabel>
                          <FormControl>
                            <Input  placeholder="00000000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobtitle"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger >
                                <SelectValue placeholder="Activité">
                                  {CUSTOMER_ACTIVITIES.find(a => a.key.toString() === field.value?.toString() || a.value === field.value?.toString())?.value}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-corp-blue-100">
                              {CUSTOMER_ACTIVITIES.map(a => (
                                <SelectItem key={a.key} value={a.key.toString()}>{a.value}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="taxregistrationnumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Matricule Fiscal</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input 
                                className="font-mono cursor-pointer pr-12" 
                                placeholder="Cliquez pour saisir le MF" 
                                {...field} 
                                readOnly
                                onClick={() => setIsTaxModalOpen(true)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1 h-10 w-10 rounded-lg text-corp-blue-600 group-hover:bg-corp-blue-50"
                                onClick={() => setIsTaxModalOpen(true)}
                              >
                                <BadgeInfo className="w-4 h-4" />
                              </Button>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patentecode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Patente</FormLabel>
                          <FormControl>
                            <Input  placeholder="Code Patente" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-corp-blue-50">
                    <MapPin className="w-4 h-4 text-corp-blue-600" />
                    <h3 className="font-bold text-corp-blue-900">Localisation & Contact</h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Adresse Complète</FormLabel>
                        <FormControl>
                          <Input  placeholder="Numéro, Rue..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gouvernorate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Gouvernorat</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger >
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-corp-blue-100 h-64">
                            {GOUVERNORATES_TN.map(g => (
                              <SelectItem key={g.key} value={g.value}>{g.value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phonenumberone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Téléphone 1</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                              <Input className="pl-10" placeholder="71 000 000" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">E-mail</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                              <Input className="pl-10" placeholder="client@email.tn" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Finance & Settings */}
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-corp-blue-50">
                    <CreditCard className="w-4 h-4 text-corp-blue-600" />
                    <h3 className="font-bold text-corp-blue-900">Finance & Crédit</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maximumdiscount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Remise Max (%)</FormLabel>
                          <FormControl>
                            <Input type="number"  {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maximumsalesbar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Plafond Crédit</FormLabel>
                          <FormControl>
                            <Input type="number" className="font-bold" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="openingbalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Solde d'Ouverture (TND)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" className="font-bold text-corp-blue-900" {...field} />
                        </FormControl>
                        <FormDescription className="text-[0.65rem]">Position financière initiale du client</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-6 rounded-3xl bg-corp-blue-50 border border-corp-blue-100 space-y-4">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-corp-blue-600" />
                      <h4 className="text-sm font-bold text-corp-blue-900">Détails Bancaires</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="bankname"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger >
                                  <SelectValue placeholder="Banque" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl border-corp-blue-100">
                                {BANKS_TN.map(b => (
                                  <SelectItem key={b.id} value={b.value}>{b.value}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bankaccountnumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input className="font-mono" placeholder="RIB / Numéro de compte" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-corp-blue-50">
                    <FileText className="w-4 h-4 text-corp-blue-600" />
                    <h3 className="font-bold text-corp-blue-900">Notes & Paramètres</h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input className="h-24 align-top py-3" placeholder="Notes additionnelles..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isTypeBoth"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0 p-6 rounded-3xl bg-sand-50/50 border border-sand-100">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="w-5 h-5 rounded-lg border-sand-300 data-[state=checked]:bg-corp-blue-600 data-[state=checked]:border-corp-blue-600"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-bold text-corp-blue-900">Client et Fournisseur</FormLabel>
                          <p className="text-[0.7rem] text-sand-400 font-medium">Ce client sera également visible dans le module Fournisseurs.</p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-8 border-t border-corp-blue-50 gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose}
                className="h-12 px-8 font-bold text-sand-400 hover:bg-sand-50"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-12 px-10 bg-corp-blue-600 text-white font-bold hover:bg-corp-blue-800 shadow-lg shadow-corp-blue-600/20 gap-2"
              >
                {isLoading ? "Traitement..." : (editCustomer ? "Mettre à jour" : "Enregistrer")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        <TaxRegistrationDialog 
          isOpen={isTaxModalOpen}
          onClose={() => setIsTaxModalOpen(false)}
          onConfirm={(val) => form.setValue('taxregistrationnumber', val)}
          initialValue={form.getValues('taxregistrationnumber')}
        />
      </DialogContent>
    </Dialog>
  );
}


