'use client';

import React, { useState, useEffect } from 'react';
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
  Building
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthStore } from '@/store/use-auth-store';
import { toast } from 'sonner';

interface SupportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportDialog({ isOpen, onClose }: SupportDialogProps) {
  const { user } = useAuthStore();

  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [enterprise, setEnterprise] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [isPending, setIsPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && user) {
      setFullname(user.fullname || '');
      setEmail(user.email || '');
      setEnterprise(user.enterpriseName || '');
      setSubject('');
      setMessage('');
      setErrors({});
    }
  }, [isOpen, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fullname.trim()) newErrors.fullname = 'Le nom est requis';
    if (!email.trim()) newErrors.email = 'L\'email est requis';
    if (!subject.trim()) newErrors.subject = 'Le sujet est requis';
    if (!message.trim()) newErrors.message = 'Le message est requis';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsPending(true);

    // Simulate support request submission
    setTimeout(() => {
      setIsPending(false);
      toast.success('Votre message a été envoyé avec succès ! Notre support vous contactera sous peu.');
      onClose();
    }, 1200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-none sm:rounded-2xl bg-white font-sans">
        
        {/* Header Block with Premium Light Blue Gradient */}
        <DialogHeader className="bg-corp-blue-50/90 border-b border-corp-blue-100 pb-4 mb-4 p-8 relative backdrop-blur-md">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border border-corp-blue-200 text-corp-blue-600 font-bold text-xl shadow-sm">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Aide & Support
              </DialogTitle>
              <p className="text-muted-foreground text-sm font-medium">
                Envoyez-nous un message et notre équipe vous répondra sous peu.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="absolute rounded-full right-6 top-6 w-8 h-8 bg-slate-100 flex items-center justify-center hover:bg-slate-200 hover:scale-105 transition-all text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nom complet */}
            <div className="space-y-2">
              <Label htmlFor="fullname" className="text-sm font-medium text-slate-700">Nom Complet</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="fullname"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className={`pl-10 h-10 w-full rounded-lg bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-sm ${errors.fullname ? 'border-rose-500' : ''}`}
                />
              </div>
              {errors.fullname && (
                <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.fullname}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 h-10 w-full rounded-lg bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-sm ${errors.email ? 'border-rose-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Entreprise */}
          <div className="space-y-2">
            <Label htmlFor="enterprise" className="text-sm font-medium text-slate-700">Entreprise</Label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="enterprise"
                value={enterprise}
                onChange={(e) => setEnterprise(e.target.value)}
                className="pl-10 h-10 w-full rounded-lg bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Sujet */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium text-slate-700">Sujet de votre demande</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Problème d'impression, question sur la facturation..."
              className={`h-10 w-full rounded-lg bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-sm ${errors.subject ? 'border-rose-500' : ''}`}
            />
            {errors.subject && (
              <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.subject}
              </p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium text-slate-700">Message / Détails</Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Décrivez votre problème ou votre question..."
              className={`w-full p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-corp-blue-500 transition-all outline-none resize-none shadow-sm ${errors.message ? 'border-rose-500' : ''}`}
            />
            {errors.message && (
              <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.message}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="h-11 rounded-lg border-slate-200 text-slate-600 font-bold hover:bg-slate-50 px-6"
            >
              Annuler
            </Button>
            <Button 
              type="submit"
              disabled={isPending}
              className="h-11 rounded-lg bg-corp-blue-600 hover:bg-corp-blue-700 text-white font-bold px-6 shadow-md shadow-corp-blue-600/20 gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer la demande
            </Button>
          </div>
        </form>

      </DialogContent>
    </Dialog>
  );
}
