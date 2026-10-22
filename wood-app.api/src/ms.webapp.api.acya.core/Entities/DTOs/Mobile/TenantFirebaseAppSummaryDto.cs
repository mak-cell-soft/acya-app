using System;

namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    /// <summary>
    /// Administrative summary DTO for tenant Firebase Android application dashboard.
    /// Exposes non-sensitive metadata for BackOffice monitoring and build orchestration.
    /// Explicitly excludes raw credentials, service account keys, or google-services.json contents.
    /// </summary>
    public class TenantFirebaseAppSummaryDto
    {
        public string TenantId { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public string PackageName { get; set; } = string.Empty;
        public string FirebaseProjectId { get; set; } = string.Empty;
        public string? FirebaseAppId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string Status { get; set; } = "NotRegistered";
        public bool HasConfiguration { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
