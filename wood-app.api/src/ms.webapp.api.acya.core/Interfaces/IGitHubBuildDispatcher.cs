using System.Threading;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IGitHubBuildDispatcher
    {
        Task<bool> DispatchBuildAsync(MobileBuildDto build, string? environment = null, CancellationToken cancellationToken = default);
    }
}
