using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.DTOs.Analytics;

namespace ms.webapp.api.acya.api.Interfaces
{
    /// <summary>
    /// Service for calculating aggregated dashboard KPIs.
    /// Implementation of Gap §5.2.
    /// </summary>
    public interface IAnalyticsService
    {
        Task<DashboardKpiDto> GetDashboardKpisAsync(Guid enterpriseId);
    }
}
