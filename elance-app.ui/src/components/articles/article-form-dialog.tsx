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
  Package, 
  PlusCircle, 
  PencilLine, 
  Camera, 
  X, 
  TreeDeciduous, 
  Calculator,
  LayoutGrid,
  Info,
  Layers,
  Wrench
} from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import { useAppVariables } from "@/hooks/use-app-variables";
import { useAuthStore } from "@/store/use-auth-store";
import { Article, ArticleType, QuantityUnits } from "@/types/article";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const articleSchema = z.object({
  type: z.coerce.number().default(ArticleType.Merchandise),
  reference: z.string().min(1, "La référence est requise"),
  description: z.string().min(1, "La désignation est requise"),
  categoryid: z.string().min(1, "La catégorie est requise"),
  subcategoryid: z.string().min(1, "La sous-catégorie est requise"),
  thicknessid: z.string().optional().nullable(),
  widthid: z.string().optional().nullable(),
  unit: z.string().min(1, "L'unité est requise"),
  sellprice_ttc: z.coerce.number().min(0, "Le prix doit être positif"),
  tvaid: z.string().min(1, "La TVA est requise"),
  minquantity: z.coerce.number().min(0, "La quantité doit être positive"),
  profitmarginpercentage: z.coerce.number().min(0).max(100, "Entre 0 et 100"),
  imageurl: z.string().optional().nullable(),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

interface ArticleFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: any) => void;
  editArticle: Article | null;
  isLoading?: boolean;
}

