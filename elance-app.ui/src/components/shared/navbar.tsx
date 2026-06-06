'use client';

import React, { useState } from 'react';
import { Bell, Search, User, Settings, LogOut, CreditCard, Menu, Calendar, Store, MapPin, X } from 'lucide-react';
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
import { toast } from 'sonner';

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
          className="lg:hidden h-10 w-10 text-forest-800"
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

        <NavbarNotifications />
        
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
          <DropdownMenuContent align="end" className="w-64 rounded-2xl border-corp-blue-100 shadow-xl p-0 overflow-hidden">
            {/* Rich visual header containing user profile summary */}
            <div className="bg-corp-blue-50/90 backdrop-blur-md border-b border-corp-blue-100 p-4 text-corp-blue-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-corp-blue-200 text-corp-blue-600 font-bold text-lg shadow-sm">
                  {(user?.fullname || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <div className="font-heading font-bold text-sm leading-tight text-corp-blue-950">{user?.fullname}</div>
                  <div className="text-[10px] font-semibold text-corp-blue-600 uppercase tracking-wider">{getRoleTranslated(user?.role)}</div>
                  {user?.defaultSite && (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-corp-blue-500 mt-1">
                      <MapPin className="h-3 w-3 text-corp-blue-400" />
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

import { useNotifications } from '@/hooks/use-notifications';
import { Truck as TruckIcon, AlertTriangle as AlertIcon, Info as InfoIcon, Check as CheckIcon, RefreshCw, Eye } from 'lucide-react';

function NavbarNotifications() {
  const { 
    notifications, 
    systemNotifications, 
    stockAlerts, 
    unreadCount, 
    isConnected,
    markAsRead, 
    dismissNotification, 
    openTransferConfirmDialog,
    refreshAll
  } = useNotifications();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsRefreshing(true);
      await refreshAll();
      toast.success('Notifications actualisées');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const unreadSystem = systemNotifications.filter(n => !n.isRead);
    if (unreadSystem.length === 0) return;
    
    try {
      await Promise.all(unreadSystem.map(n => markAsRead(n.id)));
      toast.success('Toutes les notifications système ont été marquées comme lues');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour des statuts');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative cursor-pointer hover:bg-forest-50 rounded-xl text-forest-800")}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-timber-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-background ring-1 ring-timber-500/20 animate-pulse">
            {unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 rounded-2xl border-forest-100 shadow-2xl p-0 overflow-hidden font-sans">
        {/* Dynamic Connected Header */}
        <div className="bg-gradient-to-r from-forest-900 to-forest-800 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-sm">Tableau des Alertes</h3>
            <span className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-emerald-450 animate-ping" : "bg-rose-450"
            )} title={isConnected ? "Connecté en temps réel" : "Déconnecté"} />
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 hover:bg-forest-800/60 rounded-lg text-forest-200 transition"
              title="Rafraîchir"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            </button>
            {systemNotifications.some(n => !n.isRead) && (
              <button 
                onClick={handleMarkAllRead}
                className="text-[10px] uppercase font-bold text-emerald-300 hover:text-white px-2 py-1 rounded hover:bg-forest-800/40 transition"
              >
                Tout lire
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900 scrollbar-thin">
          
          {/* 1. INTER-SITE TRANSFERS */}
          {notifications.length > 0 && (
            <div className="p-2 bg-amber-50/20 dark:bg-amber-950/5">
              <span className="px-2 py-1 text-[9px] uppercase font-bold tracking-wider text-amber-600 block mb-1">
                Expéditions Inter-Sites En Transit ({notifications.length})
              </span>
              <div className="space-y-1">
                {notifications.map((tr) => (
                  <div 
                    key={tr.id} 
                    className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl flex items-start justify-between gap-3 shadow-sm hover:border-amber-300 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <TruckIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">{tr.transferRef}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 lowercase leading-none">
                        Origine: {tr.originSite} • {tr.itemsCount} articles
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => openTransferConfirmDialog(tr)}
                        className="h-7 px-2.5 bg-forest-600 hover:bg-forest-800 text-white rounded-lg text-[10px] font-bold gap-1"
                      >
                        <Eye className="h-3 w-3" /> Réceptionner
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismissNotification(tr.id)}
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-500 rounded-lg shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. MINIMUM STOCK ALERTS */}
          {stockAlerts.length > 0 && (
            <div className="p-2 bg-rose-50/10 dark:bg-rose-950/5">
              <span className="px-2 py-1 text-[9px] uppercase font-bold tracking-wider text-rose-500 block mb-1">
                Alertes Niveau Stock Bas ({stockAlerts.length})
              </span>
              <div className="space-y-1">
                {stockAlerts.map((alert, idx) => (
                  <div 
                    key={idx} 
                    className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl flex items-start gap-2.5 shadow-sm hover:border-rose-350 transition"
                  >
                    <AlertIcon className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200 block truncate">
                        {alert.articleReference}
                      </span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Quantité actuelle : <span className="font-bold text-rose-600">{alert.quantity}</span> (Min : {alert.minimumStock})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. SYSTEM NOTIFICATIONS */}
          {systemNotifications.length > 0 && (
            <div className="p-2">
              <span className="px-2 py-1 text-[9px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                Notifications Système ({systemNotifications.length})
              </span>
              <div className="space-y-1">
                {systemNotifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={cn(
                      "p-2.5 rounded-xl border flex items-start gap-2.5 transition relative group",
                      notif.isRead 
                        ? "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-150/70 dark:border-zinc-850" 
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-forest-300"
                    )}
                  >
                    <InfoIcon className="h-4 w-4 text-forest-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 pr-6">
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 block">
                        {notif.title}
                      </span>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal">
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-zinc-400 font-medium block mt-1">
                        {new Date(notif.createdAt).toLocaleDateString('fr-FR')} à {new Date(notif.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    {!notif.isRead && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="absolute right-2 top-2 p-1 text-zinc-400 hover:text-forest-650 opacity-0 group-hover:opacity-100 transition"
                        title="Marquer comme lu"
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {notifications.length === 0 && stockAlerts.length === 0 && systemNotifications.length === 0 && (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-forest-50 dark:bg-forest-900/10 flex items-center justify-center border border-forest-100 dark:border-forest-900/30">
                <CheckIcon className="h-5 w-5 text-forest-600" />
              </div>
              <div className="text-xs font-medium text-zinc-500 font-serif italic">
                Tout est en ordre ! Aucune alerte active.
              </div>
            </div>
          )}

        </div>
        <div className="border-t border-zinc-100 dark:border-zinc-900 p-3 bg-zinc-50/50 dark:bg-zinc-900/20 text-center">
          <span className="text-[10px] font-bold text-forest-750 dark:text-forest-450 uppercase tracking-widest block">
            Flux de notification en temps réel
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

