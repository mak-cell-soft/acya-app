using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
    public class BankDepositRepository : CoreRepository<BankDeposit, WoodAppContext>
    {
        public BankDepositRepository(WoodAppContext context) : base(context)
        {
        }

        public async Task<IEnumerable<BankDeposit>> GetByBankIdAsync(int bankId)
        {
            return await context.BankDeposits
                .Include(d => d.SalesSite)
                .Where(d => d.BankId == bankId && !d.IsDeleted)
                .OrderByDescending(d => d.DepositDate)
                .ToListAsync();
        }

        public async Task<decimal> GetTotalNetsByBankAsync(int bankId)
        {
            return await context.BankDeposits
                .Where(d => d.BankId == bankId && !d.IsDeleted)
                .SumAsync(d => d.NetAmount);
        }
        
        public async Task<decimal> GetTotalFeesByBankAsync(int bankId)
        {
            return await context.BankDeposits
                .Where(d => d.BankId == bankId && !d.IsDeleted)
                .SumAsync(d => d.FeeWithTax);
        }

        public async Task<string?> GetLastReferenceAsync(string prefix)
        {
            var lastDeposit = await context.BankDeposits
                .Where(d => !d.IsDeleted && !string.IsNullOrEmpty(d.Reference) && d.Reference.StartsWith(prefix))
                .OrderByDescending(d => d.Id)
                .FirstOrDefaultAsync();
                
            return lastDeposit?.Reference;
        }
    }
}
