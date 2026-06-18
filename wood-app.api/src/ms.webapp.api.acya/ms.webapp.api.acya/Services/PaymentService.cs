using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly IPaymentRepository _paymentRepository;
        private readonly DocumentRepository _documentRepository;
        private readonly CounterPartRepository _customerRepository;
        private readonly AppUserRepository _appUserRepository; // Added to fetch user name
        private readonly IAccountService _accountService;
        private readonly IBalanceService _balanceService;
        private readonly WoodAppContext _context;

        public PaymentService(
            IPaymentRepository paymentRepository,
            DocumentRepository documentRepository,
            CounterPartRepository customerRepository,
            AppUserRepository appUserRepository,
            IAccountService accountService,
            IBalanceService balanceService,
            WoodAppContext context)
        {
            _paymentRepository = paymentRepository;
            _documentRepository = documentRepository;
            _customerRepository = customerRepository;
            _appUserRepository = appUserRepository;
            _accountService = accountService;
            _balanceService = balanceService;
            _context = context;
        }

        public async Task<PaymentDto> GetByIdAsync(int paymentId)
        {
            var payment = await _paymentRepository.GetByIdAsync(paymentId);
            if (payment == null) return null!;

            return MapToDto(payment);
        }

        public async Task<PagedResult<PaymentDto>> SearchAsync(PaymentSearchDto searchDto)
        {
            var result = await _paymentRepository.SearchAsync(searchDto);
            
            return new PagedResult<PaymentDto>
            {
                Items = result.Items.Select(MapToDto).ToList(),
                TotalCount = result.TotalCount,
                PageNumber = result.PageNumber,
                PageSize = result.PageSize
            };
        }

        public async Task<IEnumerable<PaymentDto>> GetByCustomerIdAsync(int customerId)
        {
            var payments = await _paymentRepository.GetByCustomerIdAsync(customerId);
            return payments.Select(MapToDto);
        }

        public async Task<IEnumerable<PaymentDto>> GetBySupplierIdAsync(int supplierId)
        {
            var payments = await _paymentRepository.GetByCustomerIdAsync(supplierId);
            return payments.Select(MapToDto);
        }

        public async Task<IEnumerable<PaymentDto>> GetTraitesBySupplierIdAsync(int supplierId)
        {
            var payments = await _paymentRepository.GetTraitesBySupplierIdAsync(supplierId);
            return payments.Select(MapToDto);
        }

        public async Task<IEnumerable<SupplierEcheanceDto>> GetEcheancesAsync(DateTime fromDate, DateTime toDate)
        {
            return await _paymentRepository.GetEcheancesAsync(fromDate, toDate);
        }

        public async Task<bool> MarkTraiteAsPaidAsync(int instrumentId, MarkTraitePaidDto markPaidDto)
        {
            var instrument = await _paymentRepository.GetInstrumentByIdAsync(instrumentId);
            if (instrument == null) return false;

            instrument.IsPaidAtBank = true;
            instrument.PaidAtBankDate = markPaidDto.PaidAtBankDate;
            instrument.BankSettlementStatus = "PAID_AT_BANK";
            instrument.Notes = string.IsNullOrEmpty(instrument.Notes) 
                ? markPaidDto.Notes 
                : $"{instrument.Notes}\n{markPaidDto.Notes}";
            instrument.UpdatedAt = DateTime.UtcNow;

            return await _paymentRepository.UpdateInstrumentAsync(instrument);
        }

        public async Task<IEnumerable<PaymentDto>> GetByDocumentIdAsync(int documentId)
        {
            var payments = await _paymentRepository.GetByDocumentIdAsync(documentId);
            return payments.Select(MapToDto);
        }

        public async Task<PaymentDto> CreateAsync(CreatePaymentDto createDto, int createdById)
        {
            if (createDto.Amount <= 0)
                throw new ArgumentException("Payment amount must be greater than zero.");

            // Validate Customer
            var customer = await _customerRepository.Get(createDto.CustomerId);
            if (customer == null || customer.IsDeleted == true)
                throw new ArgumentException("Invalid or deleted customer.");

            // Validate Document
            var document = await _documentRepository.GetWithRelationshipsAsync(createDto.DocumentId);
            if (document == null || document.IsDeleted)
                throw new ArgumentException("Invalid or deleted document.");

            // Validate Document total
            var totalPaid = Math.Round(await _paymentRepository.GetTotalByDocumentIdAsync(createDto.DocumentId), 3, MidpointRounding.AwayFromZero);
            decimal rsValue = (document.WithHoldingTax && document.HoldingTaxes != null) ? Math.Round((decimal)document.HoldingTaxes.TaxValue, 3, MidpointRounding.AwayFromZero) : 0;
            var totalCreditNotes = (decimal)document.TotalCreditNotes;
            var remainingBalance = Math.Round((decimal)document.TotalCostNetTTCDoc - rsValue - totalPaid - totalCreditNotes, 3, MidpointRounding.AwayFromZero);
            var paymentAmount = Math.Round(createDto.Amount, 3, MidpointRounding.AwayFromZero);

            if (paymentAmount > remainingBalance)
                throw new ArgumentException($"Payment amount ({paymentAmount}) exceeds remaining balance ({remainingBalance}).");

            // Fetch generic user name if needed or let DB handle UpdatedById relation
            var user = await _appUserRepository.Get(createdById);
            string createdByName = user != null ? user.Login! : "Unknown";

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    var payment = new Payment
                    {
                        DocumentId = createDto.DocumentId,
                        CustomerId = createDto.CustomerId,
                        PaymentDate = createDto.PaymentDate,
                        Amount = paymentAmount,
                        PaymentMethod = createDto.PaymentMethod,
                        Reference = createDto.Reference,
                        Notes = createDto.Notes,
                        
                        // New logic: UpdatedById is the FK, CreatedBy is text
                        UpdatedById = createdById,
                        CreatedBy = createdByName, 
                        CreatedAt = DateTime.UtcNow,
                        IsDeleted = false
                    };

                    if ((createDto.PaymentMethod == "TRAITE" || createDto.PaymentMethod == "CHEQUE") && createDto.InstrumentDetails != null)
                    {
                        payment.PaymentInstrument = new PaymentInstrument
                        {
                            InstrumentNumber = createDto.InstrumentDetails.InstrumentNumber,
                            Type = createDto.PaymentMethod,
                            Bank = createDto.InstrumentDetails.Bank,
                            Owner = createDto.InstrumentDetails.Owner,
                            Porter = createDto.InstrumentDetails.Porter,
                            IssueDate = createDto.InstrumentDetails.IssueDate ?? createDto.PaymentDate,
                            DueDate = createDto.InstrumentDetails.DueDate,
                            ExpirationDate = createDto.InstrumentDetails.ExpirationDate,
                            CreatedAt = DateTime.UtcNow,
                            CreatedBy = createdByName
                        };
                    }

                    var createdPayment = await _paymentRepository.Add(payment);

                    // Automate Caisse Movement for CASH/ESPECE
                    if ((createDto.PaymentMethod?.ToUpper() == "CASH" || createDto.PaymentMethod?.ToUpper() == "ESPECE"))
                    {
                        var caisseMovement = new CaisseMovement
                        {
                            SalesSiteId = document.SalesSiteId,
                            MovementDate = DateTime.UtcNow,
                            Type = "ENTREE",
                            Reason = "ENCAISSEMENT",
                            Amount = paymentAmount,
                            Reference = document.DocNumber,
                            Notes = $"Encaissement automatique pour la facture {document.DocNumber}",
                            PaymentId = createdPayment.Id,
                            CreatedByUserId = createdById,
                            CreatedAt = DateTime.UtcNow,
                            IsDeleted = false
                        };
                        await _context.CaisseMovements.AddAsync(caisseMovement);
                    }

                    // Update document billing status
                    if (paymentAmount < remainingBalance) {
                        document.BillingStatus = (BillingStatus)3; 
                    } else {
                        document.BillingStatus = (BillingStatus)2; 
                    }
                    await _documentRepository.Update(document);
                    
                    // Integrate Ledger Entry
                    bool isSupplier = IsSupplierDocument(document.Type);
                    await _accountService.AddLedgerEntryAsync(
                        createDto.CustomerId, 
                        "Payment", 
                        paymentAmount, 
                        createdPayment.Id, 
                        $"Paiement ({createDto.PaymentMethod}) - document {document.DocNumber}",
                        isSupplier);

                    // Sync Account Ledger for converted delivery notes if applicable
                    await _accountService.SyncLedgerForInvoiceAsync(document);
                                
                    await transaction.CommitAsync();

                    // Update persistent balance after transaction success
                    await UpdateBalanceByDocumentTypeAsync(document.Type?.ToString(), createDto.CustomerId, "payment", DateTime.UtcNow);

                    createdPayment.Document = document;
                    createdPayment.Customer = customer; 
                    createdPayment.AppUser = user;
                    
                    return MapToDto(createdPayment);
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
        }

        public async Task<PaymentDto> UpdateAsync(UpdatePaymentDto updateDto, int updatedById)
        {
             if (updateDto.Amount <= 0)
                throw new ArgumentException("Payment amount must be greater than zero.");

            var payment = await _paymentRepository.GetByIdAsync(updateDto.PaymentId);
            if (payment == null)
                throw new KeyNotFoundException("Payment not found.");

            if (payment.Amount != updateDto.Amount && payment.DocumentId.HasValue)
            {
                var totalPaid = Math.Round(await _paymentRepository.GetTotalByDocumentIdAsync(payment.DocumentId.Value), 3, MidpointRounding.AwayFromZero);
                var totalPaidExcludingThis = totalPaid - Math.Round((payment.Amount ?? 0), 3, MidpointRounding.AwayFromZero);
                
                var document = await _documentRepository.Get(payment.DocumentId.Value);
                if (document != null) {
                    var rsValue = (document.WithHoldingTax && document.HoldingTaxes != null) ? Math.Round((decimal)document.HoldingTaxes.TaxValue, 3, MidpointRounding.AwayFromZero) : 0;
                    var totalCreditNotes = (decimal)document.TotalCreditNotes;
                    var remainingBalance = Math.Round((decimal)document.TotalCostNetTTCDoc - rsValue - totalPaidExcludingThis - totalCreditNotes, 3, MidpointRounding.AwayFromZero);
                    var updateAmount = Math.Round(updateDto.Amount ?? 0, 3, MidpointRounding.AwayFromZero);

                    if (updateAmount > remainingBalance)
                        throw new ArgumentException($"New payment amount ({updateAmount}) exceeds remaining balance ({remainingBalance}).");
                }
            }

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    payment.PaymentDate = updateDto.PaymentDate;
                    payment.Amount = updateDto.Amount;
                    payment.PaymentMethod = updateDto.PaymentMethod;
                    payment.Reference = updateDto.Reference;
                    payment.Notes = updateDto.Notes;
                    
                    payment.UpdatedById = updatedById; 
                    payment.UpdatedAt = DateTime.UtcNow;

                    // Update Instrument if provided
                    if (updateDto.InstrumentDetails != null)
                    {
                        if (payment.PaymentInstrument != null)
                        {
                            payment.PaymentInstrument.InstrumentNumber = updateDto.InstrumentDetails.InstrumentNumber;
                            payment.PaymentInstrument.Bank = updateDto.InstrumentDetails.Bank;
                            payment.PaymentInstrument.Owner = updateDto.InstrumentDetails.Owner;
                            payment.PaymentInstrument.Porter = updateDto.InstrumentDetails.Porter;
                            payment.PaymentInstrument.IssueDate = updateDto.InstrumentDetails.IssueDate ?? payment.PaymentDate;
                            payment.PaymentInstrument.DueDate = updateDto.InstrumentDetails.DueDate;
                            payment.PaymentInstrument.ExpirationDate = updateDto.InstrumentDetails.ExpirationDate;
                            payment.PaymentInstrument.UpdatedAt = DateTime.UtcNow;
                        }
                        else if (updateDto.PaymentMethod == "TRAITE" || updateDto.PaymentMethod == "CHEQUE")
                        {
                            payment.PaymentInstrument = new PaymentInstrument
                            {
                                PaymentId = payment.Id,
                                InstrumentNumber = updateDto.InstrumentDetails.InstrumentNumber,
                                Type = updateDto.PaymentMethod,
                                Bank = updateDto.InstrumentDetails.Bank,
                                Owner = updateDto.InstrumentDetails.Owner,
                                Porter = updateDto.InstrumentDetails.Porter,
                                IssueDate = updateDto.InstrumentDetails.IssueDate ?? payment.PaymentDate,
                                DueDate = updateDto.InstrumentDetails.DueDate,
                                ExpirationDate = updateDto.InstrumentDetails.ExpirationDate,
                                CreatedAt = DateTime.UtcNow,
                                CreatedBy = payment.CreatedBy
                            };
                        }
                    }

                    var updatedPayment = await _paymentRepository.Update(payment);
                    
                    // Sync Ledger Entry
                    Document? document = null;
                    if (payment.DocumentId.HasValue)
                        document = await _documentRepository.Get(payment.DocumentId.Value);
                        
                    bool isSupplier = IsSupplierDocument(document?.Type);

                    await _accountService.DeleteLedgerEntryAsync(payment.Id, "Payment");
                    await _accountService.AddLedgerEntryAsync(
                        payment.CustomerId, 
                        "Payment", 
                        updateDto.Amount ?? 0, 
                        payment.Id, 
                        $"Paiement ({payment.PaymentMethod}) - document {(document?.DocNumber ?? "Général")}",
                        isSupplier);

                    await transaction.CommitAsync();

                    // Update persistent balance
                    if (document != null)
                    {
                        await UpdateBalanceByDocumentTypeAsync(document.Type?.ToString(), payment.CustomerId, "payment", DateTime.UtcNow);
                    }
                    else
                    {
                        await _balanceService.UpdateCustomerBalanceAsync(payment.CustomerId, "payment", DateTime.UtcNow);
                    }

                    return MapToDto(updatedPayment);
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
        }

        public async Task<bool> DeleteAsync(int paymentId, int deletedById)
        {
            var payment = await _paymentRepository.GetByIdAsync(paymentId);
            if (payment == null) return false;

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    payment.UpdatedById = deletedById;
                    var result = await _paymentRepository.DeleteAsync(paymentId);
                    if (result)
                    {
                        // Delete linked CaisseMovement
                        var caisseMovement = await _context.CaisseMovements.FirstOrDefaultAsync(m => m.PaymentId == paymentId);
                        if (caisseMovement != null)
                        {
                            caisseMovement.IsDeleted = true;
                            caisseMovement.UpdatedAt = DateTime.UtcNow;
                            _context.CaisseMovements.Update(caisseMovement);
                        }

                        // Delete Ledger Entry
                        await _accountService.DeleteLedgerEntryAsync(paymentId, "Payment");

                        await transaction.CommitAsync();

                        // Update persistent balance
                        if (payment.Document != null)
                        {
                            await UpdateBalanceByDocumentTypeAsync(payment.Document.Type?.ToString(), payment.CustomerId, "payment", DateTime.UtcNow);
                        }
                        else if (payment.DocumentId.HasValue)
                        {
                            var document = await _documentRepository.Get(payment.DocumentId.Value);
                            if (document != null)
                                await UpdateBalanceByDocumentTypeAsync(document.Type?.ToString(), payment.CustomerId, "payment", DateTime.UtcNow);
                            else
                                await _balanceService.UpdateCustomerBalanceAsync(payment.CustomerId, "payment", DateTime.UtcNow);
                        }
                        else
                        {
                            await _balanceService.UpdateCustomerBalanceAsync(payment.CustomerId, "payment", DateTime.UtcNow);
                        }
                    }
                    return result;
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
        }

        public async Task<bool> LinkPaymentToInvoiceAsync(int paymentId, int newInvoiceId)
        {
            var payment = await _paymentRepository.GetByIdAsync(paymentId);
            if (payment == null || payment.IsDeleted)
                return false;

            var document = await _documentRepository.GetWithRelationshipsAsync(newInvoiceId);
            if (document == null || document.IsDeleted)
                return false;

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    // Swap the document reference from delivery note → new invoice
                    payment.DocumentId = newInvoiceId;
                    payment.UpdatedAt  = DateTime.UtcNow;

                    await _paymentRepository.Update(payment);

                    // Sync Account Ledger for converted delivery notes if applicable
                    await _accountService.SyncLedgerForInvoiceAsync(document);

                    await transaction.CommitAsync();

                    // Update persistent balance
                    await UpdateBalanceByDocumentTypeAsync(document.Type?.ToString(), payment.CustomerId, "payment", DateTime.UtcNow);

                    return true;
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    return false;
                }
            }
        }


        public async Task<IEnumerable<DashboardPaymentDto>> GetDashboardPaymentsAsync(DateTime date, int userId, string? documentSide = null)
        {
            var user = await _appUserRepository.Get(userId);
            if (user == null || !user.IdSalesSite.HasValue)
                return new List<DashboardPaymentDto>();

            return await _paymentRepository.GetDashboardPaymentsAsync(date, user.IdSalesSite.Value, documentSide);
        }

        private PaymentDto MapToDto(Payment payment)
        {
            return new PaymentDto
            {
                PaymentId = payment.Id,
                DocumentId = payment.DocumentId,
                DocumentNumber = payment.Document?.DocNumber,
                CustomerId = payment.CustomerId,
                CustomerName = payment.Customer?.Fullname,
                PaymentDate = payment.PaymentDate ?? DateTime.MinValue,
                Amount = payment.Amount ?? 0,
                PaymentMethod = payment.PaymentMethod,
                Reference = payment.Reference,
                Notes = payment.Notes,
                CreatedAt = payment.CreatedAt ?? DateTime.MinValue,
                CreatedBy = payment.CreatedBy,
                Nature = payment.DocumentId.HasValue ? "PAIEMENT_DOC" : "RECOUVREMENT",
                Instrument = payment.PaymentInstrument != null ? new PaymentInstrumentDto
                {
                    Id = payment.PaymentInstrument.Id,
                    PaymentId = payment.PaymentInstrument.PaymentId,
                    Type = payment.PaymentInstrument.Type,
                    InstrumentNumber = payment.PaymentInstrument.InstrumentNumber,
                    Bank = payment.PaymentInstrument.Bank,
                    Owner = payment.PaymentInstrument.Owner,
                    Porter = payment.PaymentInstrument.Porter,
                    IssueDate = payment.PaymentInstrument.IssueDate,
                    DueDate = payment.PaymentInstrument.DueDate,
                    ExpirationDate = payment.PaymentInstrument.ExpirationDate,
                    IsPaidAtBank = payment.PaymentInstrument.IsPaidAtBank,
                    PaidAtBankDate = payment.PaymentInstrument.PaidAtBankDate,
                    BankSettlementStatus = payment.PaymentInstrument.BankSettlementStatus
                } : null
            };
        }

        private async Task UpdateBalanceByDocumentTypeAsync(string? docType, int counterpartId, string lastTxType, DateTime txDate)
        {
            bool isSupplier = docType == DocumentTypes.supplierInvoice.ToString() || 
                             docType == DocumentTypes.supplierReceipt.ToString() || 
                             docType == DocumentTypes.supplierInvoiceReturn.ToString();

            if (isSupplier)
            {
                await _balanceService.UpdateSupplierBalanceAsync(counterpartId, lastTxType, txDate);
            }
            else
            {
                await _balanceService.UpdateCustomerBalanceAsync(counterpartId, lastTxType, txDate);
            }
        }

        private bool IsSupplierDocument(DocumentTypes? type)
        {
            if (type == null) return false;
            return type == DocumentTypes.supplierInvoice || 
                   type == DocumentTypes.supplierReceipt || 
                   type == DocumentTypes.supplierInvoiceReturn;
        }

        public async Task<CustomerRecouvrementDto> GetCustomerRecouvrementAsync(int customerId)
        {
            var customer = await _customerRepository.Get(customerId);
            if (customer == null || customer.IsDeleted == true)
                throw new ArgumentException("Customer not found.");

            var currentBalance = await _accountService.GetCurrentBalanceAsync(customerId);

            // Fetch unpaid customer invoices or delivery notes
            var unpaidDocs = await _context.Documents
                .Include(d => d.Payments)
                .Include(d => d.HoldingTaxes)
                .Where(d => d.CounterPartId == customerId && !d.IsDeleted &&
                            (d.Type == DocumentTypes.customerInvoice || d.Type == DocumentTypes.customerDeliveryNote) &&
                            d.BillingStatus != (BillingStatus)2) // 2 means fully paid
                .OrderBy(d => d.CreationDate)
                .ToListAsync();

            var unpaidList = new List<UnpaidInvoiceSummaryDto>();
            decimal totalUnpaid = 0;

            foreach (var doc in unpaidDocs)
            {
                var totalPaid = Math.Round((decimal)(doc.Payments?.Where(p => p.IsDeleted != true).Sum(p => p.Amount) ?? 0), 3, MidpointRounding.AwayFromZero);
                var rsValue = (doc.WithHoldingTax && doc.HoldingTaxes != null) ? Math.Round((decimal)doc.HoldingTaxes.TaxValue, 3, MidpointRounding.AwayFromZero) : 0;
                var totalCreditNotes = Math.Round((decimal)doc.TotalCreditNotes, 3, MidpointRounding.AwayFromZero);
                
                var totalDoc = Math.Round((decimal)doc.TotalCostNetTTCDoc, 3, MidpointRounding.AwayFromZero);
                var remaining = totalDoc - rsValue - totalPaid - totalCreditNotes;

                if (remaining > 0)
                {
                    unpaidList.Add(new UnpaidInvoiceSummaryDto
                    {
                        DocumentId = doc.Id,
                        DocumentNumber = doc.DocNumber ?? string.Empty,
                        CreationDate = doc.CreationDate ?? DateTime.MinValue,
                        TotalAmount = totalDoc,
                        TotalPaid = totalPaid,
                        Remaining = remaining
                    });
                    totalUnpaid += remaining;
                }
            }

            return new CustomerRecouvrementDto
            {
                CustomerId = customerId,
                CustomerName = customer.Fullname ?? customer.Name ?? "Inconnu",
                CurrentBalance = currentBalance,
                TotalUnpaid = totalUnpaid,
                UnpaidInvoices = unpaidList
            };
        }

        public async Task<PaymentDto> CreateRecouvrementPaymentAsync(CreateRecouvrementDto createDto, int createdById)
        {
            if (createDto.Amount <= 0)
                throw new ArgumentException("Payment amount must be greater than zero.");

            var customer = await _customerRepository.Get(createDto.CustomerId);
            if (customer == null || customer.IsDeleted == true)
                throw new ArgumentException("Invalid or deleted customer.");

            var user = await _appUserRepository.Get(createdById);
            string createdByName = user != null ? user.Login! : "Unknown";

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    var paymentAmount = Math.Round(createDto.Amount, 3, MidpointRounding.AwayFromZero);

                    var payment = new Payment
                    {
                        DocumentId = createDto.DocumentId, // nullable
                        CustomerId = createDto.CustomerId,
                        PaymentDate = createDto.PaymentDate,
                        Amount = paymentAmount,
                        PaymentMethod = createDto.PaymentMethod,
                        Reference = createDto.Reference,
                        Notes = createDto.Notes,
                        UpdatedById = createdById,
                        CreatedBy = createdByName, 
                        CreatedAt = DateTime.UtcNow,
                        IsDeleted = false
                    };

                    if ((createDto.PaymentMethod == "TRAITE" || createDto.PaymentMethod == "CHEQUE") && createDto.InstrumentDetails != null)
                    {
                        payment.PaymentInstrument = new PaymentInstrument
                        {
                            InstrumentNumber = createDto.InstrumentDetails.InstrumentNumber,
                            Type = createDto.PaymentMethod,
                            Bank = createDto.InstrumentDetails.Bank,
                            Owner = createDto.InstrumentDetails.Owner,
                            Porter = createDto.InstrumentDetails.Porter,
                            IssueDate = createDto.InstrumentDetails.IssueDate ?? createDto.PaymentDate,
                            DueDate = createDto.InstrumentDetails.DueDate,
                            ExpirationDate = createDto.InstrumentDetails.ExpirationDate,
                            CreatedAt = DateTime.UtcNow,
                            CreatedBy = createdByName
                        };
                    }

                    var createdPayment = await _paymentRepository.Add(payment);

                    // Automate Caisse Movement for CASH/ESPECE
                    if ((createDto.PaymentMethod?.ToUpper() == "CASH" || createDto.PaymentMethod?.ToUpper() == "ESPECE") && user?.IdSalesSite != null)
                    {
                        int targetSalesSiteId = user.IdSalesSite.Value;
                        if (createDto.DocumentId.HasValue) 
                        {
                            var targetDoc = await _documentRepository.Get(createDto.DocumentId.Value);
                            if (targetDoc != null) {
                                targetSalesSiteId = targetDoc.SalesSiteId;
                            }
                        }

                        var caisseMovement = new CaisseMovement
                        {
                            SalesSiteId = targetSalesSiteId,
                            MovementDate = DateTime.UtcNow,
                            Type = "ENTREE",
                            Reason = "RECOUVREMENT",
                            Amount = paymentAmount,
                            Reference = "Recouvrement Client",
                            Notes = $"Encaissement recouvrement",
                            PaymentId = createdPayment.Id,
                            CreatedByUserId = createdById,
                            CreatedAt = DateTime.UtcNow,
                            IsDeleted = false
                        };
                        await _context.CaisseMovements.AddAsync(caisseMovement);
                    }

                    // Integrate Ledger Entry
                    await _accountService.AddLedgerEntryAsync(
                        createDto.CustomerId, 
                        "Payment", 
                        paymentAmount, 
                        createdPayment.Id, 
                        $"Recouvrement ({createDto.PaymentMethod})",
                        false);

                    // If a specific document was selected, update its billing status
                    if (createDto.DocumentId.HasValue)
                    {
                        var document = await _documentRepository.GetWithRelationshipsAsync(createDto.DocumentId.Value);
                        if (document != null && !document.IsDeleted)
                        {
                            var totalPaid = Math.Round(await _paymentRepository.GetTotalByDocumentIdAsync(createDto.DocumentId.Value), 3, MidpointRounding.AwayFromZero);
                            decimal rsValue = (document.WithHoldingTax && document.HoldingTaxes != null) ? Math.Round((decimal)document.HoldingTaxes.TaxValue, 3, MidpointRounding.AwayFromZero) : 0;
                            var totalCreditNotes = (decimal)document.TotalCreditNotes;
                            var remainingBalance = Math.Round((decimal)document.TotalCostNetTTCDoc - rsValue - totalPaid - totalCreditNotes, 3, MidpointRounding.AwayFromZero);

                            if (totalPaid >= remainingBalance) {
                                document.BillingStatus = (BillingStatus)2; 
                            } else {
                                document.BillingStatus = (BillingStatus)3; 
                            }
                            await _documentRepository.Update(document);
                        }
                    }

                    await transaction.CommitAsync();

                    await _balanceService.UpdateCustomerBalanceAsync(createDto.CustomerId, "payment", DateTime.UtcNow);

                    createdPayment.Customer = customer; 
                    createdPayment.AppUser = user;
                    
                    return MapToDto(createdPayment);
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
        }

        public async Task<string> GeneratePaymentReferenceAsync()
        {
            var lastPayment = await _context.Payments
                .Where(p => p.Reference != null && p.Reference.StartsWith("ENC-"))
                .OrderByDescending(p => p.Id)
                .FirstOrDefaultAsync();

            return Helpers.GenerateDailyDocNumber("ENC", lastPayment?.Reference, 3);
        }

        public async Task<IEnumerable<PaymentInstrumentExtendedDto>> GetInstrumentsAsync(bool? isPaidOrVersed = null)
        {
            return await _paymentRepository.GetInstrumentsAsync(isPaidOrVersed);
        }

        public async Task<string> GetNextBordereauReferenceAsync()
        {
            var lastDeposit = await _context.BankDeposits
                .Where(b => b.Reference != null && b.Reference.StartsWith("BORD-"))
                .OrderByDescending(b => b.Id)
                .FirstOrDefaultAsync();
                
            return Helpers.GenerateDailyDocNumber("BORD", lastDeposit?.Reference, 3);
        }

        public async Task<string> CreateBordereauAsync(CreateBordereauDto dto)
        {
            if (dto.InstrumentIds == null || !dto.InstrumentIds.Any())
                throw new ArgumentException("No instruments selected.");

            var bank = await _context.Banks.FirstOrDefaultAsync(b => b.Id == dto.BankId);
            if (bank == null)
                throw new ArgumentException("Bank not found.");

            var instruments = await _context.PaymentInstruments
                .Include(pi => pi.Payment)
                .Where(pi => dto.InstrumentIds.Contains(pi.Id))
                .ToListAsync();

            if (instruments.Count != dto.InstrumentIds.Count)
                throw new ArgumentException("Some instruments were not found.");

            // Generate Bordereau reference
            var lastDeposit = await _context.BankDeposits
                .Where(b => b.Reference != null && b.Reference.StartsWith("BORD-"))
                .OrderByDescending(b => b.Id)
                .FirstOrDefaultAsync();
                
            string bordereauReference = Helpers.GenerateDailyDocNumber("BORD", lastDeposit?.Reference, 3);

            // Get Tax Rate
            var tvaVar = await _context.AppVariables.FirstOrDefaultAsync(v => v.Name == "Tva");
            decimal taxRate = (decimal)(tvaVar?.Value ?? 19.0);

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    foreach (var instrument in instruments)
                    {
                        // Check if already deposited
                        bool alreadyDeposited = await _context.BankDeposits.AnyAsync(b => b.PaymentInstrumentId == instrument.Id && !b.IsDeleted);
                        if (alreadyDeposited || instrument.IsPaidAtBank)
                            continue; // Skip or throw error depending on strictness

                        decimal feeHT = instrument.Type?.ToUpper() switch
                        {
                            "CHEQUE" => bank.ChequeDepositFeeHT,
                            "TRAITE" => bank.TraiteDepositFeeHT,
                            _ => bank.MiscFeeHT
                        };

                        decimal feeWithTax = feeHT * (1 + taxRate / 100);
                        decimal amountHT = instrument.Payment?.Amount ?? 0;
                        decimal netAmount = amountHT - feeWithTax;

                        var deposit = new BankDeposit
                        {
                            BankId = dto.BankId,
                            DepositDate = dto.DepositDate,
                            DepositType = instrument.Type ?? "CHEQUE",
                            AmountHT = amountHT,
                            FeeHT = feeHT,
                            TaxRate = taxRate,
                            FeeWithTax = feeWithTax,
                            NetAmount = netAmount,
                            Reference = bordereauReference,
                            Notes = dto.Notes,
                            PaymentInstrumentId = instrument.Id,
                            SalesSiteId = dto.SalesSiteId,
                            CreatedByUserId = dto.CreatedByUserId,
                            CreatedAt = DateTime.UtcNow,
                            IsDeleted = false
                        };

                        await _context.BankDeposits.AddAsync(deposit);
                        
                        // We do NOT mark it as PaidAtBank yet. Paid at bank means the money arrived. 
                        // It is just versed now.
                        instrument.BankSettlementStatus = "PENDING";
                        _context.PaymentInstruments.Update(instrument);
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return bordereauReference;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
        }

        public async Task<IEnumerable<PendingBordereauDto>> GetPendingBordereauxAsync()
        {
            var deposits = await _context.BankDeposits
                .Include(b => b.Bank)
                .Include(b => b.PaymentInstrument)
                    .ThenInclude(pi => pi!.Payment)
                        .ThenInclude(p => p!.Customer)
                .Where(b => !b.IsDeleted && b.PaymentInstrument != null && b.PaymentInstrument.BankSettlementStatus == "PENDING" && b.Reference != null && b.Reference.StartsWith("BORD-"))
                .ToListAsync();

            var groups = deposits.GroupBy(b => b.Reference).Select(g => new PendingBordereauDto
            {
                Reference = g.Key ?? "",
                BankId = g.First().BankId,
                BankName = g.First().Bank?.Designation,
                BankRib = g.First().Bank?.Rib,
                CreatedAt = g.Min(x => x.CreatedAt),
                TotalAmountHT = g.Sum(x => x.AmountHT),
                TotalFeeWithTax = g.Sum(x => x.FeeWithTax),
                TotalNetAmount = g.Sum(x => x.NetAmount),
                InstrumentCount = g.Count(),
                Instruments = g.Select(b => new ms.webapp.api.acya.core.Entities.DTOs.PaymentInstrumentExtendedDto
                {
                    Id = b.PaymentInstrument!.Id,
                    Type = b.PaymentInstrument.Type,
                    InstrumentNumber = b.PaymentInstrument.InstrumentNumber,
                    Bank = b.PaymentInstrument.Bank,
                    Owner = b.PaymentInstrument.Owner,
                    DueDate = b.PaymentInstrument.DueDate,
                    Amount = b.AmountHT,
                    CustomerName = b.PaymentInstrument.Payment?.Customer?.Fullname ?? b.PaymentInstrument.Payment?.Customer?.Name,
                    BankSettlementStatus = b.PaymentInstrument.BankSettlementStatus,
                    BordereauReference = b.Reference
                }).ToList()
            });

            return groups.OrderByDescending(g => g.CreatedAt).ToList();
        }

        public async Task RemoveInstrumentFromBordereauAsync(string reference, int instrumentId)
        {
            var deposit = await _context.BankDeposits
                .Include(b => b.PaymentInstrument)
                .FirstOrDefaultAsync(b => b.Reference == reference && b.PaymentInstrumentId == instrumentId && !b.IsDeleted);

            if (deposit == null)
                throw new ArgumentException("Instrument not found in this bordereau.");

            // Remove deposit
            _context.BankDeposits.Remove(deposit);

            // Reset instrument status
            if (deposit.PaymentInstrument != null)
            {
                deposit.PaymentInstrument.BankSettlementStatus = null;
                _context.PaymentInstruments.Update(deposit.PaymentInstrument);
            }

            await _context.SaveChangesAsync();
        }

        public async Task ValidateBordereauAsync(string reference)
        {
            var deposits = await _context.BankDeposits
                .Include(b => b.PaymentInstrument)
                    .ThenInclude(p => p!.Payment)
                        .ThenInclude(p => p!.Customer)
                .Include(b => b.Bank)
                .Where(b => b.Reference == reference && !b.IsDeleted && b.PaymentInstrument != null && b.PaymentInstrument.BankSettlementStatus == "PENDING")
                .ToListAsync();

            if (!deposits.Any())
                throw new ArgumentException("Bordereau not found or already validated.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var deposit in deposits)
                {
                    var instrument = deposit.PaymentInstrument;
                    var bank = deposit.Bank;

                    if (instrument != null)
                    {
                        instrument.BankSettlementStatus = "VERSED";

                        if (instrument.Type == "CHEQUE")
                        {
                            instrument.IsPaidAtBank = true;
                            instrument.PaidAtBankDate = DateTime.UtcNow;

                            if (bank != null)
                            {
                                _context.Banks.Update(bank);
                            }

                            string ownerName = instrument.Payment?.Customer?.Fullname ?? instrument.Payment?.Customer?.Name ?? instrument.Owner ?? "Inconnu";
                            var bankTx = new ms.webapp.api.acya.core.Entities.BankTransaction
                            {
                                BankId = deposit.BankId,
                                TransactionDate = instrument.PaidAtBankDate.Value,
                                Description = $"Encaissement {instrument.Type} {instrument.InstrumentNumber} - {ownerName}",
                                Debit = deposit.NetAmount,
                                Credit = 0,
                                Reference = deposit.Reference,
                                CreationDate = DateTime.UtcNow,
                                UpdateDate = DateTime.UtcNow,
                                IsDeleted = false,
                                IsReconciled = false
                            };
                            await _context.BankTransactions.AddAsync(bankTx);
                        }
                        // For TRAITE, it remains IsPaidAtBank = false and Bank.InitialBalance is untouched.

                        _context.PaymentInstruments.Update(instrument);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<IEnumerable<PendingTraiteToClearDto>> GetPendingTraitesToClearAsync()
        {
            var deposits = await _context.BankDeposits
                .Include(b => b.PaymentInstrument)
                .ThenInclude(p => p!.Payment)
                .ThenInclude(p => p!.Customer)
                .Include(b => b.Bank)
                .Where(b => !b.IsDeleted 
                            && b.PaymentInstrument != null 
                            && b.PaymentInstrument.Type == "TRAITE" 
                            && b.PaymentInstrument.BankSettlementStatus == "VERSED" 
                            && b.PaymentInstrument.IsPaidAtBank == false)
                .ToListAsync();

            return deposits.Select(d => new PendingTraiteToClearDto
            {
                InstrumentId = d.PaymentInstrument!.Id,
                DepositId = d.Id,
                Reference = d.Reference ?? string.Empty,
                BankId = d.BankId,
                BankName = d.Bank?.Designation,
                BankRib = d.Bank?.Rib,
                Owner = d.PaymentInstrument.Owner ?? d.PaymentInstrument.Payment?.Customer?.Fullname,
                InstrumentNumber = d.PaymentInstrument.InstrumentNumber,
                Amount = d.AmountHT,
                NetAmount = d.NetAmount,
                DueDate = d.PaymentInstrument.DueDate,
                DepositDate = d.DepositDate
            });
        }

        public async Task ClearTraiteAsync(int instrumentId)
        {
            var deposit = await _context.BankDeposits
                .Include(b => b.PaymentInstrument)
                    .ThenInclude(p => p!.Payment)
                        .ThenInclude(p => p!.Customer)
                .Include(b => b.Bank)
                .FirstOrDefaultAsync(b => !b.IsDeleted && b.PaymentInstrumentId == instrumentId);

            if (deposit == null || deposit.PaymentInstrument == null)
                throw new ArgumentException("Draft not found in any deposit.");

            var instrument = deposit.PaymentInstrument;

            if (instrument.Type != "TRAITE" || instrument.BankSettlementStatus != "VERSED" || instrument.IsPaidAtBank == true)
                throw new InvalidOperationException("This draft cannot be cleared.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                instrument.BankSettlementStatus = "CLEARED";
                instrument.IsPaidAtBank = true;
                instrument.PaidAtBankDate = DateTime.UtcNow;

                if (deposit.Bank != null)
                {
                    _context.Banks.Update(deposit.Bank);
                }

                string ownerName = instrument.Payment?.Customer?.Fullname ?? instrument.Payment?.Customer?.Name ?? instrument.Owner ?? "Inconnu";
                var bankTx = new ms.webapp.api.acya.core.Entities.BankTransaction
                {
                    BankId = deposit.BankId,
                    TransactionDate = instrument.PaidAtBankDate.Value,
                    Description = $"Encaissement {instrument.Type} {instrument.InstrumentNumber} - {ownerName}",
                    Debit = deposit.NetAmount,
                    Credit = 0,
                    Reference = deposit.Reference,
                    CreationDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow,
                    IsDeleted = false,
                    IsReconciled = false
                };
                await _context.BankTransactions.AddAsync(bankTx);

                _context.PaymentInstruments.Update(instrument);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<string> DisburseSupplierInstrumentsAsync(DisburseSupplierInstrumentsDto dto)
        {
            var instruments = await _context.PaymentInstruments
                .Include(pi => pi.Payment)
                    .ThenInclude(p => p!.Customer)
                .Where(pi => dto.InstrumentIds.Contains(pi.Id))
                .ToListAsync();

            if (!instruments.Any())
                throw new ArgumentException("No instruments found.");

            var bank = await _context.Banks.FirstOrDefaultAsync(b => b.Id == dto.BankId);
            if (bank == null)
                throw new ArgumentException("Bank not found.");

            // Get last reference to generate a new one
            var lastDeposit = await _context.BankDeposits
                .Where(d => !d.IsDeleted && !string.IsNullOrEmpty(d.Reference) && d.Reference.StartsWith("DEC"))
                .OrderByDescending(d => d.Id)
                .FirstOrDefaultAsync();

            string disbursementRef = Helpers.GenerateDailyDocNumber("DEC", lastDeposit?.Reference, 3);

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    foreach (var instrument in instruments)
                    {
                        // Check if already paid
                        if (instrument.IsPaidAtBank)
                            continue;

                        decimal amount = instrument.Payment?.Amount ?? 0;

                        // Create BankDeposit to represent the disbursement (money out)
                        // NetAmount is negative to reduce the bank balance
                        var deposit = new BankDeposit
                        {
                            BankId = dto.BankId,
                            DepositDate = dto.DisburseDate,
                            DepositType = instrument.Type ?? "CHEQUE",
                            AmountHT = -amount,
                            FeeHT = 0,
                            TaxRate = 0,
                            FeeWithTax = 0,
                            NetAmount = -amount,
                            Reference = disbursementRef,
                            Notes = dto.Notes,
                            PaymentInstrumentId = instrument.Id,
                            SalesSiteId = dto.SalesSiteId,
                            CreatedByUserId = dto.CreatedByUserId,
                            CreatedAt = DateTime.UtcNow,
                            IsDeleted = false
                        };

                        await _context.BankDeposits.AddAsync(deposit);
                        
                        // Mark instrument as Paid
                        instrument.BankSettlementStatus = "CLEARED";
                        instrument.IsPaidAtBank = true;
                        instrument.PaidAtBankDate = dto.DisburseDate;

                        string ownerName = instrument.Payment?.Customer?.Fullname ?? instrument.Payment?.Customer?.Name ?? instrument.Owner ?? "Inconnu";
                        var bankTx = new ms.webapp.api.acya.core.Entities.BankTransaction
                        {
                            BankId = dto.BankId,
                            TransactionDate = dto.DisburseDate,
                            Description = $"Décaissement {instrument.Type} {instrument.InstrumentNumber} - {ownerName}",
                            Debit = 0,
                            Credit = amount,
                            Reference = disbursementRef,
                            CreationDate = DateTime.UtcNow,
                            UpdateDate = DateTime.UtcNow,
                            IsDeleted = false,
                            IsReconciled = false
                        };
                        await _context.BankTransactions.AddAsync(bankTx);

                        _context.PaymentInstruments.Update(instrument);
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return disbursementRef;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
        }

        public async Task DeliverSupplierInstrumentsAsync(DeliverSupplierInstrumentsDto dto)
        {
            var instruments = await _context.PaymentInstruments
                .Where(pi => dto.InstrumentIds.Contains(pi.Id))
                .ToListAsync();

            if (!instruments.Any())
                throw new ArgumentException("No instruments found.");

            foreach (var instrument in instruments)
            {
                if (instrument.IsPaidAtBank) continue;
                
                // Switch status to VERSED but keep IsPaidAtBank = false
                instrument.BankSettlementStatus = "VERSED";
                
                _context.PaymentInstruments.Update(instrument);
            }

            await _context.SaveChangesAsync();
        }
    }
}
