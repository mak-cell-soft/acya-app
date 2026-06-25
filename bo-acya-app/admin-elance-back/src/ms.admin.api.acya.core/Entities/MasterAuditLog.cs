using System;

namespace ms.admin.api.acya.core.Entities
{
    public class MasterAuditLog
    {
        public long Id { get; set; }
        public long? TenantId { get; set; }
        public string Action { get; set; } = string.Empty; // e.g. "Tenant Created", "Suspended", "Billing Generated"
        public string? Details { get; set; }
        public string PerformedBy { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }

        public MasterEnterprise? Tenant { get; set; }
    }
}
