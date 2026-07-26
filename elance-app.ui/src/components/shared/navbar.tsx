'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Bell, Search, User, Settings, LogOut, CreditCard, Menu, Calendar, Store, MapPin, X, LayoutDashboard, Package, ShoppingBag, ShoppingCart, Users, Truck, Warehouse, Calculator, BarChart3, ClipboardList, Car, UserCheck, ArrowRight } from 'lucide-react';
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
          className="lg:hidden h-10 w-10 text-corp-blue-800"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <NavbarSearch />

        {/* Date bubble matching the styling of WoodApp-UI header */}
        <div className="hidden md:flex items-center gap-2 text-sand-600 bg-sand-50/60 border border-sand-100/50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-sand-50 shadow-sm ml-2">
          <Calendar className="h-3.5 w-3.5 text-sand-400" />
          <span className="capitalize">{getFormattedDate()}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Sales site storefront chip */}
        {user?.defaultSite && (
          <div className="hidden sm:flex items-center gap-2 bg-corp-blue-50/50 border border-corp-blue-100 px-3.5 py-2 rounded-xl text-xs font-bold text-corp-blue-800 shadow-sm transition-all hover:bg-corp-blue-50">
            <Store className="h-3.5 w-3.5 text-corp-blue-600" />
            <span>{user.defaultSite}</span>
          </div>
        )}

        <NavbarNotifications />
        
        <div className="w-px h-6 bg-corp-blue-100 mx-1" />
        
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2 px-2 hover:bg-corp-blue-50 rounded-xl cursor-pointer flex items-center")}>
            <div className="w-8 h-8 rounded-full bg-corp-blue-100 flex items-center justify-center border border-corp-blue-200">
              <User className="h-4 w-4 text-corp-blue-600" />
            </div>
            <div className="hidden md:flex flex-col items-start text-left leading-none">
              <span className="font-bold text-sm text-corp-blue-800 mb-0.5">{user?.fullname || 'Utilisateur'}</span>
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
                  <div className="font-bold text-sm leading-tight text-corp-blue-950">{user?.fullname}</div>
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
                  className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-corp-blue-50 transition-colors font-bold text-sm text-corp-blue-700 focus:bg-corp-blue-50"
                  onClick={() => setIsProfileOpen(true)}
                >
                  <User className="h-4 w-4 text-corp-blue-400" /> Profil
                </DropdownMenuItem>
                {(user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === '20' || user?.role === '10') && (
                  <DropdownMenuItem 
                    className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-corp-blue-50 transition-colors font-bold text-sm text-corp-blue-700 focus:bg-corp-blue-50"
                    onClick={() => router.push('/settings')}
                  >
                    <Settings className="h-4 w-4 text-corp-blue-400" /> Paramètres
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-corp-blue-100" />
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

import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { PermissionModuleKey } from '@/types/permissions';
import { Lock } from 'lucide-react';

type SearchShortcut = {
  name: string;
  href: string;
  icon: any;
  keywords: string[];
  module?: PermissionModuleKey;
  adminOnly?: boolean;
};

const SEARCH_SHORTCUTS: SearchShortcut[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, keywords: ['tableau', 'bord', 'accueil', 'dashboard', 'home'] },
  { name: 'Articles & Produits', href: '/articles', icon: Package, module: 'articles', keywords: ['article', 'produit', 'stock', 'prix', 'm3', 'bois'] },
  { name: 'Ventes & Factures', href: '/sales', icon: ShoppingBag, module: 'sales', keywords: ['vente', 'devis', 'facture', 'commande', 'client', 'bl'] },
  { name: 'Achats & Fournisseurs', href: '/purchases', icon: ShoppingCart, module: 'purchases', keywords: ['achat', 'reception', 'bon', 'commande', 'fournisseur'] },
  { name: 'Stock & Dépôts', href: '/stock', icon: Warehouse, module: 'stock', keywords: ['stock', 'depot', 'transfert', 'inventaire', 'emplacement'] },
  { name: 'Clients', href: '/customers', icon: Users, module: 'customers', keywords: ['client', 'partenaire', 'contact'] },
  { name: 'Fournisseurs', href: '/suppliers', icon: Truck, module: 'providers', keywords: ['fournisseur', 'prestataire', 'tiers'] },
  { name: 'Analyses & Rapports', href: '/analytics', icon: BarChart3, module: 'analytics', keywords: ['analyse', 'rapport', 'statistique', 'chiffre', 'marge'] },
  { name: 'Recherche Approfondie', href: '/sales/deep-search', icon: Search, module: 'sales', keywords: ['deep', 'recherche', 'avancée', 'impayés', 'bénéfices'] },
  { name: 'Pré-Analyse Comptable', href: '/accounting', icon: Calculator, module: 'accounting', keywords: ['compta', 'comptabilite', 'tva', 'journal', 'banque'] },
  { name: 'Chantiers', href: '/chantiers', icon: ClipboardList, keywords: ['chantier', 'projet', 'suivi'] },
  { name: 'Véhicules & Flotte', href: '/vehicles', icon: Car, module: 'vehicles', keywords: ['vehicule', 'camion', 'flotte', 'transport'] },
  { name: 'Équipe & RH', href: '/team', icon: UserCheck, module: 'hr', keywords: ['equipe', 'rh', 'employe', 'personnel', 'utilisateur'] },
  { name: 'Paramètres', href: '/settings', icon: Settings, module: 'configuration', keywords: ['parametre', 'option', 'configuration', 'tva', 'unite'] },
];

function NavbarSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuthStore();
  const { hasAnyPermission } = usePermissionGuard();

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === '20' || user?.role === '10';

  const checkPermission = (item: SearchShortcut): boolean => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.module && !hasAnyPermission(item.module)) return false;
    return true;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredShortcuts = useMemo(() => {
    if (!query.trim()) return SEARCH_SHORTCUTS.slice(0, 6);
    const q = query.toLowerCase().trim();
    return SEARCH_SHORTCUTS.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.keywords.some(k => k.toLowerCase().includes(q))
    );
  }, [query]);

  const handleSelect = (item: SearchShortcut) => {
    setIsOpen(false);
    setQuery('');

    if (!checkPermission(item)) {
      toast.error("Accès refusé : Vous n'avez pas la permission d'accéder à ce module.");
      return;
    }

    router.push(item.href);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const matched = SEARCH_SHORTCUTS.find(s => s.name.toLowerCase().includes(query.toLowerCase().trim()));
    if (matched) {
      handleSelect(matched);
    } else {
      setIsOpen(false);
      inputRef.current?.blur();
      if (!hasAnyPermission('sales')) {
        toast.error("Accès refusé : Vous n'avez pas la permission d'accéder à la recherche avancée.");
        return;
      }
      router.push('/sales/deep-search');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm hidden sm:block">
      <form onSubmit={handleSubmit} className="relative w-full">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher (ex: Devis, Articles, Impayés...)"
          className="pl-10 pr-16 bg-white hover:bg-slate-50 focus:bg-white border-slate-300 hover:border-slate-400 focus:border-corp-blue-600 focus:ring-4 focus:ring-corp-blue-600/15 h-10 w-full rounded-xl text-xs font-semibold transition-all shadow-2xs placeholder:text-slate-400/90 placeholder:font-normal"
        />
        {query ? (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="absolute right-3 top-2.5 hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs pointer-events-none select-none">
            <span className="text-[9px]">⌘</span>K
          </kbd>
        )}
      </form>

      {isOpen && (
        <div className="absolute left-0 right-0 top-12 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl z-50 overflow-hidden font-sans p-2 animate-in fade-in slide-in-from-top-2 duration-150">
          {query.trim() && (
            <div className="p-2 border-b border-slate-100 mb-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (!hasAnyPermission('sales')) {
                    toast.error("Accès refusé : Vous n'avez pas la permission d'accéder à la recherche avancée.");
                    return;
                  }
                  router.push('/sales/deep-search');
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-corp-blue-50/80 hover:bg-corp-blue-100/70 text-corp-blue-900 transition-colors text-xs font-bold text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Search className="h-4 w-4 text-corp-blue-600 shrink-0" />
                  <span className="truncate">Recherche Approfondie pour « <strong className="text-corp-blue-700">{query}</strong> »</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-corp-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>
          )}

          <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 select-none">
            {query.trim() ? 'Raccourcis & Modules' : 'Accès Rapide'}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-0.5 custom-scrollbar py-1">
            {filteredShortcuts.length > 0 ? (
              filteredShortcuts.map((item) => {
                const isPermitted = checkPermission(item);
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left group cursor-pointer",
                      isPermitted
                        ? "hover:bg-slate-100/80 text-slate-700 hover:text-slate-900"
                        : "hover:bg-rose-50/60 text-slate-400 hover:text-rose-700"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isPermitted ? "text-slate-400 group-hover:text-corp-blue-600" : "text-slate-300 group-hover:text-rose-500")} />
                      <span>{item.name}</span>
                    </div>
                    {isPermitted ? (
                      <span className="text-[10px] text-slate-400 font-normal group-hover:text-corp-blue-600">Aller</span>
                    ) : (
                      <span className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Accès restreint
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Aucun module direct pour « {query} ». Appuyez sur Entrée pour lancer une recherche approfondie.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative cursor-pointer hover:bg-corp-blue-50 rounded-xl text-corp-blue-800")}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-timber-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-background ring-1 ring-timber-500/20 animate-pulse">
            {unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 rounded-2xl border-corp-blue-100 shadow-2xl p-0 overflow-hidden font-sans">
        {/* Dynamic Connected Header */}
        <div className="bg-gradient-to-r from-corp-blue-900 to-corp-blue-800 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">Tableau des Alertes</h3>
            <span className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-emerald-450 animate-ping" : "bg-rose-450"
            )} title={isConnected ? "Connecté en temps réel" : "Déconnecté"} />
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 hover:bg-corp-blue-800/60 rounded-lg text-corp-blue-200 transition-[background-color,color] duration-200 ease-out relative before:absolute before:inset-[-8px] before:content-['']"
              title="Rafraîchir"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            </button>
            {systemNotifications.some(n => !n.isRead) && (
              <button 
                onClick={handleMarkAllRead}
                className="text-[10px] uppercase font-bold text-emerald-300 hover:text-white px-2 py-1 rounded hover:bg-corp-blue-800/40 transition-[background-color,color] duration-200 ease-out relative before:absolute before:inset-[-4px] before:content-['']"
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
                        className="h-7 px-2.5 bg-corp-blue-600 hover:bg-corp-blue-800 text-white rounded-lg text-[10px] font-bold gap-1"
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
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-corp-blue-300"
                    )}
                  >
                    <InfoIcon className="h-4 w-4 text-corp-blue-600 shrink-0 mt-0.5" />
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
                        className="absolute right-2 top-2 p-1 text-zinc-400 hover:text-corp-blue-650 opacity-0 group-hover:opacity-100 transition"
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
              <div className="w-10 h-10 rounded-full bg-corp-blue-50 dark:bg-corp-blue-900/10 flex items-center justify-center border border-corp-blue-100 dark:border-corp-blue-900/30">
                <CheckIcon className="h-5 w-5 text-corp-blue-600" />
              </div>
              <div className="text-xs font-medium text-zinc-500 italic">
                Tout est en ordre ! Aucune alerte active.
              </div>
            </div>
          )}

        </div>
        <div className="border-t border-zinc-100 dark:border-zinc-900 p-3 bg-zinc-50/50 dark:bg-zinc-900/20 text-center">
          <span className="text-[10px] font-bold text-corp-blue-750 dark:text-corp-blue-450 uppercase tracking-widest block">
            Flux de notification en temps réel
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

