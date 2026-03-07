using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.api.Interfaces
{
    public interface IBalanceService
    {
        Task UpdateCustomerBalanceAsync(int customerId, string lastTxType, DateTime txDate);
        Task UpdateSupplierBalanceAsync(int supplierId, string lastTxType, DateTime txDate);
        Task RefreshAllBalancesAsync();
        Task<IEnumerable<BalanceEntryDto>> GetCustomerBalancesAsync();
        Task<IEnumerable<BalanceEntryDto>> GetSupplierBalancesAsync();
    }
}
