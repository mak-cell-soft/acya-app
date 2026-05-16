'use client';

import React, { useState } from 'react';
import { Bell, Search, User, Settings, LogOut, CreditCard, Menu, Calendar, Store, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/use-auth-store';
import { useRouter } from 'next/navigation';

import { Button, buttonVariants } from '@/components/ui/button';
import { ProfileDialog } from './profile-dialog';

interface NavbarProps {
  onMenuClick: () => void;
}

/**
 * Translates application roles to user-friendly French terms.
 * Supports both numeric values and string representations.
 */
const getRoleTranslated = (role: string | number | undefined): string => {
  if (!role) return 'Utilisateur';
  
  const roleNum = typeof role === 'number' ? role : parseInt(role, 10);
  if (!isNaN(roleNum)) {
    switch (roleNum) {
      case 10: return 'Super Administrateur';
      case 20: return 'Administrateur';
      case 30: return 'Utilisateur';
      case 40: return 'Conducteur';
      case 50: return 'Vendeur';
      case 60: return 'Agent de Facturation';
      case 70: return 'Responsable de Magasin';
      default: return 'Utilisateur';
    }
  }

  switch (role.toString().toLowerCase()) {
    case 'superadmin': return 'Super Administrateur';
    case 'admin': return 'Administrateur';
    case 'user': return 'Utilisateur';
    case 'conductor': return 'Conducteur';
    case 'seller': return 'Vendeur';
    case 'invoiceagent': return 'Agent de Facturation';
    case 'storemanager': return 'Responsable de Magasin';
    default: return role.toString();
  }
};

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Formats current local date to French format (e.g. '16 mai 2026')
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat('fr-FR', options).format(new Date());
  };

  return (
    <header className="h-16 border-b border-border bg-background/80 flex items-center justify-between px-6 sticky top-0 z-10 backdrop-blur-md font-sans">
      <div className="flex items-center gap-4 flex-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden h-10 w-10 rounded-xl text-forest-800"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <div className="relative w-full max-w-sm hidden sm:block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-sand-400" />
          <Input
            type="search"
            placeholder="Rechercher..."
            className="pl-10 bg-background border-forest-100 h-10 w-full rounded-xl focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10 transition-all shadow-sm"
          />
        </div>

        {/* Date bubble matching the styling of WoodApp-UI header */}
        <div className="hidden md:flex items-center gap-2 text-sand-600 bg-sand-50/60 border border-sand-100/50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-sand-50 shadow-sm ml-2">
          <Calendar className="h-3.5 w-3.5 text-sand-400" />
          <span className="capitalize">{getFormattedDate()}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Sales site storefront chip */}
        {user?.defaultSite && (
          <div className="hidden sm:flex items-center gap-2 bg-forest-50/50 border border-forest-100 px-3.5 py-2 rounded-xl text-xs font-bold text-forest-800 shadow-sm transition-all hover:bg-forest-50">
            <Store className="h-3.5 w-3.5 text-forest-600" />
            <span>{user.defaultSite}</span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative cursor-pointer hover:bg-forest-50 rounded-xl text-forest-800")}>
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-timber-400 rounded-full border-2 border-background" />
            <span className="sr-only">Notifications</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-2xl border-forest-100 shadow-xl">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-heading text-lg text-forest-900">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-forest-100" />
            </DropdownMenuGroup>
            <div className="max-h-[320px] overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-4 cursor-pointer hover:bg-forest-50 transition-colors">
                <span className="font-bold text-sm text-forest-800">Nouvelle Vente !</span>
                <span className="text-xs text-sand-400">Paiement de 199.00 € reçu.</span>
                <span className="text-[10px] text-forest-400 font-bold mt-1">Il y a 2 minutes</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-forest-100" />
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-4 cursor-pointer hover:bg-forest-50 transition-colors">
                <span className="font-bold text-sm text-forest-800">Mise à jour système</span>
                <span className="text-xs text-sand-400">Maintenance prévue à 02:00.</span>
                <span className="text-[10px] text-forest-400 font-bold mt-1">Il y a 1 heure</span>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator className="bg-forest-100" />
            <DropdownMenuItem className="justify-center text-xs font-bold text-forest-600 py-3 cursor-pointer">
              Voir toutes les notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="w-px h-6 bg-forest-100 mx-1" />
        
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2 px-2 hover:bg-forest-50 rounded-xl cursor-pointer flex items-center")}>
            <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center border border-forest-200">
              <User className="h-4 w-4 text-forest-600" />
            </div>
            <div className="hidden md:flex flex-col items-start text-left leading-none">
              <span className="font-bold text-sm text-forest-800 mb-0.5">{user?.fullname || 'Utilisateur'}</span>
              <span className="text-[10px] text-sand-500 font-semibold">{getRoleTranslated(user?.role)}</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl border-forest-100 shadow-xl p-0 overflow-hidden">
            {/* Rich visual header containing user profile summary */}
            <div className="bg-gradient-to-r from-forest-900 to-forest-800 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-forest-800 flex items-center justify-center border border-forest-700 text-emerald-400 font-bold text-lg shadow-inner">
                  {(user?.fullname || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <div className="font-heading font-bold text-sm leading-tight text-white">{user?.fullname}</div>
                  <div className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">{getRoleTranslated(user?.role)}</div>
                  {user?.defaultSite && (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-forest-200 mt-1">
                      <MapPin className="h-3 w-3 text-emerald-400" />
                      <span>{user.defaultSite}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-forest-50 transition-colors font-bold text-sm text-forest-700 focus:bg-forest-50"
                  onClick={() => setIsProfileOpen(true)}
                >
                  <User className="h-4 w-4 text-forest-400" /> Profil
                </DropdownMenuItem>
                {(user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === '20' || user?.role === '10') && (
                  <DropdownMenuItem 
                    className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-forest-50 transition-colors font-bold text-sm text-forest-700 focus:bg-forest-50"
                    onClick={() => router.push('/settings')}
                  >
                    <Settings className="h-4 w-4 text-forest-400" /> Paramètres
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-forest-100" />
              <DropdownMenuItem className="text-rose-500 gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-rose-50 transition-colors font-bold text-sm focus:bg-rose-50" onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> Déconnexion
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProfileDialog isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </header>
  );
}
