'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { Breadcrumbs } from './breadcrumbs';
import { useAuthStore } from '@/store/use-auth-store';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      const timer = setTimeout(() => {
        const currentPath = typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '';
        if (currentPath && currentPath.startsWith('/') && !currentPath.startsWith('//') && !currentPath.startsWith('/login')) {
          try {
            sessionStorage.setItem('acya_auth_redirect', currentPath);
          } catch {}
          router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
        } else {
          router.replace('/login');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, router, mounted]);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-sand-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corp-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