export function ArticleFormDialog({
  isOpen,
  onClose,
  onSave,
  editArticle,
  isLoading
}: ArticleFormDialogProps) {
  const { data: categories } = useCategories();
  const { data: tvas } = useAppVariables('Tva');
  const { data: widths } = useAppVariables('width');
  const { data: thicknesses } = useAppVariables('thickness');
  const { data: lengths } = useAppVariables('Length');

  const [selectedLengths, setSelectedLengths] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema) as any,
    defaultValues: {
      type: ArticleType.Merchandise,
      reference: "",
      description: "",
      categoryid: "",
      subcategoryid: "",
      thicknessid: "",
      widthid: "",
      unit: QuantityUnits.pcs.split(" - ")[0].toUpperCase(),
      sellprice_ttc: 0,
      tvaid: "",
      minquantity: 0,
      profitmarginpercentage: 0,
      imageurl: null,
    },
  });

  const selectedType = form.watch("type");
  const isService = Number(selectedType) === ArticleType.Service;
  const selectedCategoryId = form.watch("categoryid");
  const selectedPriceTTC = form.watch("sellprice_ttc");
  const selectedTvaId = form.watch("tvaid");

  // Derive whether the selected category is a wood category by checking its description,
  // NOT by hardcoded ID. This prevents false-positives on new tenants whose non-wood
  // categories happen to get ID=1 in a freshly-created table.
  const isWoodCategory = !isService && !!(
    selectedCategoryId &&
    categories?.find(c => c.id.toString() === selectedCategoryId)
              ?.description?.toLowerCase().includes('bois')
  );

  // Reset form when opening or changing editArticle
  useEffect(() => {
    if (isOpen) {
      if (editArticle) {
        form.reset({
          type: editArticle.type ?? ArticleType.Merchandise,
          reference: editArticle.reference,
          description: editArticle.description,
          categoryid: editArticle.categoryid.toString(),
          subcategoryid: editArticle.subcategoryid.toString(),
          thicknessid: editArticle.thicknessid?.toString() || "",
          widthid: editArticle.widthid?.toString() || "",
          unit: editArticle.unit,
          sellprice_ttc: editArticle.sellprice_ttc,
          tvaid: editArticle.tvaid.toString(),
          minquantity: editArticle.minquantity,
          profitmarginpercentage: editArticle.profitmarginpercentage,
          imageurl: editArticle.imageurl,
        });
        setPreviewImage(editArticle.imageurl || null);
        if (editArticle.lengths) {
          try {
            const parsed = editArticle.lengths.replace('[', '').replace(']', '').split(',').map(l => l.trim()).filter(Boolean);
            setSelectedLengths(parsed);
          } catch (e) {
            setSelectedLengths([]);
          }
        } else {
          setSelectedLengths([]);
        }
      } else {
        form.reset({
          type: ArticleType.Merchandise,
          reference: "",
          description: "",
          categoryid: "",
          subcategoryid: "",
          thicknessid: "",
          widthid: "",
          unit: "PCS",
          sellprice_ttc: 0,
          tvaid: "",
          minquantity: 0,
          profitmarginpercentage: 0,
          imageurl: null,
        });
        setPreviewImage(null);
        setSelectedLengths([]);
      }
    }
  }, [isOpen, editArticle, form]);

  const filteredSubCategories = useMemo(() => {
    if (!selectedCategoryId || !categories) return [];
    const cat = categories.find(c => c.id.toString() === selectedCategoryId);
    return cat?.firstchildren || [];
  }, [selectedCategoryId, categories]);

  const selectedSubcategoryId = form.watch("subcategoryid");

  const selectedSubcategory = useMemo(() => {
    if (!selectedSubcategoryId || !filteredSubCategories) return null;
    return filteredSubCategories.find(s => s.id.toString() === selectedSubcategoryId.toString());
  }, [selectedSubcategoryId, filteredSubCategories]);

  const isBdSubcategory = useMemo(() => {
    return selectedSubcategory?.reference?.toUpperCase() === 'BD';
  }, [selectedSubcategory]);

  // Clear width and lengths when BD subcategory is selected
  useEffect(() => {
    if (isBdSubcategory) {
      form.setValue("widthid", "");
      setSelectedLengths([]);
    }
  }, [isBdSubcategory, form]);

  // Handle Category logic (Wood vs others)
  // Uses isWoodCategory (description-based) instead of hardcoded ID=1
  useEffect(() => {
    if (isWoodCategory) {
      form.setValue("unit", "M3");
    }
  }, [isWoodCategory, selectedCategoryId, form]);

  // Price Calculation
  const calculatedHT = useMemo(() => {
    if (selectedPriceTTC && selectedTvaId && tvas) {
      const tva = tvas.find(t => t.id.toString() === selectedTvaId);
      if (tva && tva.value) {
        const tvaVal = parseFloat(tva.value.toString().replace(',', '.'));
        if (!isNaN(tvaVal)) {
          return selectedPriceTTC / (1 + tvaVal / 100);
        }
      }
    }
    return 0;
  }, [selectedPriceTTC, selectedTvaId, tvas]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewImage(base64);
        form.setValue("imageurl", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLengthToggle = (length: string) => {
    setSelectedLengths(prev => 
      prev.includes(length) ? prev.filter(l => l !== length) : [...prev, length].sort((a, b) => parseFloat(a) - parseFloat(b))
    );
  };

  const { user } = useAuthStore();
  const currentUserId = user?.id ? parseInt(user.id.toString()) : 1;

  const onSubmit = (values: ArticleFormValues) => {
    const isBd = isBdSubcategory;
    const isServiceArt = Number(values.type) === ArticleType.Service;
    const model = {
      ...values,
      id: editArticle?.id,
      type: Number(values.type),
      categoryid: parseInt(values.categoryid),
      subcategoryid: parseInt(values.subcategoryid),
      tvaid: parseInt(values.tvaid),
      thicknessid: isServiceArt ? null : (values.thicknessid ? parseInt(values.thicknessid) : null),
      widthid: isServiceArt ? null : (isBd ? null : (values.widthid ? parseInt(values.widthid) : null)),
      sellprice_ht: calculatedHT,
      iswood: isServiceArt ? false : isWoodCategory,
      lengths: (!isServiceArt && isWoodCategory && !isBd) ? `[${selectedLengths.join(', ')}]` : "[]",
      minquantity: isServiceArt ? 0 : values.minquantity,
      updatedby: currentUserId,
    };
    onSave(model);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl md:max-w-4xl lg:max-w-5xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-none sm:rounded-2xl bg-background scrollbar-hide">
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-corp-blue-50 flex items-center justify-center border border-corp-blue-100">
              {editArticle ? <PencilLine className="w-6 h-6 text-emerald-600" /> : <PlusCircle className="w-6 h-6 text-emerald-600" />}
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {editArticle ? "Modifier l'Article" : "Nouvel Article"}
              </DialogTitle>
              <p className="text-muted-foreground text-sm font-medium mt-1">
                {editArticle ? `Modification de la référence ${editArticle.reference}` : "Ajoutez un nouvel article à votre catalogue."}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute rounded-full right-6 top-6 w-8 h-8 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
            {/* General Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-corp-blue-50">
                <LayoutGrid className="w-4 h-4 text-corp-blue-600" />
                <h3 className="font-bold text-corp-blue-900">Informations Générales</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                {/* Image Upload */}
                <div className="md:col-span-1 space-y-4">
                  <div 
                    className={cn(
                      "aspect-square rounded-3xl border-2 border-dashed border-corp-blue-100 bg-sand-50/50 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all hover:border-corp-blue-600 hover:bg-corp-blue-50/30",
                      previewImage && "border-solid border-corp-blue-200 bg-white"
                    )}
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    {previewImage ? (
                      <>
                        <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-corp-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPreviewImage(null); form.setValue("imageurl", null); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Camera className="w-10 h-10 text-sand-200 group-hover:text-corp-blue-600 transition-colors" />
                        <span className="text-[0.65rem] font-bold text-sand-400 uppercase mt-2">Ajouter Image</span>
                      </>
                    )}
                  </div>
                  <input 
                    id="image-upload"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                </div>

                {/* Form Fields */}
                <div className="md:col-span-4 space-y-6">
                  {/* Article Type Selector */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Type d'Article</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                          <label
                            className={cn(
                              "flex items-center justify-center gap-2.5 p-3 rounded-xl border cursor-pointer font-bold text-xs transition-all",
                              Number(field.value) === ArticleType.Merchandise
                                ? "bg-corp-blue-50/80 border-corp-blue-600 text-corp-blue-900 shadow-sm"
                                : "bg-white border-corp-blue-100 text-sand-500 hover:bg-corp-blue-50/20"
                            )}
                          >
                            <input
                              type="radio"
                              name="articleTypeSelection"
                              className="sr-only"
                              checked={Number(field.value) === ArticleType.Merchandise}
                              onChange={() => {
                                field.onChange(ArticleType.Merchandise);
                                form.setValue("unit", "PCS");
                              }}
                            />
                            <Package className="w-4 h-4 text-corp-blue-600" />
                            <span>Marchandise <small className="text-sand-400 font-normal">(avec stock)</small></span>
                          </label>

                          <label
                            className={cn(
                              "flex items-center justify-center gap-2.5 p-3 rounded-xl border cursor-pointer font-bold text-xs transition-all",
                              Number(field.value) === ArticleType.Service
                                ? "bg-indigo-50 border-indigo-600 text-indigo-900 shadow-sm"
                                : "bg-white border-corp-blue-100 text-sand-500 hover:bg-indigo-50/20"
                            )}
                          >
                            <input
                              type="radio"
                              name="articleTypeSelection"
                              className="sr-only"
                              checked={Number(field.value) === ArticleType.Service}
                              onChange={() => {
                                field.onChange(ArticleType.Service);
                                form.setValue("unit", "FORFAIT");
                              }}
                            />
                            <Layers className="w-4 h-4 text-indigo-600" />
                            <span>Service <small className="text-indigo-400 font-normal">(sans stock)</small></span>
                          </label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Référence</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: RF163100..."  {...field} />
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
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Désignation</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Bois Rouge Finlandais..."  {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="categoryid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Catégorie</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                            <FormControl>
                              <SelectTrigger >
                                <SelectValue placeholder="Choisir une catégorie">
                                  {field.value && categories ? categories.find(c => c.id.toString() === field.value.toString())?.description : undefined}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-corp-blue-100 shadow-xl">
                              {categories?.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.description}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subcategoryid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Sous-catégorie</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString() || ""} disabled={!selectedCategoryId}>
                            <FormControl>
                              <SelectTrigger >
                                <SelectValue placeholder="Choisir une sous-catégorie">
                                  {field.value ? filteredSubCategories.find(sub => sub.id.toString() === field.value.toString())?.description : undefined}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-corp-blue-100 shadow-xl">
                              {filteredSubCategories.map((sub) => (
                                <SelectItem key={sub.id} value={sub.id.toString()}>{sub.description}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Wood Properties Section (Conditional) */}
            {isWoodCategory && (
              <div className="space-y-6 animate-in slide-in-from-top duration-500">
                <div className="flex items-center justify-between pb-2 border-b border-corp-blue-50">
                  <div className="flex items-center gap-2">
                    <TreeDeciduous className="w-4 h-4 text-corp-blue-600" />
                    <h3 className="font-bold text-corp-blue-900">Propriétés du Bois</h3>
                  </div>
                  {isBdSubcategory && (
                    <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs">
                      <Info className="w-3.5 h-3.5 text-amber-600" />
                      Sous-catégorie BD (Bois de Débit) — Saisie Sur Mesure
                    </Badge>
                  )}
                </div>

                {isBdSubcategory && (
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <span className="font-bold">Spécificité Bois BD :</span> Seule <strong>l'Épaisseur</strong> est fixe sur la fiche article. La <strong>Longueur</strong> et la <strong>Largeur Totale</strong> sont variables et seront renseignées sur mesure lors des mouvements de stock (Réceptions & Ventes).
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="thicknessid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Épaisseur (mm) *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger >
                              <SelectValue placeholder="Choisir une épaisseur">
                                {field.value && thicknesses ? thicknesses.find(t => t.id.toString() === field.value!.toString())?.name : undefined}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-corp-blue-100 shadow-xl">
                            {thicknesses?.map((t) => (
                              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="widthid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Largeur (mm)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={isBdSubcategory ? "" : (field.value?.toString() || "")}
                          disabled={isBdSubcategory}
                        >
                          <FormControl>
                            <SelectTrigger className={isBdSubcategory ? "bg-slate-100 opacity-60 cursor-not-allowed" : ""}>
                              <SelectValue placeholder={isBdSubcategory ? "Variable (Saisie à la transaction)" : "Choisir une largeur"}>
                                {!isBdSubcategory && field.value && widths ? widths.find(w => w.id.toString() === field.value!.toString())?.name : undefined}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-corp-blue-100 shadow-xl">
                            {widths?.map((w) => (
                              <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isBdSubcategory && (
                          <p className="text-[0.65rem] text-amber-700 font-medium mt-1">
                            La largeur fixe est désactivée pour le BD (saisie sur mesure).
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!isBdSubcategory ? (
                  <div className="space-y-4 p-6 rounded-3xl bg-corp-blue-50/50 border border-corp-blue-100">
                    <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Longueurs Disponibles (cm)</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      {lengths?.map((l) => (
                        <div key={l.id} className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-corp-blue-100 hover:border-corp-blue-600 transition-colors">
                          <Checkbox 
                            id={`len-${l.id}`} 
                            checked={selectedLengths.includes(l.name)}
                            onCheckedChange={() => handleLengthToggle(l.name)}
                            className="border-corp-blue-200 data-[state=checked]:bg-corp-blue-600 data-[state=checked]:border-corp-blue-600"
                          />
                          <label 
                            htmlFor={`len-${l.id}`}
                            className="text-sm font-bold text-corp-blue-900 cursor-pointer"
                          >
                            {l.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-dashed border-amber-200 text-amber-900 text-xs font-medium flex items-center justify-between">
                    <span>Sélection des longueurs prédéfinies désactivée : les longueurs seront saisies librement par ligne lors des mouvements.</span>
                    <Badge variant="outline" className="border-amber-300 text-amber-800 bg-white font-mono text-[0.65rem] font-bold shrink-0 ml-2">
                      Longueurs Libres
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Sales & Pricing Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-corp-blue-50">
                <Calculator className="w-4 h-4 text-corp-blue-600" />
                <h3 className="font-bold text-corp-blue-900">Vente & Tarification</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="sellprice_ttc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Prix Vente TTC</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" step="0.001" className="pr-12 font-bold" {...field} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sand-300 font-bold text-xs uppercase">TND</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tvaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">TVA (%)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger className="font-bold">
                            <SelectValue placeholder="Choisir TVA">
                              {field.value && tvas ? (() => {
                                const tva = tvas.find(t => t.id.toString() === field.value.toString());
                                if (!tva) return undefined;
                                const numVal = parseFloat(tva.value?.toString().replace(',', '.') || '0');
                                return `${isNaN(numVal) ? tva.value : numVal}%`;
                              })() : undefined}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-corp-blue-100 shadow-xl">
                          {tvas?.map((t) => {
                            const numVal = parseFloat(t.value?.toString().replace(',', '.') || '0');
                            return (
                              <SelectItem key={t.id} value={t.id.toString()} className="font-bold">
                                {isNaN(numVal) ? t.value : numVal}%
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Prix calculé HT</FormLabel>
                  <div className="h-12 rounded-xl border border-corp-blue-100 bg-sand-50/50 flex items-center px-4 font-bold text-sand-500">
                    {calculatedHT.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                    <span className="ml-auto text-[0.6rem] uppercase tracking-wider text-sand-300">Auto-Calcul</span>
                  </div>
                </FormItem>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">
                        {isService ? "Unité de facturation" : "Unité"}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isWoodCategory}>
                        <FormControl>
                          <SelectTrigger className="font-bold">
                            <SelectValue placeholder="Unité">
                              {field.value}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-corp-blue-100 shadow-xl">
                          {isService ? (
                            <>
                              <SelectItem value="FORFAIT">FORFAIT - Forfait</SelectItem>
                              <SelectItem value="HEURE">HEURE - Heure</SelectItem>
                              <SelectItem value="JOUR">JOUR - Jour</SelectItem>
                              <SelectItem value="PCS">PCS - Pièces</SelectItem>
                              <SelectItem value="PRESTATION">PRESTATION - Prestation</SelectItem>
                              <SelectItem value="MOIS">MOIS - Mois</SelectItem>
                              <SelectItem value="KM">KM - Kilomètre</SelectItem>
                            </>
                          ) : (
                            Object.values(QuantityUnits).map((unit) => (
                              <SelectItem key={unit} value={unit.split(" - ")[0].toUpperCase()}>{unit}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isService ? (
                  <FormField
                    control={form.control}
                    name="minquantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Quantité Min.</FormLabel>
                        <FormControl>
                          <Input type="number" className="font-bold" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="flex flex-col justify-center rounded-2xl bg-indigo-50/50 border border-indigo-100/60 p-3">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-indigo-700">Stock & Réappro</span>
                    <span className="text-xs font-medium text-indigo-900 mt-0.5">Non géré en stock (Service)</span>
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="profitmarginpercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Marge (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" className="pr-8 font-bold" {...field} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sand-300 font-bold">%</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                {isLoading ? "Traitement..." : (editArticle ? "Mettre à jour" : "Enregistrer")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


