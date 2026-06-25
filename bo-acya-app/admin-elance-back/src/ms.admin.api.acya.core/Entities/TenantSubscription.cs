using ms.admin.api.acya.common.Enums;
using System;

namespace ms.admin.api.acya.core.Entities
{
    public class TenantSubscription
    {
        public long Id { get; set; }
        public long TenantId { get; set; }
        public TenantPlan Plan { get; set; }
        public string Status { get; set; } = string.Empty; // e.g. "Active", "Expired"
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Price { get; set; }
        public DateTime CreatedAt { get; set; }

        public MasterEnterprise? Tenant { get; set; }
    }
}
