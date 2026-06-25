'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/axios';
import { useTenantStore } from '@/store/use-tenant-store';
import { Loader2 } from 'lucide-react';

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setBranding = useTenantStore((state: any) => state.setBranding);
  const status = useTenantStore((state: any) => state.status);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await api.get('/Enterprise/config');
        const config = response.data;

        setBranding({
          name: config.name || 'Élancé',
          logoUrl: config.logoUrl,
          faviconUrl: config.faviconUrl,
          primaryColor: config.primaryColor,
          language: config.language,
          currency: config.currency,
          status: config.status,
        });

        // 1. Inject Favicon dynamically
        if (config.faviconUrl) {
          let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = config.faviconUrl;
        }

        // 2. Inject primary color style variables
        if (config.primaryColor) {
          document.documentElement.style.setProperty('--primary', config.primaryColor);
          document.documentElement.style.setProperty('--corp-blue-600', config.primaryColor);
          // Generically set other variants if needed
          document.documentElement.style.setProperty('--color-corp-blue-600', config.primaryColor);
        }

        // 3. Handle suspension / expiration routing
        const isSuspendedOrExpired =
          config.status === 'Suspended' || config.status === 'Expired';

        if (isSuspendedOrExpired) {
          if (pathname !== '/suspended' && pathname !== '/login') {
            router.push('/suspended');
          }
        } else {
          if (pathname === '/suspended') {
            router.push('/login');
          }
        }
      } catch (error: any) {
        const httpStatus = error?.response?.status;
        if (httpStatus === 404) {
          // Tenant has been deleted or was never registered — show dedicated page
          if (pathname !== '/tenant-not-found') {
            router.push('/tenant-not-found');
          }
        } else {
          console.error('Failed to load tenant configuration:', error);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, [pathname, router, setBranding]);

  // Prevent accessing other pages if suspended/expired
  useEffect(() => {
    const isSuspendedOrExpired = status === 'Suspended' || status === 'Expired';
    if (isSuspendedOrExpired && pathname !== '/suspended' && pathname !== '/login') {
      router.push('/suspended');
    }
  }, [status, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-corp-blue-600" />
          <p className="text-sm text-muted-foreground">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
