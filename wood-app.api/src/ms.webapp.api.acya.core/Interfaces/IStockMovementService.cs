using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IStockMovementService
    {
        Task<IEnumerable<StockMovementTimelineDto>> GetTimelineAsync(int merchandiseId, int salesSiteId, DateTime? from = null, DateTime? to = null);
        Task<IEnumerable<StockMovementTimelineDto>> GetTimelineByPackageAsync(string packageNumber, int salesSiteId, DateTime? from = null, DateTime? to = null);
        Task<StockMovementSummaryDto> GetSummaryAsync(int merchandiseId, int salesSiteId);
        Task<StockMovementReconciliationDto> ReconcileAsync(int merchandiseId, int salesSiteId);
    }
}
