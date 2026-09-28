using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IMobileBuildService
    {
        // Admin build operations
        Task<MobileBuildDto> CreateBuildAsync(CreateMobileBuildDto dto, string? createdBy, CancellationToken cancellationToken = default);
        Task<MobileBuildDto?> GetBuildByIdAsync(int id, CancellationToken cancellationToken = default);
        Task<IEnumerable<MobileBuildDto>> GetBuildsAsync(string? tenantId = null, string? status = null, int page = 1, int pageSize = 50, CancellationToken cancellationToken = default);
        Task<MobileBuildDto?> UpdateBuildStatusAsync(int id, UpdateMobileBuildStatusDto dto, CancellationToken cancellationToken = default);

        // Admin release operations
        Task<MobileReleaseDto> PublishReleaseAsync(int buildId, string? publishedBy, CancellationToken cancellationToken = default);
        Task<IEnumerable<MobileReleaseDto>> GetAllReleasesAsync(string? tenantId = null, CancellationToken cancellationToken = default);
        Task<IEnumerable<MobileReleaseDto>> GetCurrentReleasesAsync(string? tenantId = null, CancellationToken cancellationToken = default);

        // Tenant release operations
        Task<IEnumerable<MobileReleaseDto>> GetReleasesForTenantAsync(string tenantId, CancellationToken cancellationToken = default);
        Task<MobileReleaseDto?> GetReleaseByIdAsync(int id, string tenantId, CancellationToken cancellationToken = default);
        Task<MobileReleaseDto?> GetCurrentReleaseForTenantAsync(string tenantId, CancellationToken cancellationToken = default);
        Task<MobileDownloadResponseDto?> PrepareDownloadAsync(int releaseId, string tenantId, int? userId, string baseUrl, CancellationToken cancellationToken = default);
        Task<(Stream? Stream, string FileName, string ContentType)?> GetDownloadArtifactAsync(string token, CancellationToken cancellationToken = default);

        // Worker artifact upload
        Task<MobileBuildDto?> UploadArtifactAsync(int id, string fileName, Stream content, string? expectedSha256 = null, CancellationToken cancellationToken = default);
    }
}
