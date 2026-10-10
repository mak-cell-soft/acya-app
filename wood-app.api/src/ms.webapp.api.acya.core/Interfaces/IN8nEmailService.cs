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

        Task<EmailDispatchResult> SendPasswordResetEmailAsync(
            string toEmail,
            string resetUrl,
            string tenantSlug,
            string? tenantName = null,
            CancellationToken cancellationToken = default);

        Task<EmailDispatchResult> SendEmailAsync(
            string toEmail,
            string subject,
            string htmlBody,
            string? template = null,
            object? variables = null,
            string sender = "noreply",
            string replyTo = "support@acya.site",
            CancellationToken cancellationToken = default);
    }
}
