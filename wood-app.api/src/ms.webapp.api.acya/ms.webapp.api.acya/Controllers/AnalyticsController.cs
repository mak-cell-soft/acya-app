using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.core.Entities.DTOs.Analytics;

namespace ms.webapp.api.acya.api.Controllers
{
    /// <summary>
    /// REST Controller for Dashboard Analytics.
    /// Implementation of Gap §5.2.
    /// </summary>
    [Route("api/[controller]")]
    public class AnalyticsController : BaseApiController
    {
        private readonly IAnalyticsService _analyticsService;

        public AnalyticsController(IAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        /// <summary>
        /// Retrieves aggregated KPIs for the dashboard.
        /// </summary>
        /// <param name="enterpriseId">Optional enterprise filter.</param>
        /// <returns>DashboardKpiDto</returns>
        [HttpGet("dashboard")]
        public async Task<ActionResult<DashboardKpiDto>> GetDashboardKpis([FromQuery] Guid enterpriseId)
        {
            try
            {
                var result = await _analyticsService.GetDashboardKpisAsync(enterpriseId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                // Note: In production, consider logging the full exception and returning a generic error message.
                return BadRequest($"Failed to retrieve dashboard analytics: {ex.Message}");
            }
        }
    }
}
