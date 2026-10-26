'use client';

import React, { useState, useEffect, useId, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  HelpCircle, 
  Mail, 
  User, 
  X, 
  Send,
  Loader2,
  AlertCircle,
  Building,
  Paperclip,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  Warehouse,
  Package,
  Users,
  Factory,
  Info,
  Clock,
  ShieldCheck,
  FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthStore } from '@/store/use-auth-store';
import { useTenantFeatures } from '@/hooks/use-tenant-features';
import { useArticles } from '@/hooks/use-articles';
import { useSites } from '@/hooks/use-enterprise';
import { usePersons } from '@/hooks/use-team';
import { useChantiersList } from '@/hooks/use-chantiers';
import { useProductionOrdersList } from '@/hooks/use-production';
import { useSubmitSupportTicket } from '@/hooks/use-support';
import { 
  SUPPORT_CATEGORIES, 
  SUPPORT_PRIORITIES, 
  SupportPriority, 
  SupportTicketResponse 
} from '@/types/support';
import { toast } from 'sonner';

interface SupportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportDialog({ isOpen, onClose }: SupportDialogProps) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const { isManagingConstructions, isManagingProduction } = useTenantFeatures();

  const submitTicketMutation = useSubmitSupportTicket();

  // Basic Form Fields
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [enterprise, setEnterprise] = useState('');
  const [category, setCategory] = useState('Autre demande');
  const [subcategory, setSubcategory] = useState('Question sur l\'utilisation');
  const [priority, setPriority] = useState<SupportPriority>('Normale');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // Reusable domain selectors data - strictly lazy & feature-gated
  const isChantierOrProdSelected = isOpen && category === 'Chantiers & Production';
  const { data: chantiers = [] } = useChantiersList(undefined, {
    enabled: isChantierOrProdSelected && isManagingConstructions,
  });
  const { data: productionOrders = [] } = useProductionOrdersList(undefined, {
    enabled: isChantierOrProdSelected && isManagingProduction,
  });
  const { data: articles = [] } = useArticles({
    enabled: isOpen && (category === 'Gestion des articles' || category === 'Gestion du stock'),
  });
  const { data: sites = [] } = useSites({
    enabled: isOpen && category === 'Gestion du stock',
  });
  const { data: persons = [] } = usePersons({
    enabled: isOpen && category === 'Ressources humaines',
  });

  // Contextual Fields
  const [mobileAccessType, setMobileAccessType] = useState<'new_install' | 'additional_device'>('new_install');
  const [mobilePlatform, setMobilePlatform] = useState<'android' | 'ios' | 'both'>('android');
  const [mobileUserCount, setMobileUserCount] = useState<number>(1);
  const [mobileErrorMsg, setMobileErrorMsg] = useState('');
  const [mobileIssueTime, setMobileIssueTime] = useState('');

  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [selectedChantierId, setSelectedChantierId] = useState<string>('');
  const [selectedProductionOrderId, setSelectedProductionOrderId] = useState<string>('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [observedBehavior, setObservedBehavior] = useState('');

  // Attachment
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<SupportTicketResponse | null>(null);
  const [copiedReference, setCopiedReference] = useState(false);

  // Available categories based on tenant subscription features
  const availableCategories = useMemo(() => {
    return SUPPORT_CATEGORIES.filter((cat) => {
      if (cat.id === 'Chantiers & Production') {
        return isManagingConstructions || isManagingProduction;
      }
      return true;
    });
  }, [isManagingConstructions, isManagingProduction]);

  // Current subcategories
  const currentCategoryConfig = useMemo(() => {
    return availableCategories.find((c) => c.id === category) || availableCategories[0];
  }, [availableCategories, category]);

  // Initialize and Reset on Open
  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFullname(user.fullname || '');
        setEmail(user.email || '');
        setEnterprise(user.enterpriseName || '');
      }
      // Generate unique idempotency key per form session
      setIdempotencyKey(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`);
      setSubmitError(null);
      setSuccessResult(null);
      setCopiedReference(false);
      setErrors({});
    }
  }, [isOpen, user]);

  // When category changes, reset subcategory to first valid option
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const catConfig = availableCategories.find((c) => c.id === newCat);
    if (catConfig && catConfig.subcategories.length > 0) {
      setSubcategory(catConfig.subcategories[0]);
    }
  };

  // Attachment Handling with Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier dépasse la limite maximale de 5 Mo.');
      return;
    }

    // Validate extension
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.pdf'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = allowedExtensions.some(ext => lowerName.endsWith(ext));

    if (!hasValidExt) {
      toast.error('Format de fichier non supporté. Formats acceptés : .png, .jpg, .jpeg, .pdf');
      return;
    }

    setAttachmentFile(file);
    toast.success(`Fichier "${file.name}" attaché.`);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyReference = () => {
    if (!successResult) return;
    navigator.clipboard.writeText(successResult.ticketReference);
    setCopiedReference(true);
    toast.success('Référence copiée dans le presse-papier !');
    setTimeout(() => setCopiedReference(false), 2500);
  };

  const handleResetForNewTicket = () => {
    setSubject('');
    setDescription('');
    setAttachmentFile(null);
    setExpectedBehavior('');
    setObservedBehavior('');
    setSelectedArticleId('');
    setSelectedSiteId('');
    setSelectedPersonId('');
    setSelectedChantierId('');
    setSelectedProductionOrderId('');
    setSuccessResult(null);
    setSubmitError(null);
    setIdempotencyKey(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!category.trim()) newErrors.category = 'La catégorie est requise';
    if (!subcategory.trim()) newErrors.subcategory = 'Le type de demande est requis';
    if (!subject.trim()) newErrors.subject = 'Le sujet est requis';
    if (!description.trim()) newErrors.description = 'La description détaillée est requise';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);

    // Build context data object
    const contextData: Record<string, any> = {
      submittedAt: new Date().toISOString(),
    };

    if (category === 'Application mobile') {
      contextData.mobileAccessType = mobileAccessType;
      contextData.mobilePlatform = mobilePlatform;
      if (subcategory.includes('accès')) {
        contextData.userCount = mobileUserCount;
      } else {
        if (mobileErrorMsg.trim()) contextData.errorMessage = mobileErrorMsg.trim();
        if (mobileIssueTime.trim()) contextData.issueStartTime = mobileIssueTime.trim();
      }
    } else if (category === 'Gestion du stock' || category === 'Gestion des articles') {
      if (selectedArticleId) {
        const foundArt = articles.find((a) => String(a.id) === selectedArticleId);
        contextData.articleId = selectedArticleId;
        contextData.articleReference = foundArt?.reference || '';
        contextData.articleName = foundArt?.description || '';
      }
      if (selectedSiteId) {
        const foundSite = sites.find((s) => String(s.id) === selectedSiteId);
        contextData.salesSiteId = selectedSiteId;
        contextData.salesSiteName = foundSite ? (foundSite.address || foundSite.gov || (foundSite.isForsale ? 'Point de Vente' : 'Dépôt')) : '';
      }
      if (expectedBehavior.trim()) contextData.expectedBehavior = expectedBehavior.trim();
      if (observedBehavior.trim()) contextData.observedBehavior = observedBehavior.trim();
    } else if (category === 'Ressources humaines') {
      if (selectedPersonId) {
        const foundPerson = persons.find((p) => String(p.id) === selectedPersonId);
        contextData.employeeId = selectedPersonId;
        contextData.employeeName = foundPerson ? `${foundPerson.firstname} ${foundPerson.lastname}` : '';
      }
      if (expectedBehavior.trim()) contextData.expectedBehavior = expectedBehavior.trim();
      if (observedBehavior.trim()) contextData.observedBehavior = observedBehavior.trim();
    } else if (category === 'Chantiers & Production') {
      if (selectedChantierId) {
        const foundChantier = chantiers.find((c) => String(c.id) === selectedChantierId);
        contextData.chantierId = selectedChantierId;
        contextData.chantierName = foundChantier?.name || foundChantier?.reference || '';
      }
      if (selectedProductionOrderId) {
        const foundPo = productionOrders.find((p) => String(p.id) === selectedProductionOrderId);
        contextData.productionOrderId = selectedProductionOrderId;
        contextData.productionOrderRef = foundPo?.reference || '';
      }
      if (expectedBehavior.trim()) contextData.expectedBehavior = expectedBehavior.trim();
      if (observedBehavior.trim()) contextData.observedBehavior = observedBehavior.trim();
    }

    // Build FormData
    const formData = new FormData();
    formData.append('Category', category);
    formData.append('Subcategory', subcategory);
    formData.append('Priority', priority);
    formData.append('Subject', subject.trim());
    formData.append('Description', description.trim());
    formData.append('CurrentRoute', pathname || '/');
    formData.append('AppVersion', 'v2.0');
    formData.append('ContextData', JSON.stringify(contextData));
    formData.append('IdempotencyKey', idempotencyKey);

    if (attachmentFile) {
      formData.append('Attachment', attachmentFile);
    }

    try {
      const response = await submitTicketMutation.mutateAsync(formData);
      setSuccessResult(response);
      toast.success('Votre ticket a été enregistré avec succès !');
    } catch (err: any) {
      console.error('Support ticket submission error:', err);
      const serverMessage = err.response?.data?.message || err.message || 'Erreur lors de l\'enregistrement du ticket.';
      setSubmitError(serverMessage);
      toast.error('Échec de la soumission. Vos saisies ont été conservées.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-2xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-none sm:rounded-2xl bg-white font-sans max-h-[92vh] flex flex-col">
        
        {/* Header Block with Premium Light Blue Gradient */}
        <DialogHeader className="bg-corp-blue-50/90 border-b border-corp-blue-100 pb-4 p-6 sm:p-7 relative backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-corp-blue-200 text-corp-blue-600 font-bold text-xl shadow-sm shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Aide & Support Technique
              </DialogTitle>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium">
                Assistance ERP Élancé &bull; Équipe support dédiée
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="absolute rounded-full right-5 top-5 w-8 h-8 bg-slate-100 flex items-center justify-center hover:bg-slate-200 hover:scale-105 transition-all text-slate-600"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        {/* Content body */}
        <div className="overflow-y-auto px-6 sm:px-8 py-6 space-y-6 flex-1">

          {/* SUCCESS CONFIRMATION STATE */}
          {successResult ? (
            <div className="py-6 space-y-6 text-center animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200 shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">Votre demande a bien été enregistrée</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Notre équipe support a été notifiée et prendra en charge votre ticket dans les meilleurs délais.
                </p>
              </div>

              {/* Reference Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-md mx-auto space-y-3">
                <div className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  Référence du ticket
                </div>
                <div className="text-2xl font-mono font-black text-corp-blue-700 tracking-wider">
                  {successResult.ticketReference}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Conservez cette référence pour identifier votre demande lors de vos échanges avec le support ACYA.
                </p>
                <div className="pt-2 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyReference}
                    className="gap-2 text-xs font-semibold rounded-lg border-slate-300 hover:bg-white"
                  >
                    {copiedReference ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedReference ? 'Référence copiée' : 'Copier la référence'}
                  </Button>
                </div>
              </div>

              {/* Ticket Details Summary */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Catégorie :</span>
                  <span className="font-bold text-slate-800">{successResult.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Type :</span>
                  <span className="font-bold text-slate-800">{successResult.subcategory}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Priorité :</span>
                  <span className="font-bold text-slate-800">{successResult.priority}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Notification Support :</span>
                  <span className={`font-bold flex items-center gap-1 ${successResult.emailDispatched ? 'text-emerald-600' : 'text-slate-600'}`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {successResult.emailDispatched ? 'Email transmis à support@acya.site' : 'Ticket enregistré avec succès'}
                  </span>
                </div>
              </div>

              {/* Success Actions */}
              <div className="pt-4 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetForNewTicket}
                  className="rounded-lg border-slate-300 font-semibold"
                >
                  Nouvelle demande
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-corp-blue-600 hover:bg-corp-blue-700 text-white font-bold px-6 shadow-sm"
                >
                  Fermer
                </Button>
              </div>
            </div>
          ) : (
            /* FORM STATE */
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Server error banner if submission failed */}
              {submitError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Impossible d'enregistrer votre demande</p>
                    <p className="text-xs text-rose-700">{submitError}</p>
                    <p className="text-xs text-slate-500 mt-1">Vos données saisies ci-dessous ont été conservées. Vous pouvez corriger et réessayer.</p>
                  </div>
                </div>
              )}

              {/* SECTION 1: VOS INFORMATIONS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-corp-blue-600 bg-corp-blue-50 px-2 py-0.5 rounded">
                    Section 1
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Vos Informations
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
                  {/* Nom complet */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-500">Nom complet</Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        value={fullname}
                        readOnly
                        disabled
                        className="pl-8 h-9 text-xs font-bold text-slate-700 bg-white border-slate-200 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-500">Email professionnel</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        value={email}
                        readOnly
                        disabled
                        className="pl-8 h-9 text-xs font-bold text-slate-700 bg-white border-slate-200 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Entreprise */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-500">Entreprise</Label>
                    <div className="relative">
                      <Building className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        value={enterprise}
                        readOnly
                        disabled
                        className="pl-8 h-9 text-xs font-bold text-slate-700 bg-white border-slate-200 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: VOTRE DEMANDE */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-corp-blue-600 bg-corp-blue-50 px-2 py-0.5 rounded">
                    Section 2
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Votre Demande
                  </h4>
                </div>

                {/* Category & Subcategory Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <Label htmlFor="category-select" className="text-xs font-bold text-slate-700">
                      Catégorie <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      id="category-select"
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-corp-blue-500"
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategory */}
                  <div className="space-y-1.5">
                    <Label htmlFor="subcategory-select" className="text-xs font-bold text-slate-700">
                      Type de problème / Demande <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      id="subcategory-select"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-corp-blue-500"
                    >
                      {currentCategoryConfig.subcategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Priorité de la demande <span className="text-rose-500">*</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {SUPPORT_PRIORITIES.map((p) => {
                      const isSelected = priority === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPriority(p.value)}
                          className={`text-left p-3 rounded-xl border transition-all ${
                            isSelected
                              ? p.value === 'Critique'
                                ? 'border-rose-400 bg-rose-50/80 ring-2 ring-rose-300'
                                : p.value === 'Élevée'
                                ? 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-300'
                                : 'border-corp-blue-400 bg-corp-blue-50/80 ring-2 ring-corp-blue-300'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold uppercase tracking-wider ${
                              p.value === 'Critique' ? 'text-rose-700' : p.value === 'Élevée' ? 'text-amber-800' : 'text-slate-700'
                            }`}>
                              {p.label}
                            </span>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-corp-blue-600" />}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                            {p.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* DYNAMIC CONTEXTUAL FIELDS */}
                {category === 'Application mobile' && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Smartphone className="w-4 h-4 text-corp-blue-600" />
                      Détails de l'environnement Mobile
                    </div>

                    {subcategory === "Demande d'accès à l'application mobile" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600">Type d'accès</Label>
                          <select
                            value={mobileAccessType}
                            onChange={(e) => setMobileAccessType(e.target.value as any)}
                            className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="new_install">Nouvelle installation</option>
                            <option value="additional_device">Appareil supplémentaire</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600">Système</Label>
                          <select
                            value={mobilePlatform}
                            onChange={(e) => setMobilePlatform(e.target.value as any)}
                            className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="android">Android (APK)</option>
                            <option value="ios">iOS (Apple)</option>
                            <option value="both">Android & iOS</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600">Nombre d'utilisateurs</Label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={mobileUserCount}
                            onChange={(e) => setMobileUserCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="h-9 text-xs bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600">Plateforme</Label>
                          <select
                            value={mobilePlatform}
                            onChange={(e) => setMobilePlatform(e.target.value as any)}
                            className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="android">Android</option>
                            <option value="ios">iOS</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600">Début du problème</Label>
                          <Input
                            placeholder="Ex: Aujourd'hui 09h00"
                            value={mobileIssueTime}
                            onChange={(e) => setMobileIssueTime(e.target.value)}
                            className="h-9 text-xs bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600">Message d'erreur affiché</Label>
                          <Input
                            placeholder="Ex: Erreur 403 / Déconnexion"
                            value={mobileErrorMsg}
                            onChange={(e) => setMobileErrorMsg(e.target.value)}
                            className="h-9 text-xs bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(category === 'Gestion du stock' || category === 'Gestion des articles') && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      {category === 'Gestion du stock' ? <Warehouse className="w-4 h-4 text-corp-blue-600" /> : <Package className="w-4 h-4 text-corp-blue-600" />}
                      Informations Article & Dépôt (Facultatif mais recommandé)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Article concerné</Label>
                        <select
                          value={selectedArticleId}
                          onChange={(e) => setSelectedArticleId(e.target.value)}
                          className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="">Sélectionner un article (optionnel)...</option>
                          {articles.map((art) => (
                            <option key={art.id} value={art.id}>
                              [{art.reference}] {art.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Site / Dépôt concerné</Label>
                        <select
                          value={selectedSiteId}
                          onChange={(e) => setSelectedSiteId(e.target.value)}
                          className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="">Sélectionner un site/dépôt (optionnel)...</option>
                          {sites.map((site) => (
                            <option key={site.id} value={site.id}>
                              Site #{site.id} {site.address ? `- ${site.address}` : site.gov ? `- ${site.gov}` : site.isForsale ? '(Point de Vente)' : '(Dépôt)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Résultat / Quantité attendu(e)</Label>
                        <Input
                          placeholder="Ex: 50 pièces ou 12.5 m3"
                          value={expectedBehavior}
                          onChange={(e) => setExpectedBehavior(e.target.value)}
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Résultat / Quantité constaté(e)</Label>
                        <Input
                          placeholder="Ex: 35 pièces affichées"
                          value={observedBehavior}
                          onChange={(e) => setObservedBehavior(e.target.value)}
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {category === 'Ressources humaines' && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Users className="w-4 h-4 text-corp-blue-600" />
                      Informations RH (Facultatif)
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Employé concerné</Label>
                      <select
                        value={selectedPersonId}
                        onChange={(e) => setSelectedPersonId(e.target.value)}
                        className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="">Sélectionner un employé (optionnel)...</option>
                        {persons.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.firstname} {person.lastname}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Comportement attendu</Label>
                        <Input
                          placeholder="Ex: Congé payé validé"
                          value={expectedBehavior}
                          onChange={(e) => setExpectedBehavior(e.target.value)}
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Comportement constaté</Label>
                        <Input
                          placeholder="Ex: Déduit du salaire"
                          value={observedBehavior}
                          onChange={(e) => setObservedBehavior(e.target.value)}
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {category === 'Chantiers & Production' && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Factory className="w-4 h-4 text-corp-blue-600" />
                      Informations Chantier & Fabrication (Facultatif)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {isManagingConstructions && (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600">Chantier concerné</Label>
                          <select
                            value={selectedChantierId}
                            onChange={(e) => setSelectedChantierId(e.target.value)}
                            className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="">Sélectionner un chantier (optionnel)...</option>
                            {chantiers.map((ch) => (
                              <option key={ch.id} value={ch.id}>
                                [{ch.reference}] {ch.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {isManagingProduction && (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600">Ordre de production</Label>
                          <select
                            value={selectedProductionOrderId}
                            onChange={(e) => setSelectedProductionOrderId(e.target.value)}
                            className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="">Sélectionner un ordre (optionnel)...</option>
                            {productionOrders.map((po) => (
                              <option key={po.id} value={po.id}>
                                [{po.reference}] {po.description || 'Ordre de production'}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Comportement attendu</Label>
                        <Input
                          placeholder="Ex: Validation de l'étape de coupe"
                          value={expectedBehavior}
                          onChange={(e) => setExpectedBehavior(e.target.value)}
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Comportement constaté</Label>
                        <Input
                          placeholder="Ex: Blocage avec message d'erreur"
                          value={observedBehavior}
                          onChange={(e) => setObservedBehavior(e.target.value)}
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sujet */}
                <div className="space-y-1.5">
                  <Label htmlFor="ticket-subject" className="text-xs font-bold text-slate-700">
                    Sujet de votre demande <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="ticket-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Écart d'inventaire dépôt principal, accès application mobile..."
                    aria-invalid={!!errors.subject}
                    className={`h-10 text-xs ${errors.subject ? 'border-rose-500 ring-rose-200' : ''}`}
                  />
                  {errors.subject && (
                    <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.subject}
                    </p>
                  )}
                </div>

                {/* Message / Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="ticket-description" className="text-xs font-bold text-slate-700">
                    Description détaillée <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="ticket-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Décrivez précisément votre problème, les étapes pour le reproduire et les messages d'erreur éventuels..."
                    aria-invalid={!!errors.description}
                    className={`text-xs ${errors.description ? 'border-rose-500 ring-rose-200' : ''}`}
                  />
                  {errors.description && (
                    <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.description}
                    </p>
                  )}
                </div>

                {/* Optional Attachment */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    Pièce jointe (Optionnel)
                  </Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".png,.jpg,.jpeg,.pdf"
                    className="hidden"
                    id="support-file-input"
                  />

                  {attachmentFile ? (
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700 truncate">
                        <FileText className="w-4 h-4 text-corp-blue-600 shrink-0" />
                        <span className="truncate">{attachmentFile.name}</span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          ({(attachmentFile.size / 1024).toFixed(0)} Ko)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAttachment}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                        title="Supprimer la pièce jointe"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-slate-200 hover:border-corp-blue-400 rounded-xl p-3 text-center cursor-pointer hover:bg-corp-blue-50/20 transition-colors"
                    >
                      <p className="text-xs text-slate-500 font-medium">
                        Glissez une capture d'écran ou cliquez pour parcourir
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Formats acceptés : PNG, JPG, PDF (Max. 5 Mo)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: CONTEXTE TECHNIQUE */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3 h-3 text-slate-400" />
                    <span>Contexte d'application auto-détecté :</span>
                    <code className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono text-[10px]">
                      {pathname || '/'}
                    </code>
                  </div>
                  <span>Version : v2.0</span>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={submitTicketMutation.isPending}
                  className="h-10 rounded-lg border-slate-200 text-slate-600 font-bold hover:bg-slate-50 px-5 text-xs"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit"
                  disabled={submitTicketMutation.isPending}
                  className="h-10 rounded-lg bg-corp-blue-600 hover:bg-corp-blue-700 text-white font-bold px-6 shadow-md shadow-corp-blue-600/20 gap-2 text-xs"
                >
                  {submitTicketMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Envoi du ticket...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Soumettre la demande
                    </>
                  )}
                </Button>
              </div>

            </form>
          )}

        </div>

      </DialogContent>
    </Dialog>
  );
}
