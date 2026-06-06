'use client';

import * as React from 'react';
import { useForm, Controller, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCategory, useUpdateCategory } from '@/hooks/use-categories';
import { Loader2, FolderTree, Tag, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';

const subCategorySchema = z.object({
  reference: z.string().min(1, 'Référence requise'),
  description: z.string().min(1, 'Description requise'),
});

const categorySchema = z.object({
  reference: z.string().min(1, 'Référence requise'),
  description: z.string().min(1, 'Description requise'),
  subcategories: z.array(subCategorySchema).min(1, 'Au moins une sous-catégorie est requise'),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category?: any; // If provided, we are adding sub-categories to this category
}

export function CategoryFormDialog({ isOpen, onClose, category }: CategoryFormDialogProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { user } = useAuthStore();
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      reference: '',
      description: '',
      subcategories: [{ reference: '', description: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "subcategories"
  });

  React.useEffect(() => {
    if (isOpen) {
      if (category) {
        reset({
          reference: category.reference,
          description: category.description,
          subcategories: [{ reference: '', description: '' }],
        });
      } else {
        reset({
          reference: '',
          description: '',
          subcategories: [{ reference: '', description: '' }],
        });
      }
    }
  }, [isOpen, category, reset]);

  const onSubmit: SubmitHandler<CategoryFormValues> = (data) => {
    const userId = Number(user?.id);
    
    if (isEditing) {
      // Logic for adding sub-categories to existing category (Legacy Put call)
      const newSubcategories = data.subcategories.map(sc => ({
        id: 0,
        reference: sc.reference,
        description: sc.description,
        creationdate: new Date().toISOString(),
        updatedate: new Date().toISOString(),
        isdeleted: false,
        updatedBy: userId,
        idparent: category.id,
        isNew: true
      }));

      const payload = {
        ...category,
        firstchildren: newSubcategories
      };

      updateCategory.mutate({ id: category.id, data: payload }, {
        onSuccess: () => onClose()
      });
    } else {
      // Logic for creating new category with sub-categories
      const payload = {
        id: 0,
        reference: data.reference,
        description: data.description,
        createdby: userId,
        creationdate: new Date().toISOString(),
        updatedate: new Date().toISOString(),
        isdeleted: false,
        firstchildren: data.subcategories.map(sc => ({
          id: 0,
          reference: sc.reference,
          description: sc.description,
          creationdate: new Date().toISOString(),
          updatedate: new Date().toISOString(),
          isdeleted: false,
          updatedBy: userId,
          idparent: 0,
          isNew: true
        }))
      };

      createCategory.mutate(payload, {
        onSuccess: () => onClose()
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl">
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <FolderTree className="w-32 h-32" />
          </div>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 relative z-10">
            {isEditing ? (
              <>
                <Plus className="w-6 h-6" />
                Sous-catégories pour {category.reference}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                Nouvelle Catégorie
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-corp-blue-100 text-sm font-medium mt-1 relative z-10">
            {isEditing 
              ? 'Ajoutez de nouvelles sous-catégories à cette catégorie.' 
              : 'Créez une catégorie avec au moins une sous-catégorie initiale.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 bg-white max-h-[70vh] overflow-y-auto custom-scrollbar">
          {!isEditing && (
            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-corp-blue-50">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-corp-blue-900">Réf. Catégorie</Label>
                <Input 
                  {...register('reference')} 
                  placeholder="ex: PIN"
                  className="bg-sand-50 font-medium" 
                />
                {errors.reference && <p className="text-xs text-red-500 font-medium">{errors.reference.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-corp-blue-900">Description</Label>
                <Input 
                  {...register('description')} 
                  placeholder="ex: Pin Sylvestre"
                  className="bg-sand-50 font-medium" 
                />
                {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-corp-blue-900 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-corp-blue-400" />
                Sous-catégories
              </Label>
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                onClick={() => append({ reference: '', description: '' })}
                className="text-corp-blue-600 font-bold h-8 gap-1 hover:bg-corp-blue-50"
              >
                <Plus className="w-4 h-4" /> Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_2fr_auto] gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1">
                    <Input 
                      {...register(`subcategories.${index}.reference` as const)} 
                      placeholder="Réf"
                      className="rounded-lg bg-sand-50/50 border-corp-blue-50 text-sm"
                    />
                    {errors.subcategories?.[index]?.reference && (
                      <p className="text-[10px] text-red-500 font-medium">{errors.subcategories[index]?.reference?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Input 
                      {...register(`subcategories.${index}.description` as const)} 
                      placeholder="Désignation"
                      className="rounded-lg bg-sand-50/50 border-corp-blue-50 text-sm"
                    />
                    {errors.subcategories?.[index]?.description && (
                      <p className="text-[10px] text-red-500 font-medium">{errors.subcategories[index]?.description?.message}</p>
                    )}
                  </div>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon"
                    disabled={fields.length === 1 && !isEditing}
                    onClick={() => remove(index)}
                    className="h-10 w-10 text-sand-300 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            {errors.subcategories?.root && (
              <p className="text-xs text-red-500 font-bold">{errors.subcategories.root.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1 h-12 border-corp-blue-100 text-corp-blue-600 font-bold hover:bg-corp-blue-50"
            >
              Annuler
            </Button>
            <Button 
              disabled={createCategory.isPending || updateCategory.isPending}
              className="flex-[2] h-12 bg-corp-blue-600 text-white hover:bg-corp-blue-800 font-bold shadow-lg shadow-corp-blue-600/20"
            >
              {createCategory.isPending || updateCategory.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isEditing ? 'Enregistrer' : 'Créer la catégorie'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


