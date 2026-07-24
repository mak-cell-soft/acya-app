'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, MapPin, CreditCard, UserCheck, Sparkles, X } from 'lucide-react';
import { PassagerInfo } from '@/types/customer';

const passagerSchema = z.object({
  firstname: z.string().min(1, 'Le prénom est requis'),
  lastname: z.string().min(1, 'Le nom est requis'),
  address: z.string().min(1, "L'adresse est requise"),
  cin: z.string().min(1, 'Le N° CIN est requis'),
});

interface PassengerCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (info: PassagerInfo) => void;
  initialData?: PassagerInfo | null;
}

export function PassengerCustomerModal({
  isOpen,
  onClose,
  onConfirm,
  initialData,
}: PassengerCustomerModalProps) {
  const form = useForm<PassagerInfo>({
    resolver: zodResolver(passagerSchema),
    defaultValues: {
      firstname: '',
      lastname: '',
      address: '',
      cin: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset(initialData);
      } else {
        form.reset({
          firstname: '',
          lastname: '',
          address: '',
          cin: '',
        });
      }
    }
  }, [isOpen, initialData, form]);

  const handleSubmit = (data: PassagerInfo) => {
    onConfirm({
      firstname: data.firstname.trim(),
      lastname: data.lastname.trim(),
      address: data.address.trim(),
      cin: data.cin.trim(),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-2xl bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-corp-blue-900 via-corp-blue-800 to-corp-blue-900 p-6 text-white relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-amber-300">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-wide">
                Fiche Client Passager
              </DialogTitle>
              <DialogDescription className="text-xs text-corp-blue-200 mt-0.5">
                Vente ponctuelle sans création de compte permanent
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full text-corp-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Prénom */}
              <FormField
                control={form.control}
                name="firstname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-corp-blue-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-corp-blue-600" /> Prénom *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Mohamed"
                        className="h-10 rounded-xl border-corp-blue-100 bg-sand-50/50 text-xs font-semibold focus:ring-corp-blue-600"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[0.7rem]" />
                  </FormItem>
                )}
              />

              {/* Nom */}
              <FormField
                control={form.control}
                name="lastname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-corp-blue-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-corp-blue-600" /> Nom *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Ben Ali"
                        className="h-10 rounded-xl border-corp-blue-100 bg-sand-50/50 text-xs font-semibold focus:ring-corp-blue-600"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[0.7rem]" />
                  </FormItem>
                )}
              />
            </div>

            {/* CIN */}
            <FormField
              control={form.control}
              name="cin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-corp-blue-900 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-corp-blue-600" /> N° CIN *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 08123456"
                      className="h-10 rounded-xl border-corp-blue-100 bg-sand-50/50 text-xs font-semibold focus:ring-corp-blue-600"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[0.7rem]" />
                </FormItem>
              )}
            />

            {/* Adresse */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-corp-blue-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-corp-blue-600" /> Adresse *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Rue de la liberté, Tunis"
                      className="h-10 rounded-xl border-corp-blue-100 bg-sand-50/50 text-xs font-semibold focus:ring-corp-blue-600"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[0.7rem]" />
                </FormItem>
              )}
            />

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-corp-blue-50 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-10 rounded-xl text-xs font-bold text-sand-600 border-sand-200 hover:bg-sand-100"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-xl text-xs font-bold bg-corp-blue-600 hover:bg-corp-blue-700 text-white shadow-lg shadow-corp-blue-600/20 px-5 flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" /> Confirmer Client Passager
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
