using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StockMovementController : BaseApiController
    {
        private readonly IStockMovementService _service;
        private readonly SalesSitesRepository _sitesRepository;

        public StockMovementController(IStockMovementService service, SalesSitesRepository sitesRepository)
        {
            _service = service;
            _sitesRepository = sitesRepository;
        }

        [HttpGet("timeline")]
        public async Task<ActionResult<IEnumerable<StockMovementTimelineDto>>> GetTimeline(
            [FromQuery] int merchandiseId, 
            [FromQuery] int salesSiteId, 
            [FromQuery] DateTime? from, 
            [FromQuery] DateTime? to)
        {
            var result = await _service.GetTimelineAsync(merchandiseId, salesSiteId, from, to);
            return Ok(result);
        }

        [HttpGet("timeline/by-package")]
        public async Task<ActionResult<IEnumerable<StockMovementTimelineDto>>> GetTimelineByPackage(
            [FromQuery] string packageNumber, 
            [FromQuery] int salesSiteId, 
            [FromQuery] DateTime? from, 
            [FromQuery] DateTime? to)
        {
            var result = await _service.GetTimelineByPackageAsync(packageNumber, salesSiteId, from, to);
            return Ok(result);
        }

        [HttpGet("summary")]
        public async Task<ActionResult<StockMovementSummaryDto>> GetSummary(
            [FromQuery] int merchandiseId, 
            [FromQuery] int salesSiteId)
        {
            var result = await _service.GetSummaryAsync(merchandiseId, salesSiteId);
            return Ok(result);
        }

        [HttpGet("reconcile")]
        public async Task<ActionResult<StockMovementReconciliationDto>> Reconcile(
            [FromQuery] int merchandiseId, 
            [FromQuery] int salesSiteId)
        {
            var result = await _service.ReconcileAsync(merchandiseId, salesSiteId);
            return Ok(result);
        }

        [HttpGet("sites")]
        public async Task<ActionResult<IEnumerable<SiteDto>>> GetSites()
        {
            var allDtos = await _sitesRepository.GetAllAsync();
            return Ok(allDtos);
        }
    }
}
