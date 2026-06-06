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
import { Switch } from "@/components/ui/switch";
import { 
  KeyRound, 
  X, 
  User, 
  Mail,
  Lock,
  PlusCircle
} from "lucide-react";
import { Person, ROLE_LABELS, SYSTEM_ROLES, FUNCTION_ROLES } from "@/types/team";
import { useSites } from "@/hooks/use-enterprise";
import { usePersons } from "@/hooks/use-team";
import { useAuthStore } from "@/store/use-auth-store";

const createUserSchema = z.object({
  personId: z.string().min(1, "Le collaborateur est requis"),
  login: z.string().min(1, "L'identifiant est requis"),
  email: z.string().email("L'adresse email est invalide").min(1, "L'email est requis"),
  isactive: z.boolean(),
  defaultsite: z.string().min(1, "Le site par défaut est requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
  role: z.coerce.number().min(1, "Le rôle est requis"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: any) => void;
  isLoading?: boolean;
}

export function CreateUserDialog({
  isOpen,
  onClose,
  onSave,
  isLoading
}: CreateUserDialogProps) {
  const { data: sites } = useSites();
  const { data: persons } = usePersons();
  const { user } = useAuthStore();

  // Filter out persons that already have an app user linked (if we had that data easily accessible here)
  // For now we'll just show all persons, or ideally filter those with isappuser === false
  const availablePersons = persons?.filter(p => !p.isappuser) || [];

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema) as any,
    defaultValues: {
      personId: "",
      login: "",
      email: "",
      isactive: true,
      defaultsite: "",
      password: "",
      confirmPassword: "",
      role: 30, // Default to Utilisateur
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        personId: "",
        login: "",
        email: "",
        isactive: true,
        defaultsite: "",
        password: "",
        confirmPassword: "",
        role: 30,
      });
    }
  }, [isOpen, form]);

  const onSubmit = (values: CreateUserFormValues) => {
    const selectedPerson = persons?.find(p => p.id.toString() === values.personId);
    
    if (!selectedPerson) return;

    const defaultSiteId = parseInt(values.defaultsite);
    const selectedSite = sites?.find(s => s.id === defaultSiteId);
    const fallbackEnterpriseId = selectedSite?.enterpriseid || 1;
    const finalEnterpriseId = user?.enterpriseId ? parseInt(user.enterpriseId) : fallbackEnterpriseId;

    const model = {
      login: values.login,
      email: values.email,
      isactive: values.isactive,
      defaultsite: defaultSiteId,
      password: values.password,
      identerprise: finalEnterpriseId, // Use current user's enterprise or selected site's enterprise
      person: {
        ...selectedPerson,
        role: values.role,
        isappuser: true,
        updatedby: 1,
      }
    };
    onSave(model);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full sm:max-w-4xl p-0 overflow-hidden border-forest-100 shadow-2xl rounded-none sm:rounded-2xl bg-background scrollbar-hide">
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-forest-50 flex items-center justify-center border border-forest-100">
              <PlusCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                Créer un Compte Utilisateur
              </DialogTitle>
              <p className="text-muted-foreground text-sm font-medium mt-1">
                Créez un compte d'accès pour un collaborateur existant.
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
            
            <FormField
              control={form.control}
              name="personId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Collaborateur à lier</FormLabel>
                  <Select onValueChange={(val) => {
                    field.onChange(val);
                    // Optionally auto-fill login/email if we have it
                    const person = persons?.find(p => p.id.toString() === val);
                    if (person) {
                      const suggestedLogin = `${person.firstname.toLowerCase()}.${person.lastname.toLowerCase()}`.replace(/\s+/g, '');
                      if (!form.getValues('login')) form.setValue('login', suggestedLogin);
                      form.setValue('role', person.role);
                    }
                  }} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="font-bold text-forest-900">
                        <SelectValue placeholder="Sélectionner un collaborateur sans compte...">
                          {field.value 
                            ? (() => {
                                const p = availablePersons.find(p => p.id.toString() === field.value);
                                return p ? `${p.firstname} ${p.lastname} - ${ROLE_LABELS[p.role]}` : field.value;
                              })()
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl border-forest-100 shadow-xl max-h-64">
                      {availablePersons.length === 0 ? (
                        <div className="p-4 text-center text-sm text-sand-400">Tous les collaborateurs ont déjà un compte.</div>
                      ) : (
                        availablePersons.map((person) => (
                          <SelectItem key={person.id} value={person.id.toString()}>
                            {person.firstname} {person.lastname} - {ROLE_LABELS[person.role]}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="login"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Identifiant (Login)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input placeholder="Identifiant" className="pl-10 font-bold text-forest-900" {...field} />
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
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
                    <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Adresse Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="email" placeholder="Email" className="pl-10 font-medium" {...field} />
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="password" placeholder="Mot de passe initial" className="pl-10 font-medium font-mono" {...field} />
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Confirmer le mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="password" placeholder="Confirmation" className="pl-10 font-medium font-mono" {...field} />
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="defaultsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Site Par Défaut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                      <FormControl>
                        <SelectTrigger className="font-bold text-forest-900">
                          <SelectValue placeholder="Choisir un site">
                            {field.value && sites ? sites.find(s => s.id.toString() === field.value.toString())?.address : undefined}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-forest-100 shadow-xl">
                        {sites?.map((site) => (
                          <SelectItem key={site.id} value={site.id.toString()}>{site.address}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Rôle d'accès</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger className="font-bold text-forest-900">
                          <SelectValue placeholder="Choisir un rôle">
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
            </div>

            <FormField
              control={form.control}
              name="isactive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 bg-forest-50/50 rounded-2xl border border-forest-100">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-bold text-forest-900">Compte Actif</FormLabel>
                    <p className="text-[0.7rem] text-sand-400 font-medium">Créer ce compte en tant qu'actif directement.</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-forest-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-6 border-t border-forest-50 gap-3">
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
                {isLoading ? "Traitement..." : "Créer le Compte"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


