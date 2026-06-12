using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Interfaces;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Controllers
{
    public class ImportsController : BaseApiController
    {
        private readonly IImportService _importService;

        public ImportsController(IImportService importService)
        {
            _importService = importService;
        }

        [HttpPost("articles")]
        public async Task<IActionResult> ImportArticles(IFormFile file, [FromQuery] int userId, [FromQuery] int enterpriseId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Fichier non fourni ou vide.");

            using var stream = file.OpenReadStream();
            var report = await _importService.ImportArticlesAsync(stream, file.FileName, userId, enterpriseId);
            return Ok(report);
        }

        [HttpPost("counterparts")]
        public async Task<IActionResult> ImportCounterParts(IFormFile file, [FromQuery] string type, [FromQuery] int userId, [FromQuery] int enterpriseId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Fichier non fourni ou vide.");

            using var stream = file.OpenReadStream();
            var report = await _importService.ImportCounterPartsAsync(stream, file.FileName, type, userId, enterpriseId);
            return Ok(report);
        }

        [HttpPost("settings")]
        public async Task<IActionResult> ImportSettings(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Fichier non fourni ou vide.");

            using var stream = file.OpenReadStream();
            var report = await _importService.ImportSettingsAsync(stream, file.FileName);
            return Ok(report);
        }
    }
}
