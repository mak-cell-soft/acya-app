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
  PencilLine, 
  X, 
  User, 
  Building,
  Mail,
  Lock
} from "lucide-react";
import { AppUser, SYSTEM_ROLES, FUNCTION_ROLES, ROLE_LABELS } from "@/types/team";
import { useSites } from "@/hooks/use-enterprise";

const appUserSchema = z.object({
  login: z.string().min(1, "L'identifiant est requis"),
  email: z.string().email("L'adresse email est invalide").min(1, "L'email est requis"),
  isactive: z.boolean(),
  defaultsite: z.string().min(1, "Le site par défaut est requis"),
  password: z.string().optional().nullable(),
  role: z.coerce.number().optional(),
});

type AppUserFormValues = z.infer<typeof appUserSchema>;

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: any) => void;
  editUser: AppUser | null;
  isLoading?: boolean;
}

export function EditUserDialog({
  isOpen,
  onClose,
  onSave,
  editUser,
  isLoading
}: EditUserDialogProps) {
  const { data: sites } = useSites();

  const form = useForm<AppUserFormValues>({
    resolver: zodResolver(appUserSchema) as any,
    defaultValues: {
      login: "",
      email: "",
      isactive: true,
      defaultsite: "",
      password: "",
      role: 30,
    },
  });

  // Reset form when opening or changing editUser
  useEffect(() => {
    if (isOpen && editUser) {
      form.reset({
        login: editUser.login || "",
        email: editUser.email || "",
        isactive: editUser.isactive,
        defaultsite: editUser.defaultsite ? editUser.defaultsite.toString() : "",
        password: "", // Always clear password input on open
        role: editUser.person?.role || 30,
      });
    }
  }, [isOpen, editUser, form]);

  const onSubmit = (values: AppUserFormValues) => {
    if (!editUser) return;
    const model = {
      id: editUser.id,
      login: values.login,
      email: values.email,
      isactive: values.isactive,
      defaultsite: parseInt(values.defaultsite),
      password: values.password || null,
      identerprise: editUser.identerprise,
      // If there is an associated person, preserve it
      person: editUser.person ? {
        ...editUser.person,
        firstname: editUser.person.firstname,
        lastname: editUser.person.lastname,
        role: values.role !== undefined ? values.role : editUser.person.role,
        isappuser: true,
        updatedby: 1, // Mock user ID
      } : null
    };
    onSave(model);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-lg p-0 overflow-hidden border-forest-100 shadow-2xl rounded-none sm:rounded-2xl bg-background scrollbar-hide">
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-forest-50 flex items-center justify-center border border-forest-100">
              <KeyRound className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                Paramètres Utilisateur App
              </DialogTitle>
              <p className="text-muted-foreground text-sm font-medium mt-1">
                Gérez le compte et les accès de {editUser?.person ? `${editUser.person.firstname} ${editUser.person.lastname}` : editUser?.login}
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            
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

            {editUser?.person && (
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
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Changer le mot de passe (Laisser vide pour ne pas modifier)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="password" placeholder="Nouveau mot de passe" className="pl-10 font-medium font-mono" {...field} value={field.value || ""} />
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isactive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 bg-forest-50/50 rounded-2xl border border-forest-100">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-bold text-forest-900">Compte Actif</FormLabel>
                    <p className="text-[0.7rem] text-sand-400 font-medium">Désactiver pour bloquer temporairement l&apos;accès.</p>
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
                {isLoading ? "Traitement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


