using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.Services;

namespace ms.webapp.api.acya.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

        [HttpGet("{type}/export")]
        public async Task<IActionResult> Export(string type, [FromQuery] string format = "xlsx", [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null, [FromQuery] int? salesSiteId = null)
        {
            try
            {
                var fileBytes = await _reportService.ExportReportAsync(type, format, startDate, endDate, salesSiteId);
                
                string contentType = format.ToLower() == "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                string fileName = $"Report_{type}_{DateTime.Now:yyyyMMddHHmm}.{format.ToLower()}";

                return File(fileBytes, contentType, fileName);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
