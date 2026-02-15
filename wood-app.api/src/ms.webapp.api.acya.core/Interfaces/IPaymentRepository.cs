using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IPaymentRepository
    {
        // Base methods (originally from ICoreRepository)
        Task<Payment?> Get(int id);
        Task<Payment> Add(Payment entity);
        Task<Payment> Update(Payment entity);
        Task<Payment> Delete(int id);

        // Custom methods - Removing CompanyReference as per new schema
        Task<Payment?> GetByIdAsync(int paymentId);
        Task<IEnumerable<Payment>> GetAllAsync();
        Task<PagedResult<Payment>> SearchAsync(PaymentSearchDto searchDto);
        Task<IEnumerable<Payment>> GetByCustomerIdAsync(int customerId);
        Task<IEnumerable<Payment>> GetByDocumentIdAsync(int documentId);
        Task<decimal> GetTotalByDocumentIdAsync(int documentId);
        Task<bool> ExistsAsync(int paymentId);
        Task<bool> DeleteAsync(int paymentId);
        Task<IEnumerable<DashboardPaymentDto>> GetDashboardPaymentsAsync(DateTime date, int salesSiteId);
    }
}
