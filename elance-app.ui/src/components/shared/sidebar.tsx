'use client';

import { usePathname } from 'next/navigation';
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

  const handleLogout = () => {
    logout();
    router.push('/login');
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
        "fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-corp-navy text-white w-72 border-r border-corp-blue-900/50 font-sans transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 pb-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 mb-8 group" onClick={onClose}>
            <div className="relative group-hover:scale-110 transition-transform duration-500">
              <svg className="w-8.5 h-8.5 md:w-9.5 md:h-9.5 transition-transform duration-700 group-hover:rotate-[360deg]" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <span className="text-2xl font-bold font-heading text-white tracking-tight">Élancé</span>
          </Link>

          <button 
            className="lg:hidden p-2 text-white/50 hover:text-white mb-8"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
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
                <h3 className="text-[0.65rem] font-bold text-white/30 uppercase tracking-[0.2em] mb-4 px-4">
                  {group.title}
                </h3>
                <nav className="space-y-1">
                  {filteredItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all group",
                          isActive 
                            ? "bg-corp-blue-600 text-white shadow-lg shadow-corp-blue-900/20" 
                            : "hover:bg-white/5 hover:text-white text-white/60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-white/80")} />
                          {item.name}
                        </div>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-corp-cyan" />}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        <div className="p-6 mt-auto space-y-4 border-t border-corp-blue-900/50 bg-corp-navy/50 backdrop-blur-sm">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="text-[0.65rem] font-bold text-white/30 uppercase tracking-widest mb-1">Plan Actuel</div>
            <div className="text-xs font-bold text-corp-cyan">Élancé Entreprise Premium</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-white/50 hover:bg-rose-500/10 hover:text-rose-400 transition-all w-full group"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            Déconnexion
          </button>
        </div>
      </div>
    </>
  );
}
