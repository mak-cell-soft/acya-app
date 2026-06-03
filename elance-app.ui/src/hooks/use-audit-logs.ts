import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/components/audit.service';
import { AuditLogFilters } from '@/types/audit';

/**
 * React Query hook for fetching audit logs.
 * - staleTime: 30s keeps the feed fresh without hammering the API.
 * - refetchInterval: 60s auto-refreshes the feed in the background.
 */
export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit', 'logs', filters],
    queryFn: () => auditService.getRecentLogs(filters),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
