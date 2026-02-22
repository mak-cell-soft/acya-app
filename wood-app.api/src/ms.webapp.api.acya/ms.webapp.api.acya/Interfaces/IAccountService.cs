using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.api.Interfaces
{
    public interface IAccountService
    {
        Task AddLedgerEntryAsync(int counterpartId, string type, decimal amount, int? relatedId, string? description = null);
        Task<decimal> GetCurrentBalanceAsync(int counterpartId);
        Task<AccountStatementDto> GetStatementAsync(int counterpartId, DateTime startDate, DateTime endDate);
    }
}
