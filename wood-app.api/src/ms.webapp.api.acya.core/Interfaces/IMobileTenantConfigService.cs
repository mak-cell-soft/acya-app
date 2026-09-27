using System.Threading;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;

namespace ms.webapp.api.acya.core.Interfaces
{
    /// <summary>
    /// Generates mobile application configuration dynamically from tenant and enterprise data.
    /// </summary>
    public interface IMobileTenantConfigService
    {
        Task<MobileTenantConfigDto?> GenerateConfigForTenantAsync(string tenantSlug, CancellationToken cancellationToken = default);
    }
}
