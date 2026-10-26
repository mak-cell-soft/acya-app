'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { NotificationProvider } from '@/hooks/use-notifications';
import { GlobalTransferConfirmDialog } from '@/components/stock/global-transfer-confirm-dialog';
import { TenantProvider } from '@/components/TenantProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error: any) => {
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            return false;
          }
          return failureCount < 3;
        },
      },
    },
  }));

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      forcedTheme="light"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <TenantProvider>
            {children}
          </TenantProvider>
          <GlobalTransferConfirmDialog />
        </NotificationProvider>
        <ReactQueryDevtools initialIsOpen={true} />
      </QueryClientProvider>
    </NextThemesProvider>
  );
}

