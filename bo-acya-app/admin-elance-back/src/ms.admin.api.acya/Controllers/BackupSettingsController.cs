using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Interfaces;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/backup/settings")]
    [Authorize(Roles = "SUPER_ADMIN,SuperAdmin")]
    public class BackupSettingsController : ControllerBase
    {
        private readonly IBackupSettingsService _backupSettingsService;

        public BackupSettingsController(IBackupSettingsService backupSettingsService)
        {
            _backupSettingsService = backupSettingsService;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var response = await _backupSettingsService.GetSettingsAsync();
            return Ok(response);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdateBackupSettingsDto dto)
        {
            var username = User.Identity?.Name 
                ?? User.FindFirst(ClaimTypes.Name)?.Value 
                ?? User.FindFirst("unique_name")?.Value 
                ?? "SuperAdmin";

            var ipAddress = HttpContext.Request.Headers["X-Forwarded-For"].ToString();
            if (string.IsNullOrWhiteSpace(ipAddress))
            {
                ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            }

            var (success, error, result) = await _backupSettingsService.UpdateSettingsAsync(dto, username, ipAddress);

            if (!success)
            {
                return BadRequest(new { message = error });
            }

            return Ok(result);
        }
    }
}
