using System;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    /// <summary>
    /// Safe public projection of a mobile release for tenant users.
    /// Internal storage paths are strictly excluded.
    /// </summary>
    public class MobileReleaseDto
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public int BuildNumber { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public long? ArtifactSize { get; set; }
        public string? Sha256 { get; set; }
        public string? ReleaseNotes { get; set; }

        public MobileReleaseDto() { }

        public MobileReleaseDto(MobileBuild build)
        {
            Id = build.Id;
            TenantId = build.TenantId;
            Version = build.Version;
            BuildNumber = build.BuildNumber;
            Status = build.Status;
            CreatedAt = build.CreatedAt;
            CompletedAt = build.CompletedAt;
            ArtifactSize = build.ArtifactSize;
            Sha256 = build.Sha256;
            ReleaseNotes = build.ReleaseNotes;
        }
    }
}
