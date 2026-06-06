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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BadgeCheck, 
  PlusCircle, 
  PencilLine, 
  X, 
  User, 
  DollarSign,
  Phone,
  CreditCard,
  Briefcase
} from "lucide-react";
import { Person, ROLE_LABELS, SYSTEM_ROLES, FUNCTION_ROLES } from "@/types/team";

const employeeSchema = z.object({
  firstname: z.string().min(1, "Le prénom est requis"),
  lastname: z.string().min(1, "Le nom est requis"),
  birthdate: z.string().optional().nullable(),
  cin: z.string().min(1, "Le CIN est requis"),
  idcnss: z.string().optional().nullable(),
  role: z.coerce.number().min(1, "Le rôle est requis"),
  address: z.string().optional().nullable(),
  birthtown: z.string().optional().nullable(),
  bankname: z.string().optional().nullable(),
  bankaccount: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  hiredate: z.string().optional().nullable(),
  firedate: z.string().optional().nullable(),
  basesalary: z.coerce.number().min(0, "Le salaire doit être positif"),
  overtimehours: z.coerce.number().min(0, "Les heures supplémentaires doivent être positives"),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface AddEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: any) => void;
  editEmployee: Person | null;
  isLoading?: boolean;
}

export function AddEmployeeDialog({
  isOpen,
  onClose,
  onSave,
  editEmployee,
  isLoading
}: AddEmployeeDialogProps) {
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: {
      firstname: "",
      lastname: "",
      birthdate: "",
      cin: "",
      idcnss: "",
      role: 30, // Default to Utilisateur
      address: "",
      birthtown: "",
      bankname: "",
      bankaccount: "",
      phonenumber: "",
      hiredate: new Date().toISOString().split('T')[0], // default to today
      firedate: "",
      basesalary: 0,
      overtimehours: 0,
    },
  });

  // Reset form when opening or changing editEmployee
  useEffect(() => {
    if (isOpen) {
      if (editEmployee) {
        form.reset({
          firstname: editEmployee.firstname || "",
          lastname: editEmployee.lastname || "",
          birthdate: editEmployee.birthdate ? editEmployee.birthdate.split('T')[0] : "",
          cin: editEmployee.cin || "",
          idcnss: editEmployee.idcnss || "",
          role: editEmployee.role,
          address: editEmployee.address || "",
          birthtown: editEmployee.birthtown || "",
          bankname: editEmployee.bankname || "",
          bankaccount: editEmployee.bankaccount || "",
          phonenumber: editEmployee.phonenumber || "",
          hiredate: editEmployee.hiredate ? editEmployee.hiredate.split('T')[0] : "",
          firedate: editEmployee.firedate ? editEmployee.firedate.split('T')[0] : "",
          basesalary: editEmployee.basesalary || 0,
          overtimehours: editEmployee.overtimehours || 0,
        });
      } else {
        form.reset({
          firstname: "",
          lastname: "",
          birthdate: "",
          cin: "",
          idcnss: "",
          role: 30,
          address: "",
          birthtown: "",
          bankname: "",
          bankaccount: "",
          phonenumber: "",
          hiredate: new Date().toISOString().split('T')[0],
          firedate: "",
          basesalary: 0,
          overtimehours: 0,
        });
      }
    }
  }, [isOpen, editEmployee, form]);

  const onSubmit = (values: EmployeeFormValues) => {
    const model = {
      ...values,
      hiredate: values.hiredate ? new Date(values.hiredate).toISOString() : null,
      firedate: values.firedate ? new Date(values.firedate).toISOString() : null,
      birthdate: values.birthdate ? new Date(values.birthdate).toISOString() : null,
      role: parseInt(values.role.toString()),
      isdeleted: false,
      isappuser: editEmployee ? editEmployee.isappuser : false,
      updatedby: 1, // Mock user ID
    };
    onSave(model);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl md:max-w-4xl lg:max-w-5xl p-0 overflow-hidden border-forest-100 shadow-2xl rounded-none sm:rounded-2xl bg-background scrollbar-hide">
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-forest-50 flex items-center justify-center border border-forest-100">
              {editEmployee ? <PencilLine className="w-6 h-6 text-emerald-600" /> : <PlusCircle className="w-6 h-6 text-emerald-600" />}
            </div>
            <div>
              <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                {editEmployee ? "Modifier le Collaborateur" : "Nouveau Collaborateur"}
              </DialogTitle>
              <p className="text-muted-foreground text-sm font-medium mt-1">
                {editEmployee ? `Modification des informations de ${editEmployee.firstname} ${editEmployee.lastname}` : "Ajoutez un nouveau membre à votre équipe."}
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
            
            {/* Identity section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-forest-50">
                <User className="w-4 h-4 text-forest-600" />
                <h3 className="font-heading font-bold text-forest-900">Identité & Informations Personnelles</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="firstname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Prénom</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Jean" className="font-medium" {...field} />
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
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Dupont" className="font-medium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">CIN</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 01234567" className="font-medium font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="birthdate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Date de Naissance</FormLabel>
                      <FormControl>
                        <Input type="date" className="font-medium" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthtown"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Lieu de Naissance</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Paris" className="font-medium" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idcnss"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">N° CNSS</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 12-3456789-0" className="font-medium font-mono" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="phonenumber"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Téléphone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input placeholder="Ex: +216 20 000 000" className="pl-10 font-medium" {...field} value={field.value || ""} />
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Adresse Complète</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Rue de la Liberté, Tunis" className="font-medium" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Employment and salary details */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-forest-50">
                <Briefcase className="w-4 h-4 text-forest-600" />
                <h3 className="font-heading font-bold text-forest-900">Contrat & Poste</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Rôle / Fonction</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || "30"}>
                        <FormControl>
                          <SelectTrigger className="font-bold text-forest-900">
                            <SelectValue placeholder="Choisir un poste">
                              {field.value ? ROLE_LABELS[parseInt(field.value.toString())] : undefined}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-forest-100 shadow-xl">
                          <SelectGroup>
                            <SelectLabel className="font-bold text-forest-900">Niveau d'Accès Système</SelectLabel>
                            {SYSTEM_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value.toString()}>{role.label}</SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="font-bold text-forest-900">Fonction / Poste</SelectLabel>
                            {FUNCTION_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value.toString()}>{role.label}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hiredate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Date d&apos;embauche</FormLabel>
                      <FormControl>
                        <Input type="date" className="font-medium" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firedate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Date de sortie (Optionnel)</FormLabel>
                      <FormControl>
                        <Input type="date" className="font-medium" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="basesalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Salaire de Base</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" step="0.01" placeholder="0.00" className="pr-12 font-bold text-forest-900" {...field} />
                          <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sand-300 font-bold text-xs uppercase">TND</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overtimehours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Heures Sup. Initiales</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" placeholder="0" className="font-bold text-forest-900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Bank details */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-forest-50">
                <CreditCard className="w-4 h-4 text-forest-600" />
                <h3 className="font-heading font-bold text-forest-900">Coordonnées Bancaires</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="bankname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Nom de la Banque</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: BIAT" className="font-medium" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bankaccount"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">RIB Bancaire</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 01 234 5678901234567 89" className="font-mono font-bold text-forest-900" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="pt-8 border-t border-forest-50 gap-3">
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
                className="h-12 px-10 bg-forest-600 text-white font-bold hover:bg-forest-800 shadow-lg shadow-forest-600/20 gap-2"
              >
                {isLoading ? "Traitement..." : (editEmployee ? "Mettre à jour" : "Enregistrer")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


