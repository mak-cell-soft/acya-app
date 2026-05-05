export interface AuditLog {
    id: number;
    userId?: number;
    userName?: string;
    action: string;
    tableName: string;
    timestamp: Date;
    keyValues?: string;
    oldValues?: string;
    newValues?: string;
    changedColumns?: string;
}
