using System;

namespace ms.webapp.api.acya.core.Entities
{
    /// <summary>
    /// Represents a tenant's registered Firebase application in the master database.
    /// Tracks Android package identity, Firebase project mapping, and provisioning status.
    /// Maps to public.bo_tbl_tenant_firebase_apps.
    /// </summary>
    public class TenantFirebaseApp : IEntity
    {
        public int Id { get; set; }

        /// <summary>
        /// Tenant slug identifier (e.g. "socofeb", "socobois") referencing public.bo_tbl_enterprise("Slug").
        /// </summary>
        public string TenantId { get; set; } = string.Empty;

        /// <summary>
        /// The Firebase project ID (e.g. "acya-fcm-prod-dispatcher" or future pooled project ID).
        /// </summary>
        public string FirebaseProjectId { get; set; } = string.Empty;

        /// <summary>
        /// The globally unique Firebase-assigned application ID (e.g. "1:123456789:android:abcdef").
        /// Nullable while provisioning is Pending.
        /// </summary>
        public string? FirebaseAppId { get; set; }

        /// <summary>
        /// Canonical Android package name (e.g. "com.socofeb.woodapp").
        /// </summary>
        public string PackageName { get; set; } = string.Empty;

        /// <summary>
        /// Human-readable display name for the Firebase application.
        /// </summary>
        public string DisplayName { get; set; } = string.Empty;

        /// <summary>
        /// Optional public Firebase Android client configuration artifact (google-services.json content or base64).
        /// Nullable while provisioning is Pending.
        /// </summary>
        public string? GoogleServicesJson { get; set; }

        /// <summary>
        /// Provisioning status: "Pending", "Active", "Failed".
        /// </summary>
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// Optional SHA-1 signing certificate fingerprint registered with Firebase.
        /// </summary>
        public string? Sha1Fingerprint { get; set; }

        /// <summary>
        /// Optional SHA-256 signing certificate fingerprint registered with Firebase.
        /// </summary>
        public string? Sha256Fingerprint { get; set; }

        /// <summary>
        /// Timestamp when the registration record was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the registration record was last updated.
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
