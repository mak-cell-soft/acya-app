using System.Threading;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IN8nEmailService
    {
        Task<bool> SendMobileAppInvitationAsync(
            string toEmail,
            string tenantName,
            string tenantSlug,
            string userName,
            string version,
            int buildNumber,
            string portalUrl,
            CancellationToken cancellationToken = default);
    }
}
