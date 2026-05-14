'use client';

import { Bell, Search, User, Settings, LogOut, CreditCard, Menu } from 'lucide-react';
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

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 border-b border-forest-100 bg-sand-50/80 flex items-center justify-between px-6 sticky top-0 z-10 backdrop-blur-md font-sans">
      <div className="flex items-center gap-4 flex-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden h-10 w-10 rounded-xl text-forest-800"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-sand-400" />
          <Input
            type="search"
            placeholder="Rechercher..."
            className="pl-10 bg-white/50 border-forest-100 h-10 w-full rounded-xl focus:border-forest-600 focus:ring-forest-600 transition-all shadow-sm"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative cursor-pointer hover:bg-forest-50 rounded-xl text-forest-800")}>
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-timber-400 rounded-full border-2 border-sand-50" />
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
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2 px-2 hover:bg-forest-50 rounded-xl cursor-pointer")}>
            <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center border border-forest-200">
              <User className="h-4 w-4 text-forest-600" />
            </div>
            <span className="hidden md:inline-block font-bold text-sm text-forest-800">{user?.name || 'Utilisateur'}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-2xl border-forest-100 shadow-xl p-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-heading px-3 py-2 text-forest-900">Mon Compte</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-forest-100" />
              <DropdownMenuItem className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-forest-50 transition-colors font-bold text-sm text-forest-700">
                <User className="h-4 w-4 text-forest-400" /> Profil
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuItem className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-forest-50 transition-colors font-bold text-sm text-forest-700">
              <CreditCard className="h-4 w-4 text-forest-400" /> Facturation
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-forest-50 transition-colors font-bold text-sm text-forest-700">
              <Settings className="h-4 w-4 text-forest-400" /> Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-forest-100" />
            <DropdownMenuItem className="text-rose-500 gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-rose-50 transition-colors font-bold text-sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
