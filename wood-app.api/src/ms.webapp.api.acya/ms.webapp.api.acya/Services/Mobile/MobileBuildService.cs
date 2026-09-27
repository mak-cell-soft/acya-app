using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.Services.Mobile
{
    public class MobileBuildService : IMobileBuildService
    {
        private readonly MasterDbContext _masterDb;
        private readonly WoodAppContext _woodAppDb;
        private readonly IMobileArtifactStorage _artifactStorage;
        private readonly IMobileDownloadTokenService _tokenService;
        private readonly IMobileTenantConfigService _configService;
        private readonly ILogger<MobileBuildService> _logger;

        public MobileBuildService(
            MasterDbContext masterDb,
            WoodAppContext woodAppDb,
            IMobileArtifactStorage artifactStorage,
            IMobileDownloadTokenService tokenService,
            IMobileTenantConfigService configService,
            ILogger<MobileBuildService> logger)
        {
            _masterDb = masterDb;
            _woodAppDb = woodAppDb;
            _artifactStorage = artifactStorage;
            _tokenService = tokenService;
            _configService = configService;
            _logger = logger;
        }

        public async Task<MobileBuildDto> CreateBuildAsync(CreateMobileBuildDto dto, string? createdBy, CancellationToken cancellationToken = default)
        {
            var cleanTenant = dto.TenantId.Trim().ToLowerInvariant();

            // 1. Verify tenant exists
            var tenantExists = await _masterDb.TenantRegistries
                .AnyAsync(t => t.Slug.ToLower() == cleanTenant, cancellationToken);

            if (!tenantExists)
            {
                throw new ArgumentException($"Tenant '{dto.TenantId}' does not exist.", nameof(dto.TenantId));
            }

            // 2. Resolve sequential build number if not provided
            var buildNumber = dto.BuildNumber;
            if (buildNumber <= 0)
            {
                var latestBuildNumber = await _masterDb.MobileBuilds
                    .Where(b => b.TenantId == cleanTenant)
                    .Select(b => (int?)b.BuildNumber)
                    .MaxAsync(cancellationToken) ?? 0;

                buildNumber = latestBuildNumber + 1;
            }

            var build = new MobileBuild
            {
                TenantId = cleanTenant,
                Version = dto.Version.Trim(),
                BuildNumber = buildNumber,
                Status = MobileBuildStatus.Pending,
                ReleaseNotes = dto.ReleaseNotes,
                GitBranch = string.IsNullOrWhiteSpace(dto.GitBranch) ? "main" : dto.GitBranch.Trim(),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy,
                IsActive = true
            };

            _masterDb.MobileBuilds.Add(build);
            await _masterDb.SaveChangesAsync(cancellationToken);

            // Audit build creation
            try
            {
                var auditLog = new AuditLog
                {
                    Action = "MobileBuildCreated",
                    TableName = "bo_tbl_mobile_builds",
                    Timestamp = DateTime.UtcNow,
                    UserName = createdBy ?? "System",
                    KeyValues = JsonSerializer.Serialize(new { Id = build.Id }),
                    NewValues = JsonSerializer.Serialize(new 
                    { 
                        TenantId = build.TenantId, 
                        Version = build.Version, 
                        BuildNumber = build.BuildNumber,
                        CreatedBy = createdBy 
                    })
                };
                _woodAppDb.AuditLogs.Add(auditLog);
                await _woodAppDb.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to record audit log for MobileBuildCreated");
            }

            _logger.LogInformation("Created new MobileBuild ID {Id} for tenant '{Tenant}' version {Version} (build {BuildNumber})", 
                build.Id, build.TenantId, build.Version, build.BuildNumber);

            return new MobileBuildDto(build);
        }

        public async Task<MobileBuildDto?> GetBuildByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            var build = await _masterDb.MobileBuilds
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == id && b.IsActive, cancellationToken);

            return build != null ? new MobileBuildDto(build) : null;
        }

        public async Task<IEnumerable<MobileBuildDto>> GetBuildsAsync(string? tenantId = null, string? status = null, int page = 1, int pageSize = 50, CancellationToken cancellationToken = default)
        {
            var query = _masterDb.MobileBuilds
                .AsNoTracking()
                .Where(b => b.IsActive);

            if (!string.IsNullOrWhiteSpace(tenantId))
            {
                var cleanTenant = tenantId.Trim().ToLowerInvariant();
                query = query.Where(b => b.TenantId == cleanTenant);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var cleanStatus = status.Trim();
                query = query.Where(b => b.Status == cleanStatus);
            }

            var items = await query
                .OrderByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return items.Select(b => new MobileBuildDto(b));
        }

        public async Task<MobileBuildDto?> UpdateBuildStatusAsync(int id, UpdateMobileBuildStatusDto dto, CancellationToken cancellationToken = default)
        {
            var build = await _masterDb.MobileBuilds
                .FirstOrDefaultAsync(b => b.Id == id && b.IsActive, cancellationToken);

            if (build == null)
            {
                return null;
            }

            if (!MobileBuildStatus.IsValid(dto.Status))
            {
                throw new ArgumentException($"Invalid status: '{dto.Status}'", nameof(dto.Status));
            }

            build.Status = dto.Status;

            if (!string.IsNullOrWhiteSpace(dto.ArtifactPath))
            {
                build.ArtifactPath = dto.ArtifactPath.Trim();
            }

            if (dto.ArtifactSize.HasValue)
            {
                build.ArtifactSize = dto.ArtifactSize.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Sha256))
            {
                build.Sha256 = dto.Sha256.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.ErrorMessage))
            {
                build.ErrorMessage = dto.ErrorMessage.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.GitCommitHash))
            {
                build.GitCommitHash = dto.GitCommitHash.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.WorkflowRunId))
            {
                build.WorkflowRunId = dto.WorkflowRunId.Trim();
            }

            if (dto.Status == MobileBuildStatus.Building && build.StartedAt == null)
            {
                build.StartedAt = DateTime.UtcNow;
            }
            else if (dto.Status == MobileBuildStatus.Succeeded || dto.Status == MobileBuildStatus.Failed || dto.Status == MobileBuildStatus.Cancelled)
            {
                build.CompletedAt = DateTime.UtcNow;
            }

            await _masterDb.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Updated MobileBuild ID {Id} status to '{Status}'", build.Id, build.Status);
            return new MobileBuildDto(build);
        }

        public async Task<IEnumerable<MobileReleaseDto>> GetReleasesForTenantAsync(string tenantId, CancellationToken cancellationToken = default)
        {
            var cleanTenant = tenantId.Trim().ToLowerInvariant();

            var releases = await _masterDb.MobileBuilds
                .AsNoTracking()
                .Where(b => b.TenantId == cleanTenant 
                         && b.Status == MobileBuildStatus.Succeeded 
                         && b.IsActive 
                         && b.ArtifactPath != null)
                .OrderByDescending(b => b.BuildNumber)
                .ToListAsync(cancellationToken);

            return releases.Select(r => new MobileReleaseDto(r));
        }

        public async Task<MobileReleaseDto?> GetReleaseByIdAsync(int id, string tenantId, CancellationToken cancellationToken = default)
        {
            var cleanTenant = tenantId.Trim().ToLowerInvariant();

            var release = await _masterDb.MobileBuilds
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == id && b.IsActive, cancellationToken);

            if (release == null)
            {
                return null;
            }

            // Tenant isolation verification
            if (!string.Equals(release.TenantId, cleanTenant, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Security Violation: Tenant '{RequestTenant}' attempted to access release {Id} belonging to '{ReleaseTenant}'", 
                    cleanTenant, id, release.TenantId);
                return null; // Return null so controller returns 404 or 403 without leaking details
            }

            return new MobileReleaseDto(release);
        }

        public async Task<MobileDownloadResponseDto?> PrepareDownloadAsync(int releaseId, string tenantId, int? userId, string baseUrl, CancellationToken cancellationToken = default)
        {
            var cleanTenant = tenantId.Trim().ToLowerInvariant();

            var release = await _masterDb.MobileBuilds
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == releaseId && b.IsActive, cancellationToken);

            if (release == null)
            {
                return null;
            }

            // Strict tenant isolation check
            if (!string.Equals(release.TenantId, cleanTenant, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Security Violation: Tenant '{RequestTenant}' attempted to download release {Id} belonging to '{ReleaseTenant}'", 
                    cleanTenant, releaseId, release.TenantId);
                return null;
            }

            if (release.Status != MobileBuildStatus.Succeeded || string.IsNullOrWhiteSpace(release.ArtifactPath))
            {
                _logger.LogWarning("Download requested for incomplete release {Id} (Status: {Status})", releaseId, release.Status);
                return null;
            }

            // Verify physical artifact exists in private storage
            var exists = await _artifactStorage.ArtifactExistsAsync(release.ArtifactPath, cancellationToken);
            if (!exists)
            {
                _logger.LogError("Physical artifact missing in private storage for release {Id} at '{Path}'", releaseId, release.ArtifactPath);
                return null;
            }

            // Generate short-lived signed token
            var token = _tokenService.GenerateToken(release.Id, cleanTenant, userId);

            var fileName = $"acya-{cleanTenant}-{release.Version}.apk";
            var relativeDownloadPath = $"/api/mobile/releases/download?token={Uri.EscapeDataString(token)}";

            string fullDownloadUrl = relativeDownloadPath;
            if (!string.IsNullOrWhiteSpace(baseUrl))
            {
                fullDownloadUrl = $"{baseUrl.TrimEnd('/')}{relativeDownloadPath}";
            }

            return new MobileDownloadResponseDto
            {
                ReleaseId = release.Id,
                TenantId = cleanTenant,
                Version = release.Version,
                FileName = fileName,
                DownloadUrl = fullDownloadUrl,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15)
            };
        }

        public async Task<(Stream? Stream, string FileName, string ContentType)?> GetDownloadArtifactAsync(string token, CancellationToken cancellationToken = default)
        {
            if (!_tokenService.TryValidateToken(token, out var validated) || validated == null)
            {
                _logger.LogWarning("Invalid or expired download token presented.");
                return null;
            }

            var release = await _masterDb.MobileBuilds
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == validated.ReleaseId && b.IsActive, cancellationToken);

            if (release == null || !string.Equals(release.TenantId, validated.TenantId, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Download token tenant '{TokenTenant}' mismatch with release ID {ReleaseId}", validated.TenantId, validated.ReleaseId);
                return null;
            }

            if (string.IsNullOrWhiteSpace(release.ArtifactPath))
            {
                return null;
            }

            var stream = await _artifactStorage.GetArtifactStreamAsync(release.ArtifactPath, cancellationToken);
            if (stream == null)
            {
                return null;
            }

            // Audit the successful download event
            try
            {
                var auditLog = new AuditLog
                {
                    Action = "MobileReleaseDownloaded",
                    TableName = "bo_tbl_mobile_builds",
                    Timestamp = DateTime.UtcNow,
                    UserId = validated.UserId,
                    UserName = validated.UserId.HasValue ? $"User_{validated.UserId}" : "AnonymousToken",
                    KeyValues = JsonSerializer.Serialize(new { ReleaseId = release.Id }),
                    NewValues = JsonSerializer.Serialize(new 
                    { 
                        TenantId = validated.TenantId, 
                        Version = release.Version,
                        BuildNumber = release.BuildNumber,
                        DownloadedAt = DateTime.UtcNow
                    })
                };
                _woodAppDb.AuditLogs.Add(auditLog);
                await _woodAppDb.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to record audit log for MobileReleaseDownloaded");
            }

            var fileName = $"acya-{release.TenantId}-{release.Version}.apk";
            return (stream, fileName, "application/vnd.android.package-archive");
        }

        public async Task<MobileBuildDto?> UploadArtifactAsync(int id, string fileName, Stream content, string? expectedSha256 = null, CancellationToken cancellationToken = default)
        {
            var build = await _masterDb.MobileBuilds
                .FirstOrDefaultAsync(b => b.Id == id && b.IsActive, cancellationToken);

            if (build == null)
            {
                return null;
            }

            var cleanFileName = Path.GetFileName(fileName);
            var extension = Path.GetExtension(cleanFileName).ToLowerInvariant();
            if (extension != ".apk" && extension != ".aab")
            {
                throw new ArgumentException("Only .apk and .aab files are supported for mobile artifacts.", nameof(fileName));
            }

            // Stream to memory or temp file to compute SHA-256 and store
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            using var memoryStream = new MemoryStream();
            await content.CopyToAsync(memoryStream, cancellationToken);
            memoryStream.Position = 0;

            var hashBytes = sha256.ComputeHash(memoryStream);
            var calculatedSha256 = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();

            if (!string.IsNullOrWhiteSpace(expectedSha256))
            {
                var cleanExpected = expectedSha256.Trim().ToLowerInvariant();
                if (cleanExpected != calculatedSha256)
                {
                    _logger.LogWarning("Checksum mismatch for build {Id} artifact upload. Expected: {Expected}, Calculated: {Calculated}",
                        id, cleanExpected, calculatedSha256);
                    throw new ArgumentException($"SHA-256 checksum mismatch. Expected '{cleanExpected}', calculated '{calculatedSha256}'.", nameof(expectedSha256));
                }
            }

            memoryStream.Position = 0;
            var relativePath = await _artifactStorage.SaveArtifactAsync(build.TenantId, build.BuildNumber, cleanFileName, memoryStream, cancellationToken);

            build.ArtifactPath = relativePath;
            build.ArtifactSize = memoryStream.Length;
            build.Sha256 = calculatedSha256;

            await _masterDb.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Successfully uploaded and stored artifact for MobileBuild {Id}: {Path} ({Size} bytes, SHA-256: {Sha})",
                build.Id, relativePath, build.ArtifactSize, build.Sha256);

            return new MobileBuildDto(build);
        }
    }
}
