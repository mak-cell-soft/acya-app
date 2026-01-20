using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
    public class PaymentRepository : CoreRepository<Payment, WoodAppContext>, IPaymentRepository
    {
        public PaymentRepository(WoodAppContext context) : base(context)
        {
        }

        public async Task<Payment?> GetByIdAsync(int paymentId)
        {
            return await context.Payments
                .Include(p => p.Document)
                .Include(p => p.Customer)
                .Include(p => p.AppUser)
                .FirstOrDefaultAsync(p => p.Id == paymentId && !p.IsDeleted);
        }

        public async Task<IEnumerable<Payment>> GetAllAsync()
        {
            return await context.Payments
                .Where(p => !p.IsDeleted)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<PagedResult<Payment>> SearchAsync(PaymentSearchDto searchDto)
        {
            var query = context.Payments
                .Include(p => p.Document)
                .Include(p => p.Customer)
                .Include(p => p.AppUser)
                .Where(p => !p.IsDeleted);

            if (searchDto.FromDate.HasValue)
                query = query.Where(p => p.PaymentDate >= searchDto.FromDate.Value);

            if (searchDto.ToDate.HasValue)
                query = query.Where(p => p.PaymentDate <= searchDto.ToDate.Value);

            if (searchDto.CustomerId.HasValue)
                query = query.Where(p => p.CustomerId == searchDto.CustomerId.Value);

            if (searchDto.DocumentId.HasValue)
                query = query.Where(p => p.DocumentId == searchDto.DocumentId.Value);

            if (!string.IsNullOrEmpty(searchDto.PaymentMethod))
                query = query.Where(p => p.PaymentMethod == searchDto.PaymentMethod);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(p => p.PaymentDate)
                .Skip((searchDto.PageNumber - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            return new PagedResult<Payment>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = searchDto.PageNumber,
                PageSize = searchDto.PageSize
            };
        }

        public async Task<IEnumerable<Payment>> GetByCustomerIdAsync(int customerId)
        {
            return await context.Payments
                .Include(p => p.Document)
                .Where(p => p.CustomerId == customerId && !p.IsDeleted)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<Payment>> GetByDocumentIdAsync(int documentId)
        {
            return await context.Payments
                .Where(p => p.DocumentId == documentId && !p.IsDeleted)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();
        }

        public async Task<decimal> GetTotalByDocumentIdAsync(int documentId)
        {
            // Handle null amount summing if needed, though schema says decimal(10,4)
            return await context.Payments
                .Where(p => p.DocumentId == documentId && !p.IsDeleted)
                .SumAsync(p => p.Amount ?? 0);
        }

        public async Task<bool> ExistsAsync(int paymentId)
        {
            return await context.Payments
                .AnyAsync(p => p.Id == paymentId && !p.IsDeleted);
        }

        public async Task<bool> DeleteAsync(int paymentId)
        {
            var payment = await context.Payments.FindAsync(paymentId);
            if (payment == null) return false;

            payment.IsDeleted = true;
            payment.UpdatedAt = DateTime.UtcNow;
            
            context.Payments.Update(payment);
            return await context.SaveChangesAsync() > 0;
        }
    }
}
