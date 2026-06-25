using ms.admin.api.acya.common.Enums;
using System;

namespace ms.admin.api.acya.core.Entities
{
    public class MasterEnterprise
    {
        public long Id { get; set; }
        public string Slug { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string SchemaName { get; set; } = string.Empty;
        public string ConnectionString { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public TenantPlan Plan { get; set; }
        public TenantStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ActivatedAt { get; set; }
        public string? Notes { get; set; }
        public string? LogoUrl { get; set; }
        public string? FaviconUrl { get; set; }
        public string? PrimaryColor { get; set; }
        public string? CustomDomain { get; set; }
        public string? Language { get; set; }
        public string? Currency { get; set; }
        public bool CustomDomainConfigured { get; set; }
    }
}
