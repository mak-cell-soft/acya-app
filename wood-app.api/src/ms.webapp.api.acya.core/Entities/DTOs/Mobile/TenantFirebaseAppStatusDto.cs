using System;

namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    /// <summary>
    /// Administrative status DTO for tenant Firebase Android application registration.
    /// Exposes non-sensitive metadata for BackOffice monitoring and build orchestration.
    /// Never includes raw credentials, service account keys, or google-services.json contents.
    /// </summary>
    public class TenantFirebaseAppStatusDto
    {
        public string TenantId { get; set; } = string.Empty;
        public string FirebaseProjectId { get; set; } = string.Empty;
        public string? FirebaseAppId { get; set; }
        public string PackageName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        public bool HasConfiguration { get; set; }
        public string? Sha1Fingerprint { get; set; }
        public string? Sha256Fingerprint { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
