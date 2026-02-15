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
        public async Task<IEnumerable<DashboardPaymentDto>> GetDashboardPaymentsAsync(DateTime date, int salesSiteId)
        {
            var dateOnly = date.Date;

            return await context.Payments
                .Include(p => p.Customer)
                .Include(p => p.Document)
                    .ThenInclude(d => d.ChildDocuments)
                        .ThenInclude(cd => cd.ChildDocument)
                .Include(p => p.Document)
                    .ThenInclude(d => d.ParentDocuments)
                        .ThenInclude(pd => pd.ParentDocument)
                .Where(p => !p.IsDeleted)
                .Where(p => p.PaymentDate.HasValue && p.PaymentDate.Value.Date == dateOnly)
                .Where(p => p.Document.SalesSiteId == salesSiteId)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new DashboardPaymentDto
                {
                    PaymentId = p.Id,
                    Amount = p.Amount ?? 0,
                    PaymentDate = p.PaymentDate ?? DateTime.MinValue,
                    PaymentMethod = p.PaymentMethod,
                    Reference = p.Reference,
                    Notes = p.Notes,
                    CustomerName = p.Customer.Fullname,
                    InvoiceNumber = p.Document.Type == DocumentTypes.customerInvoice 
                        ? p.Document.DocNumber 
                        : (p.Document.ChildDocuments.FirstOrDefault(cd => cd.ChildDocument.Type == DocumentTypes.customerInvoice) != null 
                            ? p.Document.ChildDocuments.FirstOrDefault(cd => cd.ChildDocument.Type == DocumentTypes.customerInvoice).ChildDocument.DocNumber 
                            : null),
                    DeliveryNoteNumber = p.Document.Type == DocumentTypes.customerDeliveryNote 
                        ? p.Document.DocNumber 
                        : (p.Document.ParentDocuments.FirstOrDefault(pd => pd.ParentDocument.Type == DocumentTypes.customerDeliveryNote) != null 
                            ? p.Document.ParentDocuments.FirstOrDefault(pd => pd.ParentDocument.Type == DocumentTypes.customerDeliveryNote).ParentDocument.DocNumber 
                            : null),
                    CreatedAt = p.CreatedAt ?? DateTime.MinValue
                })
                .ToListAsync();
        }
    }
}
