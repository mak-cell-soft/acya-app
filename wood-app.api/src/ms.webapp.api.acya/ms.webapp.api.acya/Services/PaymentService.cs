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

            if (payment.Amount != updateDto.Amount)
            {
                var totalPaid = Math.Round(await _paymentRepository.GetTotalByDocumentIdAsync(payment.DocumentId), 3, MidpointRounding.AwayFromZero);
                var totalPaidExcludingThis = totalPaid - Math.Round((payment.Amount ?? 0), 3, MidpointRounding.AwayFromZero);
                
                var document = await _documentRepository.Get(payment.DocumentId);
                var rsValue = (document!.WithHoldingTax && document.HoldingTaxes != null) ? Math.Round((decimal)document.HoldingTaxes.TaxValue, 3, MidpointRounding.AwayFromZero) : 0;
                var totalCreditNotes = (decimal)document.TotalCreditNotes;
                var remainingBalance = Math.Round((decimal)document.TotalCostNetTTCDoc - rsValue - totalPaidExcludingThis - totalCreditNotes, 3, MidpointRounding.AwayFromZero);
                var updateAmount = Math.Round(updateDto.Amount ?? 0, 3, MidpointRounding.AwayFromZero);

                 if (updateAmount > remainingBalance)
                    throw new ArgumentException($"New payment amount ({updateAmount}) exceeds remaining balance ({remainingBalance}).");
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
                    var document = await _documentRepository.Get(payment.DocumentId);
                    bool isSupplier = IsSupplierDocument(document?.Type);

                    await _accountService.DeleteLedgerEntryAsync(payment.Id, "Payment");
                    await _accountService.AddLedgerEntryAsync(
                        payment.CustomerId, 
                        "Payment", 
                        updateDto.Amount ?? 0, 
                        payment.Id, 
                        $"Paiement ({payment.PaymentMethod}) - document {document?.DocNumber}",
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
                        // Delete Ledger Entry
                        await _accountService.DeleteLedgerEntryAsync(paymentId, "Payment");

                        await transaction.CommitAsync();

                        // Update persistent balance
                        if (payment.Document != null)
                        {
                            await UpdateBalanceByDocumentTypeAsync(payment.Document.Type?.ToString(), payment.CustomerId, "payment", DateTime.UtcNow);
                        }
                        else
                        {
                            var document = await _documentRepository.Get(payment.DocumentId);
                            if (document != null)
                                await UpdateBalanceByDocumentTypeAsync(document.Type?.ToString(), payment.CustomerId, "payment", DateTime.UtcNow);
                            else
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
    }
}
