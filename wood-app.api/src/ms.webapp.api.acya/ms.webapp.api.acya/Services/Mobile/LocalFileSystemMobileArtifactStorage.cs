using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.Services.Mobile
{
    /// <summary>
    /// Local filesystem implementation of private mobile artifact storage.
    /// Ensures artifacts are stored in a private directory and cannot be accessed
    /// via direct HTTP requests or directory traversal.
    /// </summary>
    public class LocalFileSystemMobileArtifactStorage : IMobileArtifactStorage
    {
        private readonly string _baseDirectory;
        private readonly ILogger<LocalFileSystemMobileArtifactStorage> _logger;

        public LocalFileSystemMobileArtifactStorage(IConfiguration configuration, ILogger<LocalFileSystemMobileArtifactStorage> logger)
        {
            _logger = logger;
            var configuredPath = configuration["MobileStorage:BasePath"] ?? "storage/private/mobile";

            if (Path.IsPathRooted(configuredPath))
            {
                _baseDirectory = Path.GetFullPath(configuredPath);
            }
            else
            {
                _baseDirectory = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, configuredPath));
            }

            if (!Directory.Exists(_baseDirectory))
            {
                Directory.CreateDirectory(_baseDirectory);
            }
        }

        private string GetSafeFullPath(string relativePath)
        {
            // Normalize path separators
            var normalized = relativePath.Replace('/', Path.DirectorySeparatorChar)
                                         .Replace('\\', Path.DirectorySeparatorChar)
                                         .TrimStart(Path.DirectorySeparatorChar);

            var fullPath = Path.GetFullPath(Path.Combine(_baseDirectory, normalized));

            if (!fullPath.StartsWith(_baseDirectory, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Path traversal attempt detected with relative path: '{Path}'", relativePath);
                throw new UnauthorizedAccessException("Invalid storage path: path traversal attempt detected.");
            }

            return fullPath;
        }

        public Task<Stream?> GetArtifactStreamAsync(string artifactPath, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(artifactPath))
            {
                return Task.FromResult<Stream?>(null);
            }

            var safePath = GetSafeFullPath(artifactPath);
            if (!File.Exists(safePath))
            {
                _logger.LogWarning("Artifact file not found at path: {Path}", safePath);
                return Task.FromResult<Stream?>(null);
            }

            Stream stream = new FileStream(safePath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, FileOptions.Asynchronous);
            return Task.FromResult<Stream?>(stream);
        }

        public async Task<string> SaveArtifactAsync(string tenantId, int buildNumber, string fileName, Stream content, CancellationToken cancellationToken = default)
        {
            var cleanTenant = tenantId.Trim().ToLowerInvariant();
            var cleanFileName = Path.GetFileName(fileName);
            var relativeDirectory = Path.Combine(cleanTenant, buildNumber.ToString());
            var relativePath = Path.Combine(relativeDirectory, cleanFileName).Replace('\\', '/');

            var safeFullPath = GetSafeFullPath(relativePath);
            var dir = Path.GetDirectoryName(safeFullPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            using (var fileStream = new FileStream(safeFullPath, FileMode.Create, FileAccess.Write, FileShare.None, 4096, true))
            {
                await content.CopyToAsync(fileStream, cancellationToken);
            }

            _logger.LogInformation("Saved mobile artifact for tenant '{Tenant}' build {Build} to {Path}", cleanTenant, buildNumber, relativePath);
            return relativePath;
        }

        public Task<bool> ArtifactExistsAsync(string artifactPath, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(artifactPath))
            {
                return Task.FromResult(false);
            }

            var safePath = GetSafeFullPath(artifactPath);
            return Task.FromResult(File.Exists(safePath));
        }

        public Task<long> GetArtifactSizeAsync(string artifactPath, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(artifactPath))
            {
                return Task.FromResult(0L);
            }

            var safePath = GetSafeFullPath(artifactPath);
            if (!File.Exists(safePath))
            {
                return Task.FromResult(0L);
            }

            var info = new FileInfo(safePath);
            return Task.FromResult(info.Length);
        }

        public Task DeleteArtifactAsync(string artifactPath, CancellationToken cancellationToken = default)
        {
            if (!string.IsNullOrWhiteSpace(artifactPath))
            {
                var safePath = GetSafeFullPath(artifactPath);
                if (File.Exists(safePath))
                {
                    File.Delete(safePath);
                    _logger.LogInformation("Deleted artifact at path {Path}", safePath);
                }
            }
            return Task.CompletedTask;
        }
    }
}
