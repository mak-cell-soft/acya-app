using System.Threading;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;

namespace ms.webapp.api.acya.core.Interfaces
{
    /// <summary>
    /// Service for querying and registering tenant Firebase Android applications
    /// and managing client configuration artifacts in the master registry.
    /// </summary>
    public interface IFirebaseAppManagementService
    {
        /// <summary>
        /// Retrieves non-secret summary records for all active tenants in the master registry,
        /// including left-joined Firebase application status and configuration presence.
        /// Unregistered active tenants are returned with Status = "NotRegistered" and HasConfiguration = false.
        /// </summary>
        Task<System.Collections.Generic.List<TenantFirebaseAppSummaryDto>> GetAllTenantFirebaseAppsAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves non-secret Firebase application registration status for a tenant.
        /// </summary>
        Task<TenantFirebaseAppStatusDto?> GetTenantFirebaseAppStatusAsync(string tenantSlug, CancellationToken cancellationToken = default);

        /// <summary>
        /// Idempotently ensures that an Android application with the tenant's canonical package name
        /// is registered in the configured Firebase project, and persists the client configuration.
        /// </summary>
        Task<TenantFirebaseAppStatusDto> EnsureTenantAppRegisteredAsync(string tenantSlug, CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves the Base64-encoded google-services.json for the tenant.
        /// Verifies that the stored configuration matches the expected package name and contains a valid Android client.
        /// Used exclusively by the authorized mobile build pipeline. Returns null if not yet provisioned or inconsistent.
        /// </summary>
        Task<string?> GetTenantFirebaseConfigBase64Async(string tenantSlug, string? expectedPackageName = null, CancellationToken cancellationToken = default);
    }
}
