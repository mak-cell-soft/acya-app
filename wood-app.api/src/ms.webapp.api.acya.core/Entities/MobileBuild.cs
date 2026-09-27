using System;

namespace ms.webapp.api.acya.core.Entities
{
    /// <summary>
    /// Represents a tenant-specific mobile application build job and its published release artifact.
    /// Follows clean domain architecture and multi-tenant tracking.
    /// </summary>
    public class MobileBuild : IEntity
    {
        public int Id { get; set; }

        /// <summary>
        /// The tenant slug identifier (e.g. "socofeb", "socobois").
        /// Strict tenant isolation guarantees this matches the verified tenant.
        /// </summary>
        public string TenantId { get; set; } = string.Empty;

        /// <summary>
        /// Semantic version string (e.g. "1.4.2").
        /// </summary>
        public string Version { get; set; } = string.Empty;

        /// <summary>
        /// Monotonically increasing build integer for Android versionCode.
        /// </summary>
        public int BuildNumber { get; set; }

        /// <summary>
        /// Current build status: Pending, Building, Succeeded, Failed, Cancelled.
        /// </summary>
        public string Status { get; set; } = MobileBuildStatus.Pending;

        /// <summary>
        /// Private relative storage path for the generated APK artifact (e.g. "private/mobile/socofeb/142/app.apk").
        /// Never exposed publicly or returned directly in client responses.
        /// </summary>
        public string? ArtifactPath { get; set; }

        /// <summary>
        /// Artifact size in bytes.
        /// </summary>
        public long? ArtifactSize { get; set; }

        /// <summary>
        /// SHA-256 cryptographic checksum of the APK binary.
        /// </summary>
        public string? Sha256 { get; set; }

        /// <summary>
        /// Release notes or changelog for this build.
        /// </summary>
        public string? ReleaseNotes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        /// <summary>
        /// Error details if the build failed.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Username or identifier of the admin/system user who initiated the build.
        /// </summary>
        public string? CreatedBy { get; set; }

        /// <summary>
        /// Git commit SHA associated with this build.
        /// </summary>
        public string? GitCommitHash { get; set; }

        /// <summary>
        /// Git branch name (default: "main").
        /// </summary>
        public string? GitBranch { get; set; }

        /// <summary>
        /// External CI/CD run ID (e.g. GitHub Actions workflow run ID).
        /// </summary>
        public string? WorkflowRunId { get; set; }

        /// <summary>
        /// Soft delete / active state flag.
        /// </summary>
        public bool IsActive { get; set; } = true;
    }
}
