/**
 * Mirrors the AuditLog C# entity (core/Entities/AuditLog.cs).
 * All JSON-blob fields arrive as raw strings and must be parsed before use.
 */
export interface AuditLog {
  id: number;
  userId?: number;
  userName?: string;
  /** The EF Core interceptor records 'Insert', 'Update', or 'Delete' */
  action: 'Insert' | 'Update' | 'Delete';
  tableName: string;
  timestamp: string; // ISO 8601 UTC string
  keyValues?: string;      // JSON — e.g. { "Id": 42 }
  oldValues?: string;      // JSON — previous field values (Update / Delete)
  newValues?: string;      // JSON — new field values (Insert / Update)
  changedColumns?: string; // JSON array — list of modified column names
}

/** Filters passed to GET /api/Audit/recent */
export interface AuditLogFilters {
  page: number;
  pageSize: number;
  userName?: string;
  action?: 'Insert' | 'Update' | 'Delete';
  tableName?: string;
  date?: string; // ISO date string for day-boundary filter
}

export interface AuditLogResponse {
  items: AuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
}
