'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const routeMap: Record<string, string> = {
  dashboard: 'Tableau de bord',
  analytics: 'Analyses',
  articles: 'Articles & M³',
  sales: 'Ventes',
  purchases: 'Achats',
  stock: 'Stock & Dépôts',
  customers: 'Clients',
  providers: 'Fournisseurs',
  chantiers: 'Chantiers',
  vehicles: 'Véhicules',
  team: 'Équipe & RH',
  settings: 'Paramètres',
  new: 'Nouveau',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-sand-400 mb-6">
      <Link 
        href="/dashboard" 
        className="flex items-center gap-1.5 hover:text-forest-600 transition-colors"
      >
        <Home className="w-3 h-3" />
        Élancé
      </Link>
      
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const label = routeMap[segment.toLowerCase()] || segment;

        // Skip 'dashboard' if it's the first segment and not the last (redundant with Home)
        if (segment === 'dashboard' && segments.length > 1 && index === 0) return null;

        return (
          <React.Fragment key={href}>
            <ChevronRight className="w-3 h-3 text-forest-100" />
            {isLast ? (
              <span className="text-forest-900">{label}</span>
            ) : (
              <Link 
                href={href} 
                className="hover:text-forest-600 transition-colors"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

