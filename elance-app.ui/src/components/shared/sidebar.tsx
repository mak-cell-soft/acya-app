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
          "fixed inset-0 bg-forest-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-forest-900 text-white w-72 border-r border-forest-800 font-sans transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 pb-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 mb-8 group" onClick={onClose}>
            <div className="relative group-hover:scale-110 transition-transform duration-500">
              <svg className="w-8 h-8" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="18" r="17" stroke="#9FE1CB" strokeWidth="1.5"/>
                <rect x="15.5" y="10" width="5" height="12" rx="2.5" fill="#9FE1CB"/>
                <polygon points="18,6 10,15.5 26,15.5" fill="#9FE1CB"/>
                <rect x="14" y="24" width="8" height="2" rx="1" fill="#1D9E75"/>
                <rect x="11" y="28" width="14" height="2" rx="1" fill="#94A3B8"/>
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
                            ? "bg-forest-600 text-white shadow-lg shadow-forest-950/20" 
                            : "hover:bg-white/5 hover:text-white text-white/60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-white/80")} />
                          {item.name}
                        </div>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-timber-400" />}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        <div className="p-6 mt-auto space-y-4 border-t border-forest-800 bg-forest-900/50 backdrop-blur-sm">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="text-[0.65rem] font-bold text-white/30 uppercase tracking-widest mb-1">Plan Actuel</div>
            <div className="text-xs font-bold text-timber-400">Élancé Entreprise Premium</div>
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
