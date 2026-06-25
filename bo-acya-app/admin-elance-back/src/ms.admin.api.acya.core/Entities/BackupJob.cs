using System;

namespace ms.admin.api.acya.core.Entities
{
    public class BackupJob
    {
        public long Id { get; set; }
        public long TenantId { get; set; }
        public string Type { get; set; } = string.Empty; // "Backup" or "Restore"
        public string Status { get; set; } = string.Empty; // "Pending", "Running", "Completed", "Failed"
        public string FilePath { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? ErrorMessage { get; set; }

        public MasterEnterprise? Tenant { get; set; }
    }
}
