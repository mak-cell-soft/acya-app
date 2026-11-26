using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
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
        private readonly ILogger<AnalyticsController> _logger;

        public AnalyticsController(IAnalyticsService analyticsService, ILogger<AnalyticsController> logger)
        {
            _analyticsService = analyticsService;
            _logger = logger;
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

        /// <summary>
        /// Retrieves unsold/dormant merchandise analytics for a configurable inactivity window (3, 6, or 12 months).
        /// Requires authentication and operates strictly within the active tenant schema.
        /// </summary>
        [Authorize]
        [HttpGet("unsold-merchandise")]
        public async Task<ActionResult<UnsoldMerchandiseResponseDto>> GetUnsoldMerchandise(
            [FromQuery] int months = 6,
            [FromQuery] int? siteId = null,
            [FromQuery] int? categoryId = null,
            [FromQuery] int? subCategoryId = null,
            [FromQuery] bool onlyWithStock = true,
            [FromQuery] bool excludeNewArticles = true,
            [FromQuery] int gracePeriodDays = 30,
            [FromQuery] string? inactivityType = null,
            [FromQuery] string? search = null,
            [FromQuery] string sortBy = "stockValue",
            [FromQuery] string sortDirection = "desc",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] bool exportAll = false)
        {
            try
            {
                var queryParams = new UnsoldMerchandiseQueryParams
                {
                    Months = months,
                    SiteId = siteId,
                    CategoryId = categoryId,
                    SubCategoryId = subCategoryId,
                    OnlyWithStock = onlyWithStock,
                    ExcludeNewArticles = excludeNewArticles,
                    GracePeriodDays = gracePeriodDays,
                    InactivityType = inactivityType,
                    Search = search,
                    SortBy = sortBy,
                    SortDirection = sortDirection,
                    Page = page,
                    PageSize = pageSize,
                    ExportAll = exportAll
                };

                var result = await _analyticsService.GetUnsoldMerchandiseAsync(queryParams);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve unsold merchandise analytics for months={Months}, siteId={SiteId}", months, siteId);
                return StatusCode(500, new { message = "Une erreur interne est survenue lors du calcul des articles sans ventes." });
            }
        }
    }
}
