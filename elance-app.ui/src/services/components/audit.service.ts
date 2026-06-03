import api from '@/lib/axios';
import { AuditLog, AuditLogFilters } from '@/types/audit';

/**
 * Dedicated service for the Audit module.
 * Separated from admin-dash.service to maintain single-responsibility.
 */
export const auditService = {
  /**
   * Fetches the most recent audit logs with optional server-side filtering.
   * Maps to GET /api/Audit/recent
   */
  getRecentLogs: async (filters: AuditLogFilters): Promise<AuditLog[]> => {
    const params: Record<string, string | number | undefined> = {
      count: filters.count,
    };

    // Only send defined optional params to keep the URL clean
    if (filters.userName) params.userName = filters.userName;
    if (filters.action)   params.action   = filters.action;
    if (filters.tableName) params.tableName = filters.tableName;
    if (filters.date)     params.date     = filters.date;

    const response = await api.get('/Audit/recent', { params });
    return response.data;
  },
};
