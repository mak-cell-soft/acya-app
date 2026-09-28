using System;
using System.IO;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    /// <summary>
    /// Safe public projection of a mobile release for tenant users and admin management.
    /// Internal storage paths are strictly excluded.
    /// </summary>
    public class MobileReleaseDto
    {
        public int Id { get; set; }
        public int MobileBuildId { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public int BuildNumber { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsCurrent { get; set; }
        public DateTime PublishedAt { get; set; }
        public string? PublishedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? ArtifactFileName { get; set; }
        public long? ArtifactSize { get; set; }
        public string? Sha256 { get; set; }
        public string? ReleaseNotes { get; set; }
        public string? Environment { get; set; } = "production";

        public MobileReleaseDto() { }

        public MobileReleaseDto(MobileRelease release)
        {
            Id = release.Id;
            MobileBuildId = release.MobileBuildId;
            TenantId = release.TenantId;
            Version = release.Version;
            BuildNumber = release.BuildNumber;
            Status = release.Status;
            IsCurrent = release.IsCurrent;
            PublishedAt = release.PublishedAt;
            PublishedBy = release.PublishedBy;
            CreatedAt = release.CreatedAt;
            ReleaseNotes = release.ReleaseNotes ?? release.MobileBuild?.ReleaseNotes;

            if (release.MobileBuild != null)
            {
                CompletedAt = release.MobileBuild.CompletedAt;
                ArtifactSize = release.MobileBuild.ArtifactSize;
                Sha256 = release.MobileBuild.Sha256;
                ArtifactFileName = !string.IsNullOrEmpty(release.MobileBuild.ArtifactPath)
                    ? Path.GetFileName(release.MobileBuild.ArtifactPath)
                    : null;
            }
        }

        public MobileReleaseDto(MobileBuild build)
        {
            Id = build.Id;
            MobileBuildId = build.Id;
            TenantId = build.TenantId;
            Version = build.Version;
            BuildNumber = build.BuildNumber;
            Status = build.Status;
            IsCurrent = false;
            PublishedAt = build.CompletedAt ?? build.CreatedAt;
            PublishedBy = build.CreatedBy;
            CreatedAt = build.CreatedAt;
            CompletedAt = build.CompletedAt;
            ArtifactSize = build.ArtifactSize;
            Sha256 = build.Sha256;
            ReleaseNotes = build.ReleaseNotes;
            ArtifactFileName = !string.IsNullOrEmpty(build.ArtifactPath)
                ? Path.GetFileName(build.ArtifactPath)
                : null;
        }
    }
}
