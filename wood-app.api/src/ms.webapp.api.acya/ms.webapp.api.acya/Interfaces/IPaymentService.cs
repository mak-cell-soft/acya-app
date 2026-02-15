using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.api.Interfaces
{
    public interface IPaymentService
    {
        Task<PaymentDto> GetByIdAsync(int paymentId);
        Task<PagedResult<PaymentDto>> SearchAsync(PaymentSearchDto searchDto);
        Task<IEnumerable<PaymentDto>> GetByCustomerIdAsync(int customerId);
        Task<IEnumerable<PaymentDto>> GetByDocumentIdAsync(int documentId);
        
        // Updated to use int updatedById/createdById
        Task<PaymentDto> CreateAsync(CreatePaymentDto createDto, int createdById);
        Task<PaymentDto> UpdateAsync(UpdatePaymentDto updateDto, int updatedById);
        Task<bool> DeleteAsync(int paymentId, int deletedById);
        Task<IEnumerable<DashboardPaymentDto>> GetDashboardPaymentsAsync(DateTime date, int userId);
    }
}
