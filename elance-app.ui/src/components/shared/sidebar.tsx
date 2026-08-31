'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  LogOut,
  ChevronRight,
  Package,
  ShoppingBag,
  ShoppingCart,
  Warehouse,
  Truck,
  Car,
  UserCheck,
  ClipboardList,
  X,
  Calculator,
  Landmark,
  HelpCircle,
  ArrowLeftRight,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/store/use-auth-store';
import { useRouter } from 'next/navigation';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { PermissionModuleKey } from '@/types/permissions';
import { SupportDialog } from './support-dialog';
import { useTenantStore } from '@/store/use-tenant-store';

type NavItem = {
  name: string;
  href: string;
  icon: any;
  module?: PermissionModuleKey;
  exact?: boolean;
  adminOnly?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

// ── MENUS POUR SITE DE VENTE (isForSale = true) ──────────────────────────────
// NOTE: Caisse, Ventes, Clients, Règlements, Analyses — tout ce qui est
//       orienté transaction client et gestion de point de vente.
const saleNavGroups: NavGroup[] = [
  {
    title: 'Général',
    items: [
      { name: 'Analyses', href: '/analytics', icon: BarChart3, module: 'analytics' },
      { name: 'Pré-Analyse Comptable', href: '/accounting', icon: Calculator, module: 'accounting', exact: true },
      { name: 'Trésorerie & Banques', href: '/accounting/treasury', icon: Landmark, module: 'accounting', adminOnly: true },
      { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Gestion Commerciale',
    items: [
      { name: 'Articles', href: '/articles', icon: Package, module: 'articles' },
      { name: 'Ventes', href: '/sales', icon: ShoppingBag, module: 'sales' },
      { name: 'Achats', href: '/purchases', icon: ShoppingCart, module: 'purchases' },
      { name: 'Stock & Dépôts', href: '/stock', icon: Warehouse, module: 'stock' },
    ],
  },
  {
    title: 'Partenaires',
    items: [
      { name: 'Clients', href: '/customers', icon: Users, module: 'customers' },
      { name: 'Fournisseurs', href: '/suppliers', icon: Truck, module: 'providers' },
    ],
  },
  {
    title: 'Opérations',
    items: [
      { name: 'Chantiers', href: '/chantiers', icon: ClipboardList },
      { name: 'Véhicules', href: '/vehicles', icon: Car, module: 'vehicles' },
      { name: 'Équipe & RH', href: '/team', icon: UserCheck, module: 'hr' },
    ],
  },
  {
    title: 'Système',
    items: [
      { name: 'Paramètres', href: '/settings', icon: Settings, module: 'configuration' },
      { name: 'Aide & Support', href: '/contact', icon: HelpCircle },
    ],
  },
];

// ── MENUS POUR SITE DÉPÔT (isForSale = false) ────────────────────────────────
// NOTE: Pas de Ventes ni de Caisse — focus sur le stock physique, les réceptions
//       d'achats, les transferts entre dépôts et les fournisseurs.
const depotNavGroups: NavGroup[] = [
  {
    title: 'Général',
    items: [
      { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Gestion Stock',
    items: [
      { name: 'Articles & M³', href: '/articles', icon: Package, module: 'articles' },
      { name: 'Stock & Dépôts', href: '/stock', icon: Warehouse, module: 'stock' },
      { name: 'Transferts', href: '/stock/transfer/new', icon: ArrowLeftRight, module: 'stock' },
      { name: 'Achats', href: '/purchases', icon: ShoppingCart, module: 'purchases' },
    ],
  },
  {
    title: 'Partenaires',
    items: [
      { name: 'Fournisseurs', href: '/suppliers', icon: Truck, module: 'providers' },
    ],
  },
  {
    title: 'Opérations',
    items: [
      { name: 'Chantiers', href: '/chantiers', icon: ClipboardList },
      { name: 'Véhicules', href: '/vehicles', icon: Car, module: 'vehicles' },
      { name: 'Équipe & RH', href: '/team', icon: UserCheck, module: 'hr' },
    ],
  },
  {
    title: 'Système',
    items: [
      { name: 'Paramètres', href: '/settings', icon: Settings, module: 'configuration' },
      { name: 'Aide & Support', href: '/contact', icon: HelpCircle },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { hasAnyPermission } = usePermissionGuard();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { logoUrl, primaryColor, secondaryColor } = useTenantStore();

  // Restore state on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed) setIsCollapsed(savedCollapsed === 'true');

    if (scrollRef.current) {
      const savedScroll = sessionStorage.getItem('sidebar-scroll');
      if (savedScroll) {
        scrollRef.current.scrollTop = parseInt(savedScroll, 10);
      }
    }
  }, []);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  // WHY: defaultSiteIsForSale defaults to true when undefined so existing
  //      sale-site sessions (before re-login) keep seeing the sale menus.
  const isDepot = user?.defaultSiteIsForSale === false;

  // Choose the correct nav group set based on site type
  const baseNavGroups = isDepot ? depotNavGroups : saleNavGroups;

  // Filter out Chantiers if the enterprise doesn't manage constructions
  const showChantiers = user?.isManagingConstructions === true;
  const navGroups = baseNavGroups.map(group => ({
    ...group,
    items: group.items.filter(item => item.name !== 'Chantiers' || showChantiers)
  }));

  const handleLogout = () => {
    logout();
    router.push('/');
    if (isOpen) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 lg:hidden transition-opacity duration-300 ease-out',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar panel — premium glassmorphism background & subtle border shadow */}
      <div
        style={secondaryColor ? { backgroundColor: secondaryColor, backgroundImage: 'none' } : undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col h-full text-slate-800 border-r font-sans transition-[width,transform] duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-[4px_0_28px_-4px_rgba(0,0,0,0.05)] selection:bg-corp-blue-500/15',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-[88px]' : 'w-72',
          !secondaryColor && (isDepot
            ? 'bg-gradient-to-b from-[#FFFDF7] via-[#FFF9ED] to-[#FFF6E5] border-amber-200/60'
            : 'bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#F1F5F9] border-slate-200/70')
        )}
      >
        {/* Collapse toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          className={cn(
            'absolute -right-3.5 top-7 w-7 h-7 bg-white border rounded-full flex items-center justify-center shadow-md z-50 hidden lg:flex cursor-pointer hover:bg-slate-50 active:scale-[0.96] transition-[background-color,color,border-color,transform,box-shadow] duration-200 ease-out before:absolute before:inset-[-8px] before:content-[""]',
            isDepot
              ? 'border-amber-200/90 text-amber-600 hover:text-amber-700 hover:border-amber-300'
              : 'border-slate-200 text-slate-600 hover:text-corp-blue-600 hover:border-corp-blue-200'
          )}
        >
          <ChevronRight
            className={cn('w-4 h-4 transition-transform duration-300 ease-out', isCollapsed ? '' : 'rotate-180')}
          />
        </button>

        {/* ── LOGO & SITE BADGE ── */}
        <div
          className={cn(
            'p-5 pb-5 mb-2 border-b flex items-center justify-between transition-padding duration-300',
            isCollapsed ? 'px-3 justify-center' : '',
            isDepot ? 'border-amber-200/50' : 'border-slate-200/60'
          )}
        >
          <AlertDialog>
            <AlertDialogTrigger
              className={cn(
                'flex items-center group text-left outline-none w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-corp-blue-500 rounded-xl p-1 transition-[background-color,transform] duration-200 ease-out active:scale-[0.98]',
                isCollapsed ? 'justify-center' : (logoUrl ? 'justify-center' : 'gap-3.5')
              )}
            >
              {logoUrl ? (
                <div className="relative group-hover:scale-[1.03] transition-transform duration-300 w-full flex justify-center">
                  <img
                    src={logoUrl}
                    alt={user?.enterpriseName || "Logo"}
                    className={cn(
                      'object-contain rounded-xl transition-[transform,opacity,box-shadow] duration-200 ease-out outline outline-1 outline-black/10 dark:outline-white/10 shadow-sm',
                      isCollapsed 
                        ? 'w-10 h-10 md:w-11 md:h-11' 
                        : 'max-h-14 max-w-full'
                    )}
                  />
                </div>
              ) : (
                <>
                  {/* Logo hexagon cluster */}
                  <div className="relative group-hover:scale-105 transition-transform duration-300 shrink-0">
                    <svg
                      className="w-10 h-10 md:w-11 md:h-11 transition-transform duration-500 group-hover:rotate-3"
                      viewBox="0 0 40 40"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        {isDepot ? (
                          <>
                            <linearGradient id="logo_grad_1" x1="0" y1="0" x2="40" y2="40">
                              <stop offset="0%" stopColor="#FBBF24" />
                              <stop offset="100%" stopColor="#F59E0B" />
                            </linearGradient>
                            <linearGradient id="logo_grad_2" x1="0" y1="0" x2="40" y2="40">
                              <stop offset="0%" stopColor="#F59E0B" />
                              <stop offset="100%" stopColor="#D97706" />
                            </linearGradient>
                            <linearGradient id="logo_grad_3" x1="0" y1="0" x2="40" y2="40">
                              <stop offset="0%" stopColor="#D97706" />
                              <stop offset="100%" stopColor="#B45309" />
                            </linearGradient>
                          </>
                        ) : (
                          <>
                            <linearGradient id="logo_grad_1" x1="0" y1="0" x2="40" y2="40">
                              <stop offset="0%" stopColor="#60A5FA" />
                              <stop offset="100%" stopColor="#3B82F6" />
                            </linearGradient>
                            <linearGradient id="logo_grad_2" x1="0" y1="0" x2="40" y2="40">
                              <stop offset="0%" stopColor="#3B82F6" />
                              <stop offset="100%" stopColor="#2563EB" />
                            </linearGradient>
                            <linearGradient id="logo_grad_3" x1="0" y1="0" x2="40" y2="40">
                              <stop offset="0%" stopColor="#2563EB" />
                              <stop offset="100%" stopColor="#1D4ED8" />
                            </linearGradient>
                          </>
                        )}
                      </defs>
                      <path d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z" fill="url(#logo_grad_1)" />
                      <path d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z" fill="url(#logo_grad_2)" />
                      <path d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z" fill="url(#logo_grad_3)" />
                    </svg>
                  </div>

                  {!isCollapsed && (
                    <div className="flex flex-col items-start justify-center gap-1 overflow-hidden">
                      <span className="text-[1.5rem] font-black text-slate-900 tracking-tight leading-none truncate w-full">
                        Élancé
                      </span>
                      <div
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border transition-colors shadow-2xs whitespace-nowrap',
                          isDepot
                            ? 'bg-amber-100/70 border-amber-200/80 group-hover:bg-amber-200/70'
                            : 'bg-slate-100 border-slate-200/80 group-hover:bg-slate-200/60'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0 animate-pulse',
                            isDepot ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]' : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                          )}
                        />
                        <span
                          className={cn(
                            'text-[0.625rem] font-bold uppercase tracking-[0.14em] leading-tight truncate max-w-[130px]',
                            isDepot ? 'text-amber-800' : 'text-slate-700'
                          )}
                        >
                          {user?.enterpriseName || 'Entreprise'}
                        </span>
                      </div>

                      {isDepot && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[0.55rem] font-extrabold uppercase tracking-widest shadow-2xs">
                          <Warehouse className="w-2.5 h-2.5" />
                          Dépôt
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </AlertDialogTrigger>

            {/* Logout confirmation dialog */}
            <AlertDialogContent className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 shadow-[0_32px_96px_-16px_rgba(15,23,42,0.18)] rounded-3xl p-6 sm:p-8 max-w-[560px]">
              <AlertDialogHeader className="space-y-4">
                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-2 shadow-inner border border-rose-100">
                  <LogOut className="w-7 h-7 text-rose-500" />
                </div>
                <AlertDialogTitle className="text-2xl font-black text-slate-900 text-left tracking-tight">
                  Quitter l'application ?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[1.025rem] text-slate-600 font-medium leading-relaxed text-left">
                  Êtes-vous sûr de vouloir vous déconnecter de{' '}
                  <span className="font-bold text-corp-blue-700">Élancé</span> ? Vous devrez vous
                  reconnecter pour accéder à votre espace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-8 sm:space-x-4">
                <AlertDialogCancel className="h-11 px-6 rounded-xl border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 text-sm font-bold transition-[border-color,background-color,transform,box-shadow] duration-200 ease-out shadow-sm active:scale-[0.96]">
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  className="h-11 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-sm transition-[background-color,transform,box-shadow] duration-200 ease-out shadow-md shadow-rose-500/25 active:scale-[0.96] border-0"
                >
                  Se déconnecter
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <button
            className="lg:hidden p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-lg active:scale-[0.96]"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── NAV GROUPS ── */}
        <div
          ref={scrollRef}
          onScroll={(e) => {
            sessionStorage.setItem('sidebar-scroll', e.currentTarget.scrollTop.toString());
          }}
          className={cn('flex-1 overflow-y-auto py-3 custom-scrollbar space-y-6', isCollapsed ? 'px-2.5' : 'px-4')}
        >
          {navGroups.map((group) => {
            const filteredItems = group.items.filter((item) => {
              if (item.adminOnly && !isAdmin) return false;
              if (item.module) return hasAnyPermission(item.module);
              return true;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                {!isCollapsed ? (
                  <h3
                    className={cn(
                      'text-[0.625rem] font-extrabold uppercase tracking-[0.18em] mb-2 px-3 whitespace-nowrap overflow-hidden select-none',
                      isDepot ? 'text-amber-700/70' : 'text-slate-400'
                    )}
                  >
                    {group.title}
                  </h3>
                ) : (
                  <div className="h-1" />
                )}
                <nav className="space-y-1">
                  {filteredItems.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + '/');

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={(e) => {
                          if (item.href === '/contact') {
                            e.preventDefault();
                            setIsSupportOpen(true);
                          } else {
                            onClose();
                          }
                        }}
                        title={isCollapsed ? item.name : undefined}
                        style={isActive && primaryColor ? { backgroundColor: `${primaryColor}18`, color: primaryColor, borderColor: `${primaryColor}30` } : undefined}
                        className={cn(
                          'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-[background-color,color,border-color,transform,box-shadow] duration-200 ease-out active:scale-[0.96] group outline-none focus-visible:ring-2 focus-visible:ring-corp-blue-500 border border-transparent',
                          isActive
                            ? primaryColor
                              ? 'font-bold border'
                              : isDepot
                                ? 'bg-amber-500/15 text-amber-900 font-bold border-amber-300/60 shadow-2xs'
                                : 'bg-corp-blue-600/10 text-corp-blue-700 font-bold border-corp-blue-500/20 shadow-2xs'
                            : isDepot
                              ? 'hover:bg-amber-100/50 hover:text-amber-900 text-slate-600'
                              : 'hover:bg-slate-200/60 hover:text-slate-900 text-slate-600',
                          isCollapsed ? 'justify-center px-0 h-9.5 w-full' : 'justify-start gap-2.5'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105',
                            isActive
                              ? isDepot
                                ? 'text-amber-700'
                                : 'text-corp-blue-600'
                              : isDepot
                                ? (primaryColor ? 'group-hover:text-[var(--primary)] text-slate-500' : 'group-hover:text-amber-700 text-slate-500')
                                : (primaryColor ? 'group-hover:text-[var(--primary)] text-slate-500' : 'group-hover:text-corp-blue-600 text-slate-500')
                          )}
                        />
                        {!isCollapsed && (
                          <span className="whitespace-nowrap overflow-hidden text-[0.85rem] tracking-tight">{item.name}</span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* ── FOOTER: PLAN + LOGOUT ── */}
        <div
          className={cn(
            'mt-auto space-y-3 border-t bg-white/50 backdrop-blur-md',
            isCollapsed ? 'p-2.5' : 'p-4',
            isDepot ? 'border-amber-200/50' : 'border-slate-200/60'
          )}
        >
          {!isCollapsed && (
            <div
              className={cn(
                'rounded-xl p-3 border shadow-2xs overflow-hidden whitespace-nowrap transition-colors duration-200',
                isDepot
                  ? 'bg-amber-100/50 border-amber-200/60'
                  : 'bg-slate-100/70 border-slate-200/70'
              )}
            >
              <div className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                Plan Actuel
              </div>
              <div
                className={cn(
                  'text-xs font-black tracking-tight',
                  isDepot ? 'text-amber-800' : 'text-slate-800'
                )}
              >
                Élancé Entreprise Premium
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Déconnexion' : undefined}
            className={cn(
              'flex items-center py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-[background-color,color,transform,box-shadow] duration-200 ease-out active:scale-[0.96] w-full group outline-none focus-visible:ring-2 focus-visible:ring-rose-500',
              isCollapsed ? 'justify-center' : 'gap-2.5 px-3.5'
            )}
          >
            <LogOut className="w-4.5 h-4.5 transition-transform group-hover:-translate-x-0.5 shrink-0" />
            {!isCollapsed && (
              <span className="whitespace-nowrap overflow-hidden">Déconnexion</span>
            )}
          </button>
        </div>
      </div>
      <SupportDialog isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </>
  );
}
