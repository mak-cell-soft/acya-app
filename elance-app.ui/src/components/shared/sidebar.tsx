'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  Calculator
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

type NavItem = {
  name: string;
  href: string;
  icon: any;
  module?: PermissionModuleKey;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  { 
    title: 'Général', 
    items: [
      { name: 'Analyses', href: '/analytics', icon: BarChart3, module: 'analytics' },
      { name: 'Pré-Analyse Comptable', href: '/accounting', icon: Calculator, module: 'accounting' },
      { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  { 
    title: 'Gestion Bois', 
    items: [
      { name: 'Articles & M³', href: '/articles', icon: Package, module: 'articles' },
      { name: 'Ventes', href: '/sales', icon: ShoppingBag, module: 'sales' },
      { name: 'Achats', href: '/purchases', icon: ShoppingCart, module: 'purchases' },
      { name: 'Stock & Dépôts', href: '/stock', icon: Warehouse, module: 'stock' },
    ]
  },
  { 
    title: 'Partenaires', 
    items: [
      { name: 'Clients', href: '/customers', icon: Users, module: 'customers' },
      { name: 'Fournisseurs', href: '/suppliers', icon: Truck, module: 'providers' },
    ]
  },
  { 
    title: 'Opérations', 
    items: [
      { name: 'Chantiers', href: '/chantiers', icon: ClipboardList },
      { name: 'Véhicules', href: '/vehicles', icon: Car, module: 'vehicles' },
      { name: 'Équipe & RH', href: '/team', icon: UserCheck, module: 'hr' },
    ]
  },
  { 
    title: 'Système', 
    items: [
      { name: 'Paramètres', href: '/settings', icon: Settings, module: 'configuration' },
    ]
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const { hasAnyPermission } = usePermissionGuard();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
          "fixed inset-0 bg-corp-navy/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-gradient-to-br from-corp-blue-50 via-[#EBF1FA] to-[#F8FAFF] text-slate-800 border-r border-corp-blue-100/80 font-sans transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-[4px_0_24px_rgba(37,99,235,0.03)]",
        isOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-[90px]" : "w-72"
      )}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 w-6 h-6 bg-white border border-corp-blue-200 text-corp-blue-600 rounded-full flex items-center justify-center hover:bg-corp-blue-50 shadow-sm z-50 hidden lg:flex cursor-pointer"
        >
          <ChevronRight className={cn("w-4 h-4 transition-transform duration-300", isCollapsed ? "" : "rotate-180")} />
        </button>

        <div className={cn("p-6 pb-6 mb-6 border-b border-corp-blue-100/80 flex items-start justify-between", isCollapsed ? "px-3" : "")}>
          <AlertDialog>
            <AlertDialogTrigger 
              className={cn("flex items-center group text-left outline-none w-full", isCollapsed ? "justify-center" : "gap-4")}
            >
              <div className="relative group-hover:scale-110 transition-transform duration-500 shrink-0">
                <svg className="w-10 h-10 md:w-11 md:h-11 transition-transform duration-700 group-hover:rotate-[360deg]" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="40" height="40" rx="10" fill="url(#logo_bg_grad)" className="opacity-10 group-hover:opacity-15 transition-opacity" />
                  <path d="M20 3L35 11.5V28.5L20 37L5 28.5V11.5L20 3" stroke="url(#logo_stroke_grad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 9L31 17.25L27 20.25L20 15L13 20.25L9 17.25L20 9Z" fill="url(#logo_stroke_grad)"/>
                  <rect x="17.5" y="18" width="5" height="11" rx="1.5" fill="url(#logo_stroke_grad)" />
                  <path d="M12 25H28" stroke="url(#logo_stroke_grad)" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M14 29H26" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="logo_bg_grad" x1="0" y1="0" x2="40" y2="40">
                      <stop offset="0%" stopColor="#2563EB"/>
                      <stop offset="100%" stopColor="#06B6D4"/>
                    </linearGradient>
                    <linearGradient id="logo_stroke_grad" x1="0" y1="0" x2="40" y2="40">
                      <stop offset="0%" stopColor="#3B82F6"/>
                      <stop offset="60%" stopColor="#2563EB"/>
                      <stop offset="100%" stopColor="#06B6D4"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col items-start justify-center gap-1.5 overflow-hidden">
                  <span className="text-[1.65rem] font-extrabold font-heading text-slate-900 tracking-tight leading-none mt-0.5 truncate w-full">Élancé</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-corp-blue-100/50 border border-corp-blue-200/60 group-hover:bg-corp-blue-200/50 transition-colors shadow-sm whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] animate-pulse shrink-0" />
                    <span className="text-[0.6rem] font-extrabold text-corp-blue-800 uppercase tracking-[0.15em] leading-none">SOCOFEB</span>
                  </div>
                </div>
              )}
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_30px_100px_-20px_rgba(3,10,28,0.1)] rounded-3xl p-6 sm:p-8 max-w-[600px]">
              <AlertDialogHeader className="space-y-4">
                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-2 shadow-inner border border-rose-100">
                  <LogOut className="w-7 h-7 text-rose-500" />
                </div>
                <AlertDialogTitle className="font-heading text-2xl font-extrabold text-slate-900 text-left">
                  Quitter l'application ?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[1.05rem] text-slate-600 font-medium leading-relaxed text-left">
                  Êtes-vous sûr de vouloir vous déconnecter de <span className="font-bold text-corp-blue-700">Élancé</span> ? Vous devrez vous reconnecter pour accéder à votre espace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-8 sm:space-x-4">
                <AlertDialogCancel className="h-12 px-6 rounded-xl border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 text-[0.95rem] font-bold transition-all duration-300 shadow-sm hover:scale-[1.02] active:scale-[0.98]">
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="h-12 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-[0.95rem] transition-all duration-300 shadow-lg shadow-rose-500/20 hover:scale-[1.03] active:scale-[0.97] border-0">
                  Se déconnecter
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-slate-700 transition-colors"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className={cn("flex-1 overflow-y-auto py-4 custom-scrollbar", isCollapsed ? "px-3" : "px-6")}>
          {navGroups.map((group) => {
            // Filter items based on permissions
            const filteredItems = group.items.filter((item) => {
              if (item.module) {
                return hasAnyPermission(item.module);
              }
              return true; // Items without a module are always visible
            });

            // Hide the group entirely if no items are left
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title} className="mb-8">
                {!isCollapsed ? (
                  <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 px-4 whitespace-nowrap overflow-hidden">
                    {group.title}
                  </h3>
                ) : (
                  <div className="h-2" />
                )}
                <nav className="space-y-1">
                  {filteredItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={onClose}
                        title={isCollapsed ? item.name : undefined}
                        className={cn(
                          "flex items-center px-4 py-2.5 rounded-xl text-sm font-bold transition-all group",
                          isActive 
                            ? "bg-corp-blue-600 text-white shadow-md shadow-corp-blue-600/20" 
                            : "hover:bg-corp-blue-50 hover:text-corp-blue-700 text-slate-500",
                          isCollapsed ? "justify-center px-0" : "justify-between"
                        )}
                      >
                        <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "")}>
                          <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "group-hover:text-corp-blue-600 transition-colors")} />
                          {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.name}</span>}
                        </div>
                        {isActive && !isCollapsed && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] shrink-0" />}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        <div className={cn("mt-auto space-y-4 border-t border-corp-blue-100/60 bg-white/40 backdrop-blur-sm", isCollapsed ? "p-3" : "p-6")}>
          {!isCollapsed && (
            <div className="bg-corp-blue-50/80 rounded-2xl p-4 border border-corp-blue-100/50 shadow-sm overflow-hidden whitespace-nowrap">
              <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">Plan Actuel</div>
              <div className="text-xs font-extrabold text-corp-blue-700">Élancé Entreprise Premium</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Déconnexion" : undefined}
            className={cn(
              "flex items-center py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all w-full group",
              isCollapsed ? "justify-center" : "gap-3 px-4"
            )}
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">Déconnexion</span>}
          </button>
        </div>
      </div>
    </>
  );
}

