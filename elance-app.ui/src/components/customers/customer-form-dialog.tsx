'use client';

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
  firstname: z.string().optional(),
  lastname: z.string().optional(),
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
}).superRefine((data, ctx) => {
  const isSociety = SOCIETY_PREFIXES.some(p => p.id === data.prefix);
  if (isSociety) {
    if (!data.name || data.name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La raison sociale est requise",
        path: ["name"],
      });
    }
  } else {
    if (!data.lastname || data.lastname.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le nom est requis",
        path: ["lastname"],
      });
    }
    if (!data.firstname || data.firstname.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le prénom est requis",
        path: ["firstname"],
      });
    }
  }
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
      gouvernorate: "",
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
          gouvernorate: "",
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
    const isSoc = mode === 'society' || SOCIETY_PREFIXES.some(p => p.id === values.prefix);
    const model = {
      ...values,
      name: isSoc ? (values.name || `${values.firstname || ''} ${values.lastname || ''}`.trim()) : (values.name || ''),
      firstname: isSoc ? (values.firstname || values.name || '') : (values.firstname || ''),
      lastname: isSoc ? (values.lastname || '') : (values.lastname || ''),
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
        className="w-full max-w-full sm:max-w-xl md:max-w-3xl lg:max-w-5xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-none sm:rounded-2xl bg-white h-full sm:h-auto max-h-screen sm:max-h-[90vh] flex flex-col"
      >
        <DialogHeader className="border-b border-border pb-4 mb-4 p-6 sm:p-8 relative shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-corp-blue-50 flex items-center justify-center border border-corp-blue-100 text-emerald-600 shrink-0">
              {editCustomer ? <UserPen className="w-6 h-6 animate-pulse" /> : <UserPlus className="w-6 h-6 animate-pulse" />}
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-corp-blue-900">
                {editCustomer ? "Modifier le Client" : "Nouveau Client"}
              </DialogTitle>
              <p className="text-muted-foreground text-sm font-medium mt-1">
                {editCustomer ? `ID : ${editCustomer.id} — ${editCustomer.name || `${editCustomer.firstname} ${editCustomer.lastname}`}` : "Enregistrez un nouveau client régulier."}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute rounded-full right-4 top-4 sm:right-6 sm:top-6 w-8 h-8 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* Mode Selection */}
            {!editCustomer && (
              <div className="flex justify-center">
                <Tabs value={mode} onValueChange={handleModeChange} className="w-full max-w-md">
                  <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 bg-sand-50 border border-corp-blue-50 h-12">
                    <TabsTrigger value="individual" className="rounded-lg font-bold gap-2 cursor-pointer">
                      <User className="w-4 h-4" /> <span className="hidden xs:inline">Personne Physique</span><span className="xs:hidden">Physique</span>
                    </TabsTrigger>
                    <TabsTrigger value="society" className="rounded-lg font-bold gap-2 cursor-pointer">
                      <Building2 className="w-4 h-4" /> <span className="hidden xs:inline">Société / Entreprise</span><span className="xs:hidden">Société</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Identity & Contact */}
              <div className="space-y-6">
                {/* Identité */}
                <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-corp-blue-50/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
                  {mode === 'society' ? (
                    <>
                      <div className="flex items-center justify-between pb-3 border-b border-corp-blue-100/60">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-corp-blue-600" />
                          <h3 className="font-bold text-corp-blue-900 uppercase text-xs tracking-wider">Identité de la Société</h3>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-corp-blue-700 bg-corp-blue-50 px-2.5 py-0.5 rounded-full border border-corp-blue-100">
                          Personne Morale
                        </span>
                      </div>

                      {/* Top Row: Forme Juridique (Civilité) + Raison Sociale */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="prefix"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-1">
                              <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Civilité / Forme</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="font-semibold text-corp-blue-900">
                                    <SelectValue placeholder="Forme" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl border-corp-blue-100">
                                  {SOCIETY_PREFIXES.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.id}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Raison Sociale <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  className="font-bold text-corp-blue-900 text-sm" 
                                  placeholder="Ex: SOCOFEIS SARL" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Middle Row: Description */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Description / Activité Principale</FormLabel>
                            <FormControl>
                                <Input 
                                  className="font-medium text-corp-blue-900 text-sm" 
                                  placeholder="Description de l'activité ou de l'entreprise..." 
                                  {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Responsable Section */}
                      <div className="pt-3 border-t border-corp-blue-100/60 space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-corp-blue-600" />
                          <span className="text-xs font-bold text-corp-blue-900 uppercase tracking-wider">Responsable / Interlocuteur Principal</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-corp-blue-50/30 p-3.5 rounded-xl border border-corp-blue-50">
                          <FormField
                            control={form.control}
                            name="lastname"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[11px] font-bold text-sand-500 uppercase">Nom du Responsable</FormLabel>
                                <FormControl>
                                  <Input className="font-semibold text-corp-blue-900 text-sm" placeholder="Nom" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="firstname"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[11px] font-bold text-sand-500 uppercase">Prénom du Responsable</FormLabel>
                                <FormControl>
                                  <Input className="font-semibold text-corp-blue-900 text-sm" placeholder="Prénom" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between pb-3 border-b border-corp-blue-100/60">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-corp-blue-600" />
                          <h3 className="font-bold text-corp-blue-900 uppercase text-xs tracking-wider">Identité du Client</h3>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                          Personne Physique
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="prefix"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-1">
                              <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Civilité</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="font-semibold text-corp-blue-900">
                                    <SelectValue placeholder="Civilité" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl border-corp-blue-100">
                                  {CUSTOMER_PREFIXES.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.id}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastname"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-1">
                              <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Nom <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input className="font-semibold text-corp-blue-900" placeholder="Nom" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="firstname"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-1">
                              <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Prénom <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input className="font-semibold text-corp-blue-900" placeholder="Prénom" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Note / Qualification</FormLabel>
                            <FormControl>
                                <Input className="font-semibold text-corp-blue-900" placeholder="Ex: Client particulier régulier..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="identitycardnumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">CIN</FormLabel>
                          <FormControl>
                            <Input className="font-semibold text-corp-blue-900" placeholder="00000000" {...field} />
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
                          <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Activité</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="font-semibold text-corp-blue-900">
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
                          <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Matricule Fiscal</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input 
                                className="font-mono font-bold text-corp-blue-900 cursor-pointer pr-12" 
                                placeholder="Cliquez pour saisir le MF" 
                                {...field} 
                                readOnly
                                onClick={() => setIsTaxModalOpen(true)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1 h-9 w-9 rounded-lg text-corp-blue-600 group-hover:bg-corp-blue-50"
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
                          <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Patente</FormLabel>
                          <FormControl>
                            <Input className="font-semibold text-corp-blue-900" placeholder="Code Patente" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Localisation & Contact */}
                <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-corp-blue-50/80 rounded-xl p-5 sm:p-6 space-y-6 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-corp-blue-50">
                    <MapPin className="w-4 h-4 text-corp-blue-600" />
                    <h3 className="font-bold text-corp-blue-900 uppercase text-xs tracking-wider">Localisation & Contact</h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Adresse Complète</FormLabel>
                        <FormControl>
                          <Input className="font-semibold text-corp-blue-900" placeholder="Numéro, Rue..." {...field} />
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
                        <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Gouvernorat</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="font-semibold text-corp-blue-900">
                              <SelectValue placeholder="Sélectionner votre gouvernorat" />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phonenumberone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Téléphone 1</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                              <Input className="font-semibold text-corp-blue-900 pl-10" placeholder="71 000 000" {...field} />
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
                          <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">E-mail</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                              <Input className="font-semibold text-corp-blue-900 pl-10" placeholder="client@email.tn" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Finance & Notes */}
              <div className="space-y-6">
                {/* Finance & Crédit */}
                <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-corp-blue-50/80 rounded-xl p-5 sm:p-6 space-y-6 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-corp-blue-50">
                    <CreditCard className="w-4 h-4 text-corp-blue-600" />
                    <h3 className="font-bold text-corp-blue-900 uppercase text-xs tracking-wider">Finance & Crédit</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maximumdiscount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Remise Max (%)</FormLabel>
                          <FormControl>
                            <Input type="number" className="font-semibold text-corp-blue-900" {...field} />
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
                          <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Plafond Crédit</FormLabel>
                          <FormControl>
                            <Input type="number" className="font-bold text-corp-blue-900" {...field} />
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
                        <FormLabel className="text-xs font-bold text-sand-500 uppercase tracking-wider">Solde d'Ouverture (TND)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" className="font-bold text-corp-blue-900" {...field} />
                        </FormControl>
                        <FormDescription className="text-[0.65rem] text-slate-500">Position financière initiale du client</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-5 rounded-xl bg-corp-blue-50/40 border border-corp-blue-100 space-y-4">
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
                                <SelectTrigger className="font-semibold text-corp-blue-900">
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
                              <Input className="font-mono font-semibold text-corp-blue-900" placeholder="RIB / Numéro de compte" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes & Paramètres */}
                <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-corp-blue-50/80 rounded-xl p-5 sm:p-6 space-y-6 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-corp-blue-50">
                    <FileText className="w-4 h-4 text-corp-blue-600" />
                    <h3 className="font-bold text-corp-blue-900 uppercase text-xs tracking-wider">Notes & Paramètres</h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            className="font-semibold text-corp-blue-900" 
                            placeholder="Notes additionnelles..." 
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isTypeBoth"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0 p-5 rounded-xl bg-sand-50/50 border border-sand-100 shadow-inner">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="w-5 h-5 rounded-lg border-sand-300 data-[state=checked]:bg-corp-blue-600 data-[state=checked]:border-corp-blue-600 cursor-pointer"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-bold text-corp-blue-900 cursor-pointer">Client et Fournisseur</FormLabel>
                          <p className="text-[0.7rem] text-sand-400 font-medium">Ce client sera également visible dans le module Fournisseurs.</p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-corp-blue-50 flex gap-3 flex-col sm:flex-row justify-end items-stretch sm:items-center">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose}
                className="h-11 px-8 font-bold text-slate-400 hover:bg-slate-50 border-slate-200 rounded-xl cursor-pointer"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-11 px-10 bg-corp-blue-600 text-white font-bold hover:bg-corp-blue-800 shadow-lg shadow-corp-blue-600/20 rounded-xl gap-2 cursor-pointer"
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
