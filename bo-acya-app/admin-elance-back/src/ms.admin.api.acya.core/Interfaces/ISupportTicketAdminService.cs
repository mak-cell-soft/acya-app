using ms.admin.api.acya.core.DTOs;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.core.Interfaces
{
    public interface ISupportTicketAdminService
    {
        Task<SupportTicketPagedResultDto> GetTicketsAsync(
            SupportTicketFilterDto filter,
            CancellationToken cancellationToken = default);

        Task<SupportTicketDetailDto?> GetTicketDetailAsync(
            string tenantSlug,
            int ticketId,
            CancellationToken cancellationToken = default);

        Task<UpdateTicketStatusResponseDto?> UpdateTicketStatusAsync(
            string tenantSlug,
            int ticketId,
            string newStatus,
            CancellationToken cancellationToken = default);
    }
}
