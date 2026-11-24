using System;

namespace ms.admin.api.acya.core.Entities
{
    /// <summary>
    /// Tracks concurrent authenticated tenant user sessions across the SaaS platform.
    /// Stored in public.bo_tbl_tenant_active_sessions.
    /// </summary>
    public class TenantActiveSession
    {
        public long Id { get; set; }
        public string SessionId { get; set; } = string.Empty;
        public long TenantId { get; set; }
        public string TenantSlug { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }
        public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
        public bool IsRevoked { get; set; } = false;
        public DateTime? RevokedAt { get; set; }

        public MasterEnterprise? Tenant { get; set; }
    }
}
