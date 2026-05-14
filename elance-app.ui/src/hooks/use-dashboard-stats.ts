import { useQuery } from '@tanstack/react-query';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        revenue: '$45,231.89',
        subscriptions: '+2350',
        sales: '+12,234',
        activeNow: '+573',
      };
    },
  });
}
