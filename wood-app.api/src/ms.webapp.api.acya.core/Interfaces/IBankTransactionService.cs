using System.Collections.Generic;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IBankTransactionService
    {
        Task<BankStatementResponseDto> GetStatementAsync(int bankId, int year, int month);
        Task<BankTransactionDto> CreateTransactionAsync(BankTransactionDto dto);
        Task<BankTransactionDto> UpdateTransactionAsync(BankTransactionDto dto);
        Task<bool> DeleteTransactionAsync(int id);
    }
}
