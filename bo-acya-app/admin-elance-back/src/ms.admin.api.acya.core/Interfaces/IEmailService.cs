using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using System.Threading.Tasks;

namespace ms.admin.api.acya.core.Interfaces
{
    public interface IEmailService
    {
        Task<EmailLog> SendWelcomeEmailAsync(MasterEnterprise enterprise, string adminEmail, long? registrationId, string? correlationId);
        Task<bool> ProcessDeliveryEventAsync(NormalizedEmailEventDto eventDto);
    }
}
