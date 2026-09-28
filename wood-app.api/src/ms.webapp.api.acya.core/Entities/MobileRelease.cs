using System;

namespace ms.webapp.api.acya.core.Entities
{
    /// <summary>
    /// Represents an administrator-approved and published mobile release distributed to a tenant.
    /// A release explicitly points to a successful MobileBuild artifact.
    /// Strictly at most ONE release can be marked IsCurrent per tenant.
    /// </summary>
    public class MobileRelease : IEntity
    {
        public int Id { get; set; }

        /// <summary>
        /// Tenant slug identifier (e.g. "socofeb", "socobois").
        /// </summary>
        public string TenantId { get; set; } = string.Empty;

        /// <summary>
        /// Foreign key referencing the underlying MobileBuild.
        /// </summary>
        public int MobileBuildId { get; set; }

        /// <summary>
        /// Semantic version string (e.g. "1.0.0").
        /// </summary>
        public string Version { get; set; } = string.Empty;

        /// <summary>
        /// Monotonically increasing build integer for Android versionCode.
        /// </summary>
        public int BuildNumber { get; set; }

        /// <summary>
        /// Status of the release (e.g. "Published", "Previous", "Revoked").
        /// </summary>
        public string Status { get; set; } = "Published";

        /// <summary>
        /// Indicates if this is the currently active published release for the tenant.
        /// </summary>
        public bool IsCurrent { get; set; } = true;

        /// <summary>
        /// Timestamp when this release was published.
        /// </summary>
        public DateTime PublishedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Admin username or email who authorized publication.
        /// </summary>
        public string? PublishedBy { get; set; }

        /// <summary>
        /// Release notes or changelog for this release.
        /// </summary>
        public string? ReleaseNotes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// Navigation property to the underlying build artifact record.
        /// </summary>
        public virtual MobileBuild? MobileBuild { get; set; }
    }
}
