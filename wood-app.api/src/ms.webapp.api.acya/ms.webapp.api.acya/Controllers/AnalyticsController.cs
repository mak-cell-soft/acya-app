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
        public async Task<ActionResult<DashboardKpiDto>> GetDashboardKpis([FromQuery] int? enterpriseId, [FromQuery] int? month = null, [FromQuery] int? year = null)
        {
            try
            {
                var result = await _analyticsService.GetDashboardKpisAsync(enterpriseId, month, year);
                return Ok(result);
            }
            catch (Exception ex)
            {
                // Note: In production, consider logging the full exception and returning a generic error message.
                return BadRequest($"Failed to retrieve dashboard analytics: {ex.Message}");
            }
        }

        /// <summary>
        /// Retrieves monthly revenue data for charts.
        /// </summary>
        /// <param name="months">Number of months to retrieve</param>
        /// <returns>List of MonthlyRevenueDto</returns>
        [HttpGet("monthly-revenue")]
        public async Task<ActionResult<IEnumerable<MonthlyRevenueDto>>> GetMonthlyRevenue([FromQuery] int months = 6)
        {
            try
            {
                var result = await _analyticsService.GetMonthlyRevenueAsync(months);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Failed to retrieve monthly revenue: {ex.Message}");
            }
        }

        /// <summary>
        /// Retrieves top sub-categories by sales quantity.
        /// </summary>
        /// <param name="months">Number of months to retrieve</param>
        /// <returns>List of TopSubCategoryDto</returns>
        [HttpGet("top-subcategories")]
        public async Task<ActionResult<IEnumerable<TopSubCategoryDto>>> GetTopSubCategories([FromQuery] int months = 6)
        {
            try
            {
                var result = await _analyticsService.GetTopSubCategoriesAsync(months);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Failed to retrieve top sub-categories: {ex.Message}");
            }
        }

        /// <summary>
        /// Retrieves stock health summary per sub-category.
        /// </summary>
        /// <param name="siteId">Optional site filter.</param>
        /// <returns>List of SubCategoryStockHealthDto</returns>
        [HttpGet("stock-health")]
        public async Task<ActionResult<IEnumerable<SubCategoryStockHealthDto>>> GetStockHealth([FromQuery] int? siteId = null)
        {
            try
            {
                var result = await _analyticsService.GetStockHealthBySubCategoryAsync(siteId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Failed to retrieve stock health: {ex.Message}");
            }
        }
    }
}
