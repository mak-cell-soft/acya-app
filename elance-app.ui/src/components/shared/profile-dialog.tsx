'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  X, 
  Eye, 
  EyeOff,
  Shield,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile, useUpdateProfile, useUpdatePassword } from '@/hooks/use-profile';
import { useAuthStore } from '@/store/use-auth-store';

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ProfileDialog Component
 * 
 * Renders a high-fidelity modal dialog for user profile management.
 * Designed to resemble the modal layout and functionality from the original Angular WoodApp-UI dashboard.
 * Supports updating personal information (first name, last name, phone, address, email) 
 * and password management (with real-time confirmation checks and custom styling).
 */
export function ProfileDialog({ isOpen, onClose }: ProfileDialogProps) {
  // NOTE: We fetch user identity from the centralized AuthStore to determine the correct target profile
  const { user } = useAuthStore();
  const userId = user ? parseInt(user.id, 10) : 0;

  // React Query Mutations and Queries
  // NOTE: getProfile leverages cache invalidation so updates instantly propagate to the layout
  const { data: profile, isLoading: isProfileLoading, refetch } = useProfile(userId);
  const updateProfileMutation = useUpdateProfile();
  const updatePasswordMutation = useUpdatePassword();

  // Tab Navigation State ('info' for details, 'security' for passwords)
  const [activeTab, setActiveTab] = useState('info');

  // Form states for profile information
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');

  // Form states for password changes
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password hide/show toggle states for enhanced UX
  const [hideOld, setHideOld] = useState(true);
  const [hideNew, setHideNew] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);

  // Client-side local validation states
  const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Synchronize state values from server query upon success or whenever dialog is mounted
  useEffect(() => {
    if (profile) {
      setLogin(profile.login || '');
      setEmail(profile.email || '');
      setFirstName(profile.person?.firstname || '');
      setLastName(profile.person?.lastname || '');
      setPhoneNumber(profile.person?.phonenumber || '');
      setAddress(profile.person?.address || '');
    }
  }, [profile, isOpen]);

  // Clean password states when changing tabs or closing dialogs to protect secret entry fields
  useEffect(() => {
    if (!isOpen) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    }
  }, [isOpen, activeTab]);

  /**
   * Validates and submits Profile Information
   * C# API Assumption: The endpoint PUT `/Account/update-profile` expects:
   * { email: string, login: string, firstName: string, lastName: string, phoneNumber?: string, address?: string }
   * The backend will capitalize FirstName/LastName and automatically assign full name.
   */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!email) errors.email = 'L\'adresse e-mail est requise';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'L\'adresse e-mail n\'est pas valide';
    
    if (!firstName) errors.firstName = 'Le prénom est requis';
    if (!lastName) errors.lastName = 'Le nom est requis';

    if (Object.keys(errors).length > 0) {
      setInfoErrors(errors);
      return;
    }

    setInfoErrors({});

    const model = {
      email,
      login,
      firstName,
      lastName,
      phoneNumber,
      address
    };

    updateProfileMutation.mutate(model, {
      onSuccess: () => {
        // Refetch to align our UI state values perfectly with the saved backend model state
        refetch();
      }
    });
  };

  /**
   * Validates and submits Password Update Request
   * C# API Assumption: PUT `/Account/update-password` requires current oldPassword to build a valid matching
   * HMACSHA512 computed hash before replacing the hash/salt with the new value.
   */
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!oldPassword) errors.oldPassword = 'Le mot de passe actuel est requis';
    if (!newPassword) errors.newPassword = 'Le nouveau mot de passe est requis';
    else if (newPassword.length < 6) errors.newPassword = 'Le nouveau mot de passe doit comporter au moins 6 caractères';
    
    if (!confirmPassword) errors.confirmPassword = 'Veuillez confirmer le nouveau mot de passe';
    else if (newPassword !== confirmPassword) errors.confirmPassword = 'Les mots de passe ne correspondent pas';

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});

    const model = {
      oldPassword,
      newPassword
    };

    updatePasswordMutation.mutate(model, {
      onSuccess: () => {
        // Reset password fields so they are not left populated in the browser DOM
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl md:max-w-3xl p-0 overflow-hidden border-forest-100 shadow-2xl rounded-none sm:rounded-[32px] bg-white font-sans">
        
        {/* Header Block with Premium Forest Green Gradient */}
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-forest-50 flex items-center justify-center border border-forest-100 text-emerald-600 font-bold text-xl shadow-inner">
              <User className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                Mon Profil
              </DialogTitle>
              <p className="text-muted-foreground text-sm font-medium">
                Gérez vos informations personnelles et votre sécurité.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 hover:scale-105 transition-all text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        {/* Dynamic Tab Layout Wrapper */}
        <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-8 bg-forest-900/5 border-b border-forest-100">
            <TabsList className="h-14 bg-transparent gap-8">
              <TabsTrigger 
                value="info" 
                className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-forest-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 font-bold text-sand-400 data-[state=active]:text-forest-900 gap-2 transition-all"
              >
                <User className="w-4 h-4" /> Informations
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-forest-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 font-bold text-sand-400 data-[state=active]:text-forest-900 gap-2 transition-all"
              >
                <Shield className="w-4 h-4" /> Sécurité
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8 max-h-[500px] overflow-y-auto">
            {isProfileLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 text-forest-600 animate-spin" />
                <p className="text-sm font-medium text-sand-400">Chargement de vos informations...</p>
              </div>
            ) : (
              <>
                {/* Tab Content: Profile Info */}
                <TabsContent value="info" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Login Identifier (Read-only as mapped in Angular implementation) */}
                      <div className="space-y-2">
                        <Label htmlFor="login" className="text-xs font-bold uppercase tracking-wider text-forest-800">
                          Identifiant (Login)
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-sand-300" />
                          <Input
                            id="login"
                            value={login}
                            disabled
                            className="pl-10 bg-sand-50/50 border-forest-100 h-10 w-full rounded-xl text-sand-400 cursor-not-allowed font-medium font-mono"
                          />
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-forest-800">
                          Email
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-sand-300" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`pl-10 bg-white border-forest-100 h-10 w-full rounded-xl focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10 transition-all ${infoErrors.email ? 'border-rose-500' : ''}`}
                            placeholder="example@mail.com"
                          />
                        </div>
                        {infoErrors.email && (
                          <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {infoErrors.email}
                          </p>
                        )}
                      </div>

                      {/* First Name */}
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-xs font-bold uppercase tracking-wider text-forest-800">
                          Prénom
                        </Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={`bg-white border-forest-100 h-10 w-full rounded-xl focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10 transition-all ${infoErrors.firstName ? 'border-rose-500' : ''}`}
                          placeholder="Votre prénom"
                        />
                        {infoErrors.firstName && (
                          <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {infoErrors.firstName}
                          </p>
                        )}
                      </div>

                      {/* Last Name */}
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-xs font-bold uppercase tracking-wider text-forest-800">
                          Nom
                        </Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={`bg-white border-forest-100 h-10 w-full rounded-xl focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10 transition-all ${infoErrors.lastName ? 'border-rose-500' : ''}`}
                          placeholder="Votre nom"
                        />
                        {infoErrors.lastName && (
                          <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {infoErrors.lastName}
                          </p>
                        )}
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber" className="text-xs font-bold uppercase tracking-wider text-forest-800">
                          Téléphone
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-sand-300" />
                          <Input
                            id="phoneNumber"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="pl-10 bg-white border-forest-100 h-10 w-full rounded-xl focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10 transition-all"
                            placeholder="Numéro de téléphone"
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-forest-800">
                          Adresse
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-sand-300" />
                          <textarea
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            rows={3}
                            className="pl-10 pt-2.5 bg-white border border-forest-100 w-full rounded-xl focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10 transition-all text-sm outline-none resize-none font-sans"
                            placeholder="Votre adresse complète"
                          />
                        </div>
                      </div>

                    </div>

                    {/* Submitting Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-forest-50">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onClose}
                        className="rounded-xl h-11 border-forest-100 text-forest-600 font-bold hover:bg-forest-50 px-6"
                      >
                        Annuler
                      </Button>
                      <Button 
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="rounded-xl h-11 bg-forest-600 text-white hover:bg-forest-800 font-bold px-6 shadow-lg shadow-forest-600/10 gap-2"
                      >
                        {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Enregistrer les modifications
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                {/* Tab Content: Password/Security Update */}
                <TabsContent value="security" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div className="bg-sand-50/50 p-5 rounded-2xl border border-sand-100 text-sm text-sand-600 font-medium">
                      Pour changer votre mot de passe, veuillez saisir votre mot de passe actuel ainsi que le nouveau.
                    </div>

                    <div className="space-y-5">
                      
                      {/* Current Old Password */}
                      <div className="space-y-2">
                        <Label htmlFor="oldPassword" className="text-xs font-bold uppercase tracking-wider text-forest-800">
                          Mot de passe actuel
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-sand-300" />
                          <Input
                            id="oldPassword"
                            type={hideOld ? "password" : "text"}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className={`pl-10 pr-10 bg-white border-forest-100 h-10 w-full rounded-xl focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10 transition-all ${passwordErrors.oldPassword ? 'border-rose-500' : ''}`}
                            placeholder="Saisir votre mot de passe actuel"
                          />
                          <button
                            type="button"
                            onClick={() => setHideOld(!hideOld)}
                            className="absolute right-3 top-3 h-4 w-4 text-sand-400 hover:text-forest-600 cursor-pointer"
                          >
                            {hideOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passwordErrors.oldPassword && (
                          <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {passwordErrors.oldPassword}
                          </p>
                        )}
                      </div>

                      {/* New Password */}
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-xs font-bold uppercase tracking-wider text-forest-800">
                          Nouveau mot de passe
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-sand-300" />
                          <Input
                            id="newPassword"
                            type={hideNew ? "password" : "text"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={`pl-10 pr-10 bg-white border-forest-100 h-10 w-full rounded-xl focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10 transition-all ${passwordErrors.newPassword ? 'border-rose-500' : ''}`}
                            placeholder="Minimum 6 caractères"
                          />
                          <button
                            type="button"
                            onClick={() => setHideNew(!hideNew)}
                            className="absolute right-3 top-3 h-4 w-4 text-sand-400 hover:text-forest-600 cursor-pointer"
                          >
                            {hideNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passwordErrors.newPassword && (
                          <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {passwordErrors.newPassword}
                          </p>
                        )}
                      </div>

                      {/* Confirm New Password */}
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-forest-800">
                          Confirmer le nouveau mot de passe
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-sand-300" />
                          <Input
                            id="confirmPassword"
                            type={hideConfirm ? "password" : "text"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`pl-10 pr-10 bg-white border-forest-100 h-10 w-full rounded-xl focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10 transition-all ${passwordErrors.confirmPassword ? 'border-rose-500' : ''}`}
                            placeholder="Confirmer votre nouveau mot de passe"
                          />
                          <button
                            type="button"
                            onClick={() => setHideConfirm(!hideConfirm)}
                            className="absolute right-3 top-3 h-4 w-4 text-sand-400 hover:text-forest-600 cursor-pointer"
                          >
                            {hideConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passwordErrors.confirmPassword && (
                          <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {passwordErrors.confirmPassword}
                          </p>
                        )}
                      </div>

                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-forest-50">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onClose}
                        className="rounded-xl h-11 border-forest-100 text-forest-600 font-bold hover:bg-forest-50 px-6"
                      >
                        Annuler
                      </Button>
                      <Button 
                        type="submit"
                        disabled={updatePasswordMutation.isPending}
                        className="rounded-xl h-11 bg-forest-600 text-white hover:bg-forest-800 font-bold px-6 shadow-lg shadow-forest-600/10 gap-2"
                      >
                        {updatePasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Mettre à jour le mot de passe
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
