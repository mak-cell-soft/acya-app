using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.Services.Mobile
{
    public class FirebaseAppManagementService : IFirebaseAppManagementService
    {
        private readonly MasterDbContext _masterDb;
        private readonly IFirebaseManagementApiClient _apiClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<FirebaseAppManagementService> _logger;

        public FirebaseAppManagementService(
            MasterDbContext masterDb,
            IFirebaseManagementApiClient apiClient,
            IConfiguration configuration,
            ILogger<FirebaseAppManagementService> logger)
        {
            _masterDb = masterDb;
            _apiClient = apiClient;
            _configuration = configuration;
            _logger = logger;
        }

        private static string NormalizeSlug(string tenantSlug)
        {
            if (string.IsNullOrWhiteSpace(tenantSlug))
            {
                throw new ArgumentException("Tenant slug cannot be null or empty.", nameof(tenantSlug));
            }
            return tenantSlug.Trim().ToLowerInvariant();
        }

        private static string DerivePackageName(string cleanSlug)
        {
            var alphanumericSlug = Regex.Replace(cleanSlug, @"[^a-z0-9]", "");
            if (string.IsNullOrEmpty(alphanumericSlug))
            {
                alphanumericSlug = "tenant";
            }
            return $"com.{alphanumericSlug}.woodapp";
        }

        private string ResolveTargetProjectId()
        {
            var projectId = _configuration["FIREBASE_MANAGEMENT_PROJECT_ID"]
                         ?? _configuration["Firebase:ManagementProjectId"]
                         ?? _configuration["FIREBASE_PROJECT_ID"]
                         ?? _configuration["Firebase:ProjectId"]
                         ?? "acya-fcm-prod-dispatcher";

            return projectId.Trim();
        }

        public async Task<System.Collections.Generic.List<TenantFirebaseAppSummaryDto>> GetAllTenantFirebaseAppsAsync(CancellationToken cancellationToken = default)
        {
            var defaultProjectId = ResolveTargetProjectId();

            var query = from t in _masterDb.TenantRegistries.AsNoTracking()
                        where t.IsActive
                        orderby t.Name, t.Slug
                        join a in _masterDb.TenantFirebaseApps.AsNoTracking()
                            on t.Slug equals a.TenantId into apps
                        from a in apps.DefaultIfEmpty()
                        select new
                        {
                            TenantSlug = t.Slug,
                            TenantName = t.Name,
                            TenantCreatedAt = t.CreatedAt,
                            HasApp = a != null,
                            AppTenantId = a != null ? a.TenantId : null,
                            AppFirebaseProjectId = a != null ? a.FirebaseProjectId : null,
                            AppFirebaseAppId = a != null ? a.FirebaseAppId : null,
                            AppPackageName = a != null ? a.PackageName : null,
                            AppDisplayName = a != null ? a.DisplayName : null,
                            AppStatus = a != null ? a.Status : null,
                            AppHasConfig = a != null && a.GoogleServicesJson != null && a.GoogleServicesJson != "",
                            AppCreatedAt = a != null ? (DateTime?)a.CreatedAt : null,
                            AppUpdatedAt = a != null ? (DateTime?)a.UpdatedAt : null,
                        };

            var rows = await query.ToListAsync(cancellationToken);

            return rows.Select(r =>
            {
                var cleanSlug = (r.TenantSlug ?? string.Empty).Trim().ToLowerInvariant();
                var defaultPackageName = DerivePackageName(cleanSlug);
                var defaultDisplayName = !string.IsNullOrWhiteSpace(r.TenantName) ? r.TenantName : cleanSlug.ToUpperInvariant();

                if (r.HasApp)
                {
                    return new TenantFirebaseAppSummaryDto
                    {
                        TenantId = cleanSlug,
                        TenantName = !string.IsNullOrWhiteSpace(r.TenantName) ? r.TenantName : cleanSlug,
                        PackageName = !string.IsNullOrWhiteSpace(r.AppPackageName) ? r.AppPackageName : defaultPackageName,
                        FirebaseProjectId = !string.IsNullOrWhiteSpace(r.AppFirebaseProjectId) ? r.AppFirebaseProjectId : defaultProjectId,
                        FirebaseAppId = r.AppFirebaseAppId,
                        DisplayName = !string.IsNullOrWhiteSpace(r.AppDisplayName) ? r.AppDisplayName : defaultDisplayName,
                        Status = !string.IsNullOrWhiteSpace(r.AppStatus) ? r.AppStatus : "NotRegistered",
                        HasConfiguration = r.AppHasConfig,
                        CreatedAt = r.AppCreatedAt ?? r.TenantCreatedAt,
                        UpdatedAt = r.AppUpdatedAt
                    };
                }

                return new TenantFirebaseAppSummaryDto
                {
                    TenantId = cleanSlug,
                    TenantName = !string.IsNullOrWhiteSpace(r.TenantName) ? r.TenantName : cleanSlug,
                    PackageName = defaultPackageName,
                    FirebaseProjectId = defaultProjectId,
                    FirebaseAppId = null,
                    DisplayName = defaultDisplayName,
                    Status = "NotRegistered",
                    HasConfiguration = false,
                    CreatedAt = r.TenantCreatedAt,
                    UpdatedAt = null
                };
            }).ToList();
        }

        public async Task<TenantFirebaseAppStatusDto?> GetTenantFirebaseAppStatusAsync(string tenantSlug, CancellationToken cancellationToken = default)
        {
            var cleanSlug = NormalizeSlug(tenantSlug);

            // Verify tenant exists in authoritative registry
            var tenant = await _masterDb.TenantRegistries
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Slug == cleanSlug, cancellationToken);

            if (tenant == null)
            {
                return null;
            }

            var app = await _masterDb.TenantFirebaseApps
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.TenantId == cleanSlug, cancellationToken);

            if (app == null)
            {
                return new TenantFirebaseAppStatusDto
                {
                    TenantId = cleanSlug,
                    FirebaseProjectId = ResolveTargetProjectId(),
                    PackageName = DerivePackageName(cleanSlug),
                    DisplayName = tenant.Name ?? cleanSlug.ToUpperInvariant(),
                    Status = "NotRegistered",
                    HasConfiguration = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
            }

            return new TenantFirebaseAppStatusDto
            {
                TenantId = app.TenantId,
                FirebaseProjectId = app.FirebaseProjectId,
                FirebaseAppId = app.FirebaseAppId,
                PackageName = app.PackageName,
                DisplayName = app.DisplayName,
                Status = app.Status,
                HasConfiguration = !string.IsNullOrWhiteSpace(app.GoogleServicesJson),
                Sha1Fingerprint = app.Sha1Fingerprint,
                Sha256Fingerprint = app.Sha256Fingerprint,
                CreatedAt = app.CreatedAt,
                UpdatedAt = app.UpdatedAt
            };
        }

        public async Task<TenantFirebaseAppStatusDto> EnsureTenantAppRegisteredAsync(string tenantSlug, CancellationToken cancellationToken = default)
        {
            var cleanSlug = NormalizeSlug(tenantSlug);

            // 1. Authoritative tenant registry verification
            var tenant = await _masterDb.TenantRegistries
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Slug == cleanSlug, cancellationToken);

            if (tenant == null)
            {
                throw new KeyNotFoundException($"Tenant '{tenantSlug}' does not exist in the master enterprise registry.");
            }

            var packageName = DerivePackageName(cleanSlug);
            var projectId = ResolveTargetProjectId();
            var displayName = !string.IsNullOrWhiteSpace(tenant.Name) ? tenant.Name : cleanSlug.ToUpperInvariant();

            // 2. Fast-path check: Is application already active and fully configured in database?
            var existingRecord = await _masterDb.TenantFirebaseApps
                .FirstOrDefaultAsync(a => a.TenantId == cleanSlug, cancellationToken);

            if (existingRecord != null &&
                string.Equals(existingRecord.Status, "Active", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(existingRecord.GoogleServicesJson) &&
                string.Equals(existingRecord.PackageName, packageName, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(existingRecord.FirebaseProjectId, projectId, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Firebase app for tenant '{TenantSlug}' is already registered and active (Id: {AppId}).", cleanSlug, existingRecord.FirebaseAppId);
                return MapToStatusDto(existingRecord);
            }

            // 3. Check remote Firebase project
            string? remoteAppId = null;
            try
            {
                var remoteApps = await _apiClient.ListAndroidAppsAsync(projectId, cancellationToken);
                var matched = remoteApps.FirstOrDefault(a => string.Equals(a.PackageName, packageName, StringComparison.OrdinalIgnoreCase));
                if (matched != null)
                {
                    remoteAppId = matched.AppId;
                    _logger.LogInformation("Found existing remote Firebase app for package '{PackageName}' with AppId '{AppId}'.", packageName, remoteAppId);
                }
            }
            catch (UnauthorizedAccessException)
            {
                throw;
            }
            catch (InvalidOperationException)
            {
                throw;
            }
            catch (Exception ex) when (!(ex is OperationCanceledException))
            {
                _logger.LogWarning(ex, "Failed to list remote Firebase apps for project '{ProjectId}'. Proceeding to registration attempt.", projectId);
            }

            // 4. Register if missing remotely
            if (string.IsNullOrEmpty(remoteAppId))
            {
                _logger.LogInformation("Registering new Android app in Firebase project '{ProjectId}' for package '{PackageName}'...", projectId, packageName);
                var opResult = await _apiClient.CreateAndroidAppAsync(projectId, packageName, displayName, cancellationToken);

                if (opResult.ErrorCode == 409)
                {
                    // Conflict: app was registered concurrently or exists. Query remote apps again to resolve AppId.
                    var remoteApps = await _apiClient.ListAndroidAppsAsync(projectId, cancellationToken);
                    var matched = remoteApps.FirstOrDefault(a => string.Equals(a.PackageName, packageName, StringComparison.OrdinalIgnoreCase));
                    if (matched != null)
                    {
                        remoteAppId = matched.AppId;
                    }
                    else
                    {
                        throw new InvalidOperationException($"Package '{packageName}' conflict reported by Firebase but AppId could not be resolved.");
                    }
                }
                else if (opResult.Done && !string.IsNullOrEmpty(opResult.AppId))
                {
                    remoteAppId = opResult.AppId;
                }
                else if (!string.IsNullOrEmpty(opResult.Name))
                {
                    // Poll long-running operation
                    remoteAppId = await PollOperationUntilCompletionAsync(opResult.Name, cancellationToken);
                }
                else
                {
                    throw new InvalidOperationException($"Firebase app creation returned an unexpected empty operation response for package '{packageName}'.");
                }
            }

            if (string.IsNullOrWhiteSpace(remoteAppId))
            {
                throw new InvalidOperationException($"Failed to determine Firebase AppId for package '{packageName}'.");
            }

            // 5. Retrieve public client configuration artifact (google-services.json)
            _logger.LogInformation("Fetching client configuration artifact for AppId '{AppId}'...", remoteAppId);
            var configResult = await _apiClient.GetAndroidAppConfigAsync(projectId, remoteAppId, cancellationToken);
            if (string.IsNullOrWhiteSpace(configResult.ConfigFileContents))
            {
                throw new InvalidOperationException($"Firebase returned an empty configuration file for AppId '{remoteAppId}'.");
            }

            // Decode base64 to store clean JSON string in registry
            string rawJson;
            try
            {
                var bytes = Convert.FromBase64String(configResult.ConfigFileContents);
                rawJson = Encoding.UTF8.GetString(bytes);
            }
            catch
            {
                // If already raw JSON, store as is
                rawJson = configResult.ConfigFileContents;
            }

            // Validate that the retrieved configuration contains the expected package name
            if (!ValidateGoogleServicesJson(rawJson, packageName))
            {
                throw new InvalidOperationException($"Retrieved Firebase configuration for AppId '{remoteAppId}' does not contain an Android client configuration for package '{packageName}'.");
            }

            // 6. Persist to Master Database with concurrency conflict resilience
            if (existingRecord == null)
            {
                existingRecord = new TenantFirebaseApp
                {
                    TenantId = cleanSlug,
                    FirebaseProjectId = projectId,
                    FirebaseAppId = remoteAppId,
                    PackageName = packageName,
                    DisplayName = displayName,
                    GoogleServicesJson = rawJson,
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _masterDb.TenantFirebaseApps.Add(existingRecord);
            }
            else
            {
                existingRecord.FirebaseProjectId = projectId;
                existingRecord.FirebaseAppId = remoteAppId;
                existingRecord.PackageName = packageName;
                existingRecord.DisplayName = displayName;
                existingRecord.GoogleServicesJson = rawJson;
                existingRecord.Status = "Active";
                existingRecord.UpdatedAt = DateTime.UtcNow;
            }

            try
            {
                await _masterDb.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogWarning(dbEx, "Concurrent database update conflict for tenant '{TenantSlug}'. Reloading and saving state.", cleanSlug);

                // Detach tracked entries to clear state
                foreach (var entry in _masterDb.ChangeTracker.Entries<TenantFirebaseApp>().ToList())
                {
                    entry.State = EntityState.Detached;
                }

                var reloaded = await _masterDb.TenantFirebaseApps
                    .FirstOrDefaultAsync(a => a.TenantId == cleanSlug, cancellationToken);

                if (reloaded != null)
                {
                    reloaded.FirebaseProjectId = projectId;
                    reloaded.FirebaseAppId = remoteAppId;
                    reloaded.PackageName = packageName;
                    reloaded.DisplayName = displayName;
                    reloaded.GoogleServicesJson = rawJson;
                    reloaded.Status = "Active";
                    reloaded.UpdatedAt = DateTime.UtcNow;
                    await _masterDb.SaveChangesAsync(cancellationToken);
                    existingRecord = reloaded;
                }
                else
                {
                    throw;
                }
            }

            _logger.LogInformation("Successfully provisioned and persisted Firebase app for tenant '{TenantSlug}' (AppId: {AppId}).", cleanSlug, remoteAppId);
            return MapToStatusDto(existingRecord);
        }

        private async Task<string> PollOperationUntilCompletionAsync(string operationName, CancellationToken cancellationToken)
        {
            var maxAttempts = 15;
            var delayMs = 500;

            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                await Task.Delay(delayMs, cancellationToken);
                var op = await _apiClient.GetOperationAsync(operationName, cancellationToken);

                if (op.Done)
                {
                    if (!string.IsNullOrEmpty(op.ErrorMessage))
                    {
                        throw new InvalidOperationException($"Firebase operation '{operationName}' failed: {op.ErrorMessage} (Code: {op.ErrorCode})");
                    }
                    if (!string.IsNullOrEmpty(op.AppId))
                    {
                        return op.AppId;
                    }
                    throw new InvalidOperationException($"Firebase operation '{operationName}' completed without returning an AppId.");
                }

                // Exponential backoff capped at 2.5s
                delayMs = Math.Min(delayMs * 2, 2500);
            }

            throw new TimeoutException($"Timed out polling Firebase operation '{operationName}' after {maxAttempts} attempts.");
        }

        public async Task<string?> GetTenantFirebaseConfigBase64Async(string tenantSlug, string? expectedPackageName = null, CancellationToken cancellationToken = default)
        {
            var cleanSlug = NormalizeSlug(tenantSlug);
            var targetPackage = !string.IsNullOrWhiteSpace(expectedPackageName)
                ? expectedPackageName
                : DerivePackageName(cleanSlug);

            var app = await _masterDb.TenantFirebaseApps
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.TenantId == cleanSlug && a.Status == "Active", cancellationToken);

            if (app == null || string.IsNullOrWhiteSpace(app.GoogleServicesJson))
            {
                return null;
            }

            // 1. Verify tenant match
            if (!string.Equals(app.TenantId, cleanSlug, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Tenant mismatch in Firebase app registry: record tenant '{RecordTenant}' != query tenant '{CleanSlug}'.", app.TenantId, cleanSlug);
                return null;
            }

            // 2. Verify registered package match
            if (!string.Equals(app.PackageName, targetPackage, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Package mismatch for tenant '{TenantSlug}': registered package '{RegisteredPkg}' does not match expected package '{ExpectedPkg}'. Configuration rejected.", cleanSlug, app.PackageName, targetPackage);
                return null;
            }

            // 3. Verify JSON contents contain matching client configuration
            var trimmed = app.GoogleServicesJson.Trim();
            if (!ValidateGoogleServicesJson(trimmed, targetPackage))
            {
                _logger.LogWarning("GoogleServicesJson for tenant '{TenantSlug}' failed validation. Does not contain valid Android client for package '{ExpectedPkg}'. Configuration rejected.", cleanSlug, targetPackage);
                return null;
            }

            // 4. Return as Base64
            if (IsBase64(trimmed))
            {
                return trimmed;
            }

            return Convert.ToBase64String(Encoding.UTF8.GetBytes(trimmed));
        }

        /// <summary>
        /// Validates that a google-services.json payload (raw or base64) is valid JSON and contains
        /// an Android client definition matching the specified expected package name.
        /// </summary>
        public static bool ValidateGoogleServicesJson(string? rawJsonOrBase64, string expectedPackageName)
        {
            if (string.IsNullOrWhiteSpace(rawJsonOrBase64) || string.IsNullOrWhiteSpace(expectedPackageName))
            {
                return false;
            }

            string json = rawJsonOrBase64.Trim();
            if (IsBase64(json))
            {
                try
                {
                    json = Encoding.UTF8.GetString(Convert.FromBase64String(json));
                }
                catch
                {
                    return false;
                }
            }

            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (root.ValueKind != JsonValueKind.Object)
                {
                    return false;
                }

                if (root.TryGetProperty("client", out var clientArray) && clientArray.ValueKind == JsonValueKind.Array)
                {
                    foreach (var client in clientArray.EnumerateArray())
                    {
                        if (client.TryGetProperty("client_info", out var clientInfo) &&
                            clientInfo.TryGetProperty("android_client_info", out var androidClientInfo) &&
                            androidClientInfo.TryGetProperty("package_name", out var pkgProp))
                        {
                            var pkg = pkgProp.GetString();
                            if (string.Equals(pkg, expectedPackageName, StringComparison.OrdinalIgnoreCase))
                            {
                                return true;
                            }
                        }
                    }
                }

                return false;
            }
            catch
            {
                return false;
            }
        }

        private static bool IsBase64(string base64)
        {
            if (string.IsNullOrWhiteSpace(base64) || base64.Contains("{"))
            {
                return false;
            }

            var buffer = new Span<byte>(new byte[base64.Length]);
            return Convert.TryFromBase64String(base64, buffer, out _);
        }

        private static TenantFirebaseAppStatusDto MapToStatusDto(TenantFirebaseApp app)
        {
            return new TenantFirebaseAppStatusDto
            {
                TenantId = app.TenantId,
                FirebaseProjectId = app.FirebaseProjectId,
                FirebaseAppId = app.FirebaseAppId,
                PackageName = app.PackageName,
                DisplayName = app.DisplayName,
                Status = app.Status,
                HasConfiguration = !string.IsNullOrWhiteSpace(app.GoogleServicesJson),
                Sha1Fingerprint = app.Sha1Fingerprint,
                Sha256Fingerprint = app.Sha256Fingerprint,
                CreatedAt = app.CreatedAt,
                UpdatedAt = app.UpdatedAt
            };
        }
    }
}
