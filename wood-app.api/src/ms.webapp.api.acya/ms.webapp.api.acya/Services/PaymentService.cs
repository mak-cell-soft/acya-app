using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly IPaymentRepository _paymentRepository;
        private readonly DocumentRepository _documentRepository;
        private readonly CounterPartRepository _customerRepository;
        private readonly AppUserRepository _appUserRepository; // Added to fetch user name

        public PaymentService(
            IPaymentRepository paymentRepository,
            DocumentRepository documentRepository,
            CounterPartRepository customerRepository,
            AppUserRepository appUserRepository)
        {
            _paymentRepository = paymentRepository;
            _documentRepository = documentRepository;
            _customerRepository = customerRepository;
            _appUserRepository = appUserRepository;
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
            var document = await _documentRepository.Get(createDto.DocumentId);
            if (document == null || document.IsDeleted)
                throw new ArgumentException("Invalid or deleted document.");

            // Validate Document total
            var totalPaid = await _paymentRepository.GetTotalByDocumentIdAsync(createDto.DocumentId);
            var remainingBalance = (decimal)document.TotalCostNetTTCDoc - totalPaid;

            if (createDto.Amount > remainingBalance)
                throw new ArgumentException($"Payment amount ({createDto.Amount}) exceeds remaining balance ({remainingBalance}).");

            // Fetch generic user name if needed or let DB handle UpdatedById relation
            var user = await _appUserRepository.Get(createdById);
            string createdByName = user != null ? user.Login : "Unknown";

            var payment = new Payment
            {
                DocumentId = createDto.DocumentId,
                CustomerId = createDto.CustomerId,
                PaymentDate = createDto.PaymentDate,
                Amount = createDto.Amount,
                PaymentMethod = createDto.PaymentMethod,
                Reference = createDto.Reference,
                Notes = createDto.Notes,
                
                // New logic: UpdatedById is the FK, CreatedBy is text
                UpdatedById = createdById,
                CreatedBy = createdByName, 
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            };

            var createdPayment = await _paymentRepository.Add(payment);
            
            createdPayment.Document = document;
            createdPayment.Customer = customer; 
            createdPayment.AppUser = user;
            
            return MapToDto(createdPayment);
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
                var totalPaid = await _paymentRepository.GetTotalByDocumentIdAsync(payment.DocumentId);
                var totalPaidExcludingThis = totalPaid - (payment.Amount ?? 0);
                
                var document = await _documentRepository.Get(payment.DocumentId);
                var remainingBalance = (decimal)document!.TotalCostNetTTCDoc - totalPaidExcludingThis;
                
                 if (updateDto.Amount > remainingBalance)
                    throw new ArgumentException($"New payment amount ({updateDto.Amount}) exceeds remaining balance ({remainingBalance}).");
            }

            payment.PaymentDate = updateDto.PaymentDate;
            payment.Amount = updateDto.Amount;
            payment.PaymentMethod = updateDto.PaymentMethod;
            payment.Reference = updateDto.Reference;
            payment.Notes = updateDto.Notes;
            
            payment.UpdatedById = updatedById; 
            payment.UpdatedAt = DateTime.UtcNow;

            var updatedPayment = await _paymentRepository.Update(payment);
            
            // Re-fetch or attach user for mapping if needed
            // For now mapping uses what's available
            
            return MapToDto(updatedPayment);
        }

        public async Task<bool> DeleteAsync(int paymentId, int deletedById)
        {
            var payment = await _paymentRepository.GetByIdAsync(paymentId);
            if (payment == null) return false;

            payment.UpdatedById = deletedById;
            
            return await _paymentRepository.DeleteAsync(paymentId);
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
                CreatedBy = payment.CreatedBy 
            };
        }
    }
}
