'use client';

import { useEffect } from "react";
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
  BadgeInfo,
  User
} from "lucide-react";
import { 
  Supplier, 
  SOCIETY_PREFIXES, 
  SUPPLIER_CATEGORIES, 
  BANKS_TN 
} from "@/types/customer";
import { cn } from "@/lib/utils";

const supplierSchema = z.object({
  prefix: z.string().min(1, "Le titre est requis"),
  name: z.string().min(1, "La raison sociale est requise"),
  description: z.string().min(1, "La description est requise"),
  firstname: z.string().min(1, "Le prénom du responsable est requis"),
  lastname: z.string().min(1, "Le nom du responsable est requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  taxregistrationnumber: z.string().min(1, "Le matricule fiscal est requis"),
  address: z.string().min(1, "L'adresse est requise"),
  phonenumberone: z.string().min(8, "8 chiffres minimum"),
  phonenumbertwo: z.string().optional(),
  jobtitle: z.string().min(1, "La catégorie est requise"),
  bankname: z.string().optional(),
  bankaccountnumber: z.string().optional(),
  openingbalance: z.coerce.number(),
  isTypeBoth: z.boolean().default(false),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editSupplier: Supplier | null;
  isLoading?: boolean;
}

export function SupplierFormDialog({
  isOpen,
  onClose,
  onSave,
  editSupplier,
  isLoading
}: SupplierFormDialogProps) {

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      prefix: SOCIETY_PREFIXES[0].id,
      name: "",
      description: "",
      firstname: "",
      lastname: "",
      email: "",
      taxregistrationnumber: "",
      address: "",
      phonenumberone: "",
      phonenumbertwo: "",
      jobtitle: "2", // Default to Matériaux if needed, or index 0
      bankname: "",
      bankaccountnumber: "",
      openingbalance: 0,
      isTypeBoth: false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (editSupplier) {
        form.reset({
          prefix: editSupplier.prefix,
          name: editSupplier.name,
          description: editSupplier.description || "",
          firstname: editSupplier.firstname,
          lastname: editSupplier.lastname,
          email: editSupplier.email || "",
          taxregistrationnumber: editSupplier.taxregistrationnumber || "",
          address: editSupplier.address,
          phonenumberone: editSupplier.phonenumberone,
          phonenumbertwo: editSupplier.phonenumbertwo || "",
          jobtitle: editSupplier.jobtitle?.toString() || "1",
          bankname: editSupplier.bankname || "",
          bankaccountnumber: editSupplier.bankaccountnumber || "",
          openingbalance: editSupplier.openingbalance,
          isTypeBoth: editSupplier.isTypeBoth,
        });
      } else {
        form.reset({
          prefix: SOCIETY_PREFIXES[0].id,
          name: "",
          description: "",
          firstname: "",
          lastname: "",
          email: "",
          taxregistrationnumber: "",
          address: "",
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
  }, [isOpen, editSupplier, form]);

  const onSubmit = (values: SupplierFormValues) => {
    const model = {
      ...values,
      type: values.isTypeBoth ? 'Both' : 'Supplier',
      updatedbyid: 1, // Mock user ID
    };
    onSave(model);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden border-forest-100 shadow-2xl rounded-[32px] bg-white">
        <DialogHeader className="p-8 bg-forest-900 text-white relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-forest-800 flex items-center justify-center border border-forest-700 text-emerald-400">
              {editSupplier ? <UserPen className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
            </div>
            <div>
              <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                {editSupplier ? "Modifier le Fournisseur" : "Nouveau Fournisseur"}
              </DialogTitle>
              <p className="text-forest-300 text-sm font-medium mt-1">
                {editSupplier ? `ID: ${editSupplier.id} — ${editSupplier.name}` : "Enregistrez un nouveau fournisseur dans votre catalogue d'achat."}
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8 overflow-y-auto max-h-[75vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {/* Left Column: Identity */}
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-forest-50">
                    <BadgeInfo className="w-4 h-4 text-forest-600" />
                    <h3 className="font-heading font-bold text-forest-900">Identité Entreprise</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="prefix"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Titre</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl border-forest-100 bg-white">
                                <SelectValue placeholder="Titre" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-forest-100">
                              {SOCIETY_PREFIXES.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.id}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Raison Sociale</FormLabel>
                          <FormControl>
                            <Input className="h-12 rounded-xl border-forest-100 font-bold" placeholder="Nom de l'entreprise" {...field} />
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
                        <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Activité / Description</FormLabel>
                        <FormControl>
                          <Input className="h-12 rounded-xl border-forest-100" placeholder="Ex: Vente de bois rouge..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="taxregistrationnumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Matricule Fiscal</FormLabel>
                          <FormControl>
                            <Input className="h-12 rounded-xl border-forest-100 font-mono" placeholder="MF" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
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
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Catégorie</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl border-forest-100 bg-white">
                                <SelectValue placeholder="Catégorie" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-forest-100">
                              {SUPPLIER_CATEGORIES.map(c => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.value}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-6 rounded-3xl bg-sand-50/50 border border-sand-100 space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-forest-600" />
                      <h4 className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Responsable / Représentant</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstname"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input className="h-11 rounded-xl border-forest-100 bg-white" placeholder="Prénom" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastname"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input className="h-11 rounded-xl border-forest-100 bg-white" placeholder="Nom" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-forest-50">
                    <MapPin className="w-4 h-4 text-forest-600" />
                    <h3 className="font-heading font-bold text-forest-900">Localisation & Contact</h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Adresse Siège</FormLabel>
                        <FormControl>
                          <Input className="h-12 rounded-xl border-forest-100" placeholder="Numéro, Rue, Ville..." {...field} />
                        </FormControl>
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
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Téléphone Principal</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                              <Input className="h-12 rounded-xl border-forest-100 pl-10" placeholder="71 000 000" {...field} />
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
                              <Input className="h-12 rounded-xl border-forest-100 pl-10" placeholder="contact@fournisseur.tn" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Finance */}
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-forest-50">
                    <CreditCard className="w-4 h-4 text-forest-600" />
                    <h3 className="font-heading font-bold text-forest-900">Finance & Règlement</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="openingbalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase">Solde d'Ouverture (TND)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" className="h-12 rounded-xl border-forest-100 font-bold text-forest-900" {...field} />
                        </FormControl>
                        <FormDescription className="text-[0.65rem]">Dette ou avoir initial lors de l'enregistrement</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-6 rounded-3xl bg-forest-50 border border-forest-100 space-y-4">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-forest-600" />
                      <h4 className="text-sm font-bold text-forest-900">Coordonnées Bancaires</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="bankname"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl border-forest-100 bg-white">
                                  <SelectValue placeholder="Choisir la banque" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl border-forest-100">
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
                              <Input className="h-12 rounded-xl border-forest-100 bg-white font-mono uppercase" placeholder="RIB / Numéro de compte" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-forest-50">
                    <FileText className="w-4 h-4 text-forest-600" />
                    <h3 className="font-heading font-bold text-forest-900">Paramètres Additionnels</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="isTypeBoth"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0 p-6 rounded-3xl bg-sand-50/50 border border-sand-100">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="w-5 h-5 rounded-lg border-sand-300 data-[state=checked]:bg-forest-600 data-[state=checked]:border-forest-600"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-bold text-forest-900">Fournisseur et Client</FormLabel>
                          <p className="text-[0.7rem] text-sand-400 font-medium">Ce fournisseur sera également visible dans le module Clients.</p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-8 border-t border-forest-50 gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose}
                className="h-12 px-8 rounded-xl font-bold text-sand-400 hover:bg-sand-50"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-12 px-10 rounded-xl bg-forest-600 text-white font-bold hover:bg-forest-800 shadow-lg shadow-forest-600/20 gap-2"
              >
                {isLoading ? "Traitement..." : (editSupplier ? "Mettre à jour" : "Enregistrer")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
