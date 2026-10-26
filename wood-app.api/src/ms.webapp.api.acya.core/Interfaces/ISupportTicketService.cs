using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface ISupportTicketService
    {
        Task<SupportTicketResponseDto> CreateTicketAsync(
            CreateSupportTicketDto dto,
            int userId,
            string userFullName,
            string userEmail,
            string enterpriseName,
            string tenantSlug,
            CancellationToken cancellationToken = default);
    }
}
