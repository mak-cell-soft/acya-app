using System.Threading;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.DTOs.Inbound;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IQuoteRequestService
    {
        /// <summary>
        /// Durably stages an inbound quote request, alerts sales staff via SignalR/In-App,
        /// and initiates independent atomic email dispatches.
        /// </summary>
        Task<InboundQuoteResponseDto> ProcessQuoteRequestAsync(InboundQuoteRequestDto dto, CancellationToken cancellationToken = default);

        /// <summary>
        /// Background recovery pass: finds abandoned leases or retryable failed/pending email slots
        /// and attempts atomic re-claims and dispatches.
        /// </summary>
        Task RetryPendingQuoteEmailsAsync(CancellationToken cancellationToken = default);
    }
}
