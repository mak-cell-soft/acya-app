using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.common;
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
                .Include(p => p.PaymentInstrument)
                .FirstOrDefaultAsync(p => p.Id == paymentId && !p.IsDeleted);
        }

        public new async Task<IEnumerable<Payment>> GetAllAsync()
        {
            return await context.Payments
                .Include(p => p.PaymentInstrument)
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
                .Include(p => p.PaymentInstrument)
                .Where(p => !p.IsDeleted);

            if (!string.IsNullOrEmpty(searchDto.CounterpartType))
            {
                if (searchDto.CounterpartType.Equals("Customer", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(p => 
                        (p.DocumentId == null && p.Customer != null && p.Customer.Type != ms.webapp.api.acya.common.CounterPartType.Supplier) ||
                        (p.DocumentId != null && p.Document != null && (
                            p.Document.Type == ms.webapp.api.acya.common.DocumentTypes.customerInvoice || 
                            p.Document.Type == ms.webapp.api.acya.common.DocumentTypes.customerDeliveryNote || 
                            p.Document.Type == ms.webapp.api.acya.common.DocumentTypes.customerOrder || 
                            p.Document.Type == ms.webapp.api.acya.common.DocumentTypes.customerQuote ||
                            p.Document.Type == ms.webapp.api.acya.common.DocumentTypes.customerInvoiceReturn
                        ))
                    );
                }
                else if (searchDto.CounterpartType.Equals("Supplier", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(p => 
                        (p.DocumentId == null && p.Customer != null && p.Customer.Type != ms.webapp.api.acya.common.CounterPartType.Customer) ||
                        (p.DocumentId != null && p.Document != null && (
                            p.Document.Type == ms.webapp.api.acya.common.DocumentTypes.supplierInvoice || 
                            p.Document.Type == ms.webapp.api.acya.common.DocumentTypes.supplierReceipt || 
                            p.Document.Type == ms.webapp.api.acya.common.DocumentTypes.supplierOrder || 
                            p.Document.Type == ms.webapp.api.acya.common.DocumentTypes.supplierInvoiceReturn ||
                            p.Document.Type == ms.webapp.api.acya.common.DocumentTypes.supplierMerchandiseReturn
                        ))
                    );
                }
            }

            if (searchDto.FromDate.HasValue)
            {
                var fromDate = DateTime.SpecifyKind(searchDto.FromDate.Value.Date, DateTimeKind.Unspecified);
                query = query.Where(p => p.PaymentDate >= fromDate);
            }

            if (searchDto.ToDate.HasValue)
            {
                var toDateExclusive = DateTime.SpecifyKind(searchDto.ToDate.Value.Date.AddDays(1), DateTimeKind.Unspecified);
                query = query.Where(p => p.PaymentDate < toDateExclusive);
            }

            if (searchDto.CustomerId.HasValue)
                query = query.Where(p => p.CustomerId == searchDto.CustomerId.Value);

            if (searchDto.DocumentId.HasValue)
                query = query.Where(p => p.DocumentId == searchDto.DocumentId.Value);

            if (!string.IsNullOrWhiteSpace(searchDto.PaymentMethod) && !searchDto.PaymentMethod.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                var methodUpper = searchDto.PaymentMethod.Trim().ToUpper();
                if (methodUpper == "ESPECE" || methodUpper == "CASH")
                {
                    query = query.Where(p => p.PaymentMethod != null && (p.PaymentMethod.ToUpper() == "ESPECE" || p.PaymentMethod.ToUpper() == "CASH"));
                }
                else
                {
                    query = query.Where(p => p.PaymentMethod != null && p.PaymentMethod.ToUpper() == methodUpper);
                }
            }

            if (!string.IsNullOrWhiteSpace(searchDto.Search))
            {
                var searchTerm = searchDto.Search.Trim().ToLower();
                query = query.Where(p => 
                    (p.Customer != null && p.Customer.FirstName != null && p.Customer.FirstName.ToLower().Contains(searchTerm)) ||
                    (p.Customer != null && p.Customer.LastName != null && p.Customer.LastName.ToLower().Contains(searchTerm)) ||
                    (p.Customer != null && ((p.Customer.FirstName ?? "") + " " + (p.Customer.LastName ?? "")).ToLower().Contains(searchTerm)) ||
                    (p.Customer != null && ((p.Customer.LastName ?? "") + " " + (p.Customer.FirstName ?? "")).ToLower().Contains(searchTerm)) ||
                    (p.Customer != null && p.Customer.Name != null && p.Customer.Name.ToLower().Contains(searchTerm)) ||
                    (p.Reference != null && p.Reference.ToLower().Contains(searchTerm)) ||
                    (p.Notes != null && p.Notes.ToLower().Contains(searchTerm)) ||
                    (p.Document != null && p.Document.DocNumber != null && p.Document.DocNumber.ToLower().Contains(searchTerm)) ||
                    (p.Document != null && p.Document.SupplierReference != null && p.Document.SupplierReference.ToLower().Contains(searchTerm)) ||
                    (p.PaymentInstrument != null && p.PaymentInstrument.InstrumentNumber != null && p.PaymentInstrument.InstrumentNumber.ToLower().Contains(searchTerm)) ||
                    (p.PaymentInstrument != null && p.PaymentInstrument.Bank != null && p.PaymentInstrument.Bank.ToLower().Contains(searchTerm))
                );
            }

            if (!string.IsNullOrWhiteSpace(searchDto.Nature) && !searchDto.Nature.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                if (searchDto.Nature.Equals("RECOUVREMENT", StringComparison.OrdinalIgnoreCase))
                    query = query.Where(p => p.DocumentId == null);
                else if (searchDto.Nature.Equals("PAIEMENT_DOC", StringComparison.OrdinalIgnoreCase))
                    query = query.Where(p => p.DocumentId != null);
            }

            int pageNumber = searchDto.PageNumber < 1 ? 1 : searchDto.PageNumber;
            int pageSize = searchDto.PageSize < 1 ? 10 : searchDto.PageSize;

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(p => p.PaymentDate)
                .ThenByDescending(p => p.Id)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<Payment>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<IEnumerable<Payment>> GetByCustomerIdAsync(int customerId)
        {
            return await context.Payments
                .Include(p => p.Document)
                .Include(p => p.PaymentInstrument)
                .Where(p => p.CustomerId == customerId && !p.IsDeleted)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<Payment>> GetByDocumentIdAsync(int documentId)
        {
            return await context.Payments
                .Include(p => p.PaymentInstrument)
                .Where(p => p.DocumentId == documentId && !p.IsDeleted)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<Payment>> GetTraitesBySupplierIdAsync(int supplierId)
        {
            return await context.Payments
                .Include(p => p.Document)
                .Include(p => p.PaymentInstrument)
                .Where(p => p.CustomerId == supplierId && !p.IsDeleted && (p.PaymentMethod == "TRAITE" || p.PaymentMethod == "CHEQUE"))
                .OrderByDescending(p => p.PaymentInstrument!.DueDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<SupplierEcheanceDto>> GetEcheancesAsync(DateTime fromDate, DateTime toDate, string? side = "purchase")
        {
            var query = context.PaymentInstruments
                .Include(pi => pi.Payment)
                    .ThenInclude(p => p!.Customer)
                .Include(pi => pi.Payment)
                    .ThenInclude(p => p!.Document)
                .Where(pi => pi.DueDate >= fromDate && pi.DueDate <= toDate);

            if (side == "purchase")
            {
                query = query.Where(pi => pi.Payment != null && pi.Payment.Customer != null &&
                    (pi.Payment.Customer.Type == CounterPartType.Supplier || pi.Payment.Customer.Type == CounterPartType.Both));
            }
            else if (side == "sale")
            {
                query = query.Where(pi => pi.Payment != null && pi.Payment.Customer != null &&
                    (pi.Payment.Customer.Type == CounterPartType.Customer || pi.Payment.Customer.Type == CounterPartType.Both));
            }

            var traites = await query.ToListAsync();

            return traites
                .GroupBy(pi => pi.DueDate!.Value.Date)
                .Select(g => new SupplierEcheanceDto
                {
                    DueDate = g.Key,
                    TotalAmount = g.Sum(pi => pi.Payment?.Amount ?? 0),
                    InstrumentCount = g.Count(),
                    Details = g.Select(pi => new EcheanceDetailDto
                    {
                        PaymentId = pi.PaymentId,
                        DocumentId = pi.Payment?.DocumentId ?? 0,
                        DocumentNumber = pi.Payment?.Document?.DocNumber,
                        SupplierName = !string.IsNullOrEmpty(pi.Payment?.Customer?.Name) ? pi.Payment.Customer.Name : pi.Payment?.Customer?.Fullname,
                        InstrumentNumber = pi.InstrumentNumber,
                        Bank = pi.Bank,
                        Amount = pi.Payment?.Amount ?? 0,
                        DueDate = pi.DueDate ?? DateTime.MinValue,
                        IsPaidAtBank = pi.IsPaidAtBank
                    }).ToList()
                })
                .OrderBy(e => e.DueDate)
                .ToList();
        }

        public async Task<PaymentInstrument?> GetInstrumentByIdAsync(int instrumentId)
        {
            return await context.PaymentInstruments
                .FirstOrDefaultAsync(pi => pi.Id == instrumentId);
        }

        public async Task<bool> UpdateInstrumentAsync(PaymentInstrument instrument)
        {
            context.PaymentInstruments.Update(instrument);
            return await context.SaveChangesAsync() > 0;
        }

        public async Task<IEnumerable<PaymentInstrumentExtendedDto>> GetInstrumentsAsync(bool? isPaidOrVersed = null)
        {
            // Join PaymentInstruments with Payment, Document, Customer, and BankDeposits to get BordereauReference
            var query = context.PaymentInstruments
                .Include(pi => pi.Payment)
                    .ThenInclude(p => p!.Customer)
                .Include(pi => pi.Payment)
                    .ThenInclude(p => p!.Document)
                .Where(pi => pi.Type == "CHEQUE" || pi.Type == "TRAITE");

            // Assuming a BankDeposit links to the instrument
            var resultQuery = from pi in query
                              join bd in context.BankDeposits on pi.Id equals bd.PaymentInstrumentId into bdGroup
                              from bd in bdGroup.DefaultIfEmpty()
                              select new { pi, bd };

            if (isPaidOrVersed.HasValue)
            {
                if (isPaidOrVersed.Value)
                {
                    // Versed means it has a bank deposit or IsPaidAtBank is true, or BankSettlementStatus is VERSED
                    resultQuery = resultQuery.Where(x => x.bd != null || x.pi.IsPaidAtBank || x.pi.BankSettlementStatus == "VERSED");
                }
                else
                {
                    resultQuery = resultQuery.Where(x => x.bd == null && !x.pi.IsPaidAtBank && x.pi.BankSettlementStatus != "VERSED");
                }
            }

            var items = await resultQuery
                .OrderByDescending(x => x.pi.CreatedAt)
                .ToListAsync();

            return items.Select(x => new PaymentInstrumentExtendedDto
            {
                Id = x.pi.Id,
                PaymentId = x.pi.PaymentId,
                Type = x.pi.Type,
                InstrumentNumber = x.pi.InstrumentNumber,
                Bank = x.pi.Bank,
                Owner = x.pi.Owner,
                Porter = x.pi.Porter,
                IssueDate = x.pi.IssueDate,
                DueDate = x.pi.DueDate,
                ExpirationDate = x.pi.ExpirationDate,
                IsPaidAtBank = x.pi.IsPaidAtBank,
                PaidAtBankDate = x.pi.PaidAtBankDate,
                BankSettlementStatus = x.pi.BankSettlementStatus,
                Amount = x.pi.Payment?.Amount ?? 0,
                CustomerName = !string.IsNullOrEmpty(x.pi.Payment?.Customer?.Name) ? x.pi.Payment.Customer.Name : (x.pi.Payment?.Customer?.Fullname ?? x.pi.Payment?.Customer?.FirstName),
                DocumentNumber = x.pi.Payment?.Document?.DocNumber,
                BordereauReference = x.bd?.Reference,
                CounterPartType = x.pi.Payment?.Customer?.Type.ToString()
            }).ToList();
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
        public async Task<IEnumerable<DashboardPaymentDto>> GetDashboardPaymentsAsync(DateTime date, int salesSiteId, string? documentSide = null, bool monthOnly = false, DateTime? fromDate = null, DateTime? toDate = null)
        {
            int year = date.Year;
            int month = date.Month;
            int day = date.Day;

            var query = context.Payments
                .AsNoTracking()
                .Include(p => p.Customer)
                .Include(p => p.AppUser)
                .Include(p => p.PaymentInstrument)
                .Include(p => p.Document)
                    .ThenInclude(d => d!.CounterPart)
                .Include(p => p.Document)
                    .ThenInclude(d => d!.ChildDocuments)
                        .ThenInclude(cd => cd!.ChildDocument)
                .Include(p => p.Document)
                    .ThenInclude(d => d!.ParentDocuments)
                        .ThenInclude(pd => pd!.ParentDocument)
                .Where(p => !p.IsDeleted);

            if (fromDate.HasValue && toDate.HasValue)
            {
                var start = DateTime.SpecifyKind(fromDate.Value.Date, DateTimeKind.Unspecified);
                var endExclusive = DateTime.SpecifyKind(toDate.Value.Date.AddDays(1), DateTimeKind.Unspecified);
                query = query.Where(p => p.PaymentDate.HasValue &&
                                         p.PaymentDate.Value >= start &&
                                         p.PaymentDate.Value < endExclusive);
            }
            else if (monthOnly)
            {
                query = query.Where(p => p.PaymentDate.HasValue && 
                                         p.PaymentDate.Value.Year == year && 
                                         p.PaymentDate.Value.Month == month);
            }
            else
            {
                query = query.Where(p => p.PaymentDate.HasValue && 
                                         p.PaymentDate.Value.Year == year && 
                                         p.PaymentDate.Value.Month == month && 
                                         p.PaymentDate.Value.Day == day);
            }

            if (salesSiteId > 0)
            {
                query = query.Where(p => (p.Document != null && p.Document.SalesSiteId == salesSiteId) ||
                                         (p.Document == null && p.AppUser != null && p.AppUser.IdSalesSite == salesSiteId));
            }

            if (documentSide == "customer")
            {
                var customerDocTypes = new[] {
                    DocumentTypes.customerOrder,
                    DocumentTypes.customerDeliveryNote,
                    DocumentTypes.customerInvoice,
                    DocumentTypes.customerInvoiceReturn,
                    DocumentTypes.customerQuote
                };
                query = query.Where(p => (p.Document != null && p.Document.Type.HasValue && customerDocTypes.Contains(p.Document.Type.Value)) ||
                                         (p.Document == null && p.Customer != null && (p.Customer.Type == CounterPartType.Customer || p.Customer.Type == CounterPartType.Both)));
            }
            else if (documentSide == "supplier")
            {
                var supplierDocTypes = new[] {
                    DocumentTypes.supplierOrder,
                    DocumentTypes.supplierReceipt,
                    DocumentTypes.supplierInvoice,
                    DocumentTypes.supplierInvoiceReturn,
                    DocumentTypes.supplierMerchandiseReturn
                };
                query = query.Where(p => (p.Document != null && p.Document.Type.HasValue && supplierDocTypes.Contains(p.Document.Type.Value)) ||
                                         (p.Document == null && p.Customer != null && (p.Customer.Type == CounterPartType.Supplier || p.Customer.Type == CounterPartType.Both)));
            }

            var payments = await query
                .OrderByDescending(p => p.PaymentDate)
                .ThenByDescending(p => p.CreatedAt)
                .ThenByDescending(p => p.Id)
                .ToListAsync();

            var invoiceTypes = new[] {
                DocumentTypes.customerInvoice,
                DocumentTypes.supplierInvoice,
                DocumentTypes.customerInvoiceReturn,
                DocumentTypes.supplierInvoiceReturn
            };

            var deliveryOrReceiptTypes = new[] {
                DocumentTypes.customerDeliveryNote,
                DocumentTypes.supplierReceipt,
                DocumentTypes.customerOrder,
                DocumentTypes.supplierOrder,
                DocumentTypes.supplierMerchandiseReturn
            };

            return payments.Select(p =>
            {
                string? invoiceNumber = null;
                string? deliveryNoteNumber = null;

                if (p.Document != null)
                {
                    if (p.Document.Type.HasValue && invoiceTypes.Contains(p.Document.Type.Value))
                    {
                        invoiceNumber = p.Document.DocNumber;
                        var linkedChild = p.Document.ChildDocuments?
                            .Select(cd => cd.ChildDocument)
                            .FirstOrDefault(cd => cd != null && cd.Type.HasValue && deliveryOrReceiptTypes.Contains(cd.Type.Value));
                        var linkedParent = p.Document.ParentDocuments?
                            .Select(pd => pd.ParentDocument)
                            .FirstOrDefault(pd => pd != null && pd.Type.HasValue && deliveryOrReceiptTypes.Contains(pd.Type.Value));
                        deliveryNoteNumber = linkedChild?.DocNumber ?? linkedParent?.DocNumber;
                    }
                    else if (p.Document.Type.HasValue && deliveryOrReceiptTypes.Contains(p.Document.Type.Value))
                    {
                        deliveryNoteNumber = p.Document.DocNumber;
                        var linkedParentInv = p.Document.ParentDocuments?
                            .Select(pd => pd.ParentDocument)
                            .FirstOrDefault(pd => pd != null && pd.Type.HasValue && invoiceTypes.Contains(pd.Type.Value));
                        var linkedChildInv = p.Document.ChildDocuments?
                            .Select(cd => cd.ChildDocument)
                            .FirstOrDefault(cd => cd != null && cd.Type.HasValue && invoiceTypes.Contains(cd.Type.Value));
                        invoiceNumber = linkedParentInv?.DocNumber ?? linkedChildInv?.DocNumber;
                    }
                    else
                    {
                        invoiceNumber = p.Document.DocNumber;
                    }
                }

                string paymentStatus = "CONFIRMED";
                if (p.PaymentInstrument != null)
                {
                    if (p.PaymentInstrument.BankSettlementStatus == "BOUNCED")
                        paymentStatus = "BOUNCED";
                    else if (p.PaymentInstrument.IsPaidAtBank || p.PaymentInstrument.BankSettlementStatus == "CLEARED" || p.PaymentInstrument.BankSettlementStatus == "PAID_AT_BANK")
                        paymentStatus = "PAID";
                    else if (p.PaymentInstrument.BankSettlementStatus == "VERSED")
                        paymentStatus = "VERSED";
                    else
                        paymentStatus = "PENDING";
                }

                string customerName = !string.IsNullOrEmpty(p.Customer?.Name)
                    ? p.Customer.Name
                    : (p.Customer?.Fullname ?? p.Document?.CounterPart?.Fullname ?? "Inconnu");

                return new DashboardPaymentDto
                {
                    PaymentId = p.Id,
                    DocumentId = p.DocumentId,
                    CustomerId = p.CustomerId,
                    Amount = p.Amount ?? 0,
                    PaymentDate = p.PaymentDate ?? DateTime.MinValue,
                    PaymentMethod = p.PaymentMethod,
                    Reference = p.Reference,
                    Notes = p.Notes,
                    CustomerName = customerName,
                    InvoiceNumber = invoiceNumber,
                    SupplierReference = p.Document?.SupplierReference,
                    DeliveryNoteNumber = deliveryNoteNumber,
                    CreatedAt = p.CreatedAt ?? DateTime.MinValue,
                    DueDate = p.PaymentInstrument?.DueDate,
                    InstrumentNumber = p.PaymentInstrument?.InstrumentNumber,
                    BankName = p.PaymentInstrument?.Bank,
                    BankSettlementStatus = p.PaymentInstrument?.BankSettlementStatus,
                    IsPaidAtBank = p.PaymentInstrument?.IsPaidAtBank ?? false,
                    PaymentStatus = paymentStatus
                };
            }).ToList();
        }
    }
}
