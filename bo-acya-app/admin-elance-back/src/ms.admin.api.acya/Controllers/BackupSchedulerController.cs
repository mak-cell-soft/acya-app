using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.Services;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/backup/scheduler")]
    [Authorize(Roles = "SUPER_ADMIN,SuperAdmin")]
    public class BackupSchedulerController : ControllerBase
    {
        private readonly IBackupSchedulerManagementService _schedulerService;

        public BackupSchedulerController(IBackupSchedulerManagementService schedulerService)
        {
            _schedulerService = schedulerService;
        }

        [HttpGet]
        public async Task<IActionResult> GetSchedulerStatus(CancellationToken cancellationToken = default)
        {
            var status = await _schedulerService.GetSchedulerStatusAsync(cancellationToken);
            return Ok(status);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSchedule(
            [FromBody] UpdateDailyScheduleDto dto,
            CancellationToken cancellationToken = default)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Time) || string.IsNullOrWhiteSpace(dto.Timezone))
            {
                return BadRequest(new
                {
                    status = StatusCodes.Status400BadRequest,
                    code = "missing_parameters",
                    message = "Both 'time' (HH:mm) and 'timezone' are required."
                });
            }

            var username = GetUsername();
            var ipAddress = GetClientIp();

            try
            {
                var result = await _schedulerService.UpdateDailyScheduleAsync(
                    dto.Time,
                    dto.Timezone,
                    username,
                    ipAddress,
                    cancellationToken);

                return Ok(result);
            }
            catch (SchedulerManagementException ex)
            {
                return StatusCode(ex.StatusCode, new
                {
                    status = ex.StatusCode,
                    code = ex.Code,
                    message = ex.Message
                });
            }
        }

        [HttpPost("enable")]
        public async Task<IActionResult> EnableScheduler(CancellationToken cancellationToken = default)
        {
            var username = GetUsername();
            var ipAddress = GetClientIp();

            try
            {
                var result = await _schedulerService.EnableSchedulerAsync(
                    username,
                    ipAddress,
                    cancellationToken);

                return Ok(result);
            }
            catch (SchedulerManagementException ex)
            {
                return StatusCode(ex.StatusCode, new
                {
                    status = ex.StatusCode,
                    code = ex.Code,
                    message = ex.Message
                });
            }
        }

        [HttpPost("disable")]
        public async Task<IActionResult> DisableScheduler(CancellationToken cancellationToken = default)
        {
            var username = GetUsername();
            var ipAddress = GetClientIp();

            try
            {
                var result = await _schedulerService.DisableSchedulerAsync(
                    username,
                    ipAddress,
                    cancellationToken);

                return Ok(result);
            }
            catch (SchedulerManagementException ex)
            {
                return StatusCode(ex.StatusCode, new
                {
                    status = ex.StatusCode,
                    code = ex.Code,
                    message = ex.Message
                });
            }
        }

        private string GetUsername()
        {
            return User?.Identity?.Name
                ?? User?.FindFirst(ClaimTypes.Name)?.Value
                ?? User?.FindFirst("unique_name")?.Value
                ?? "SuperAdmin";
        }

        private string? GetClientIp()
        {
            var forwarded = HttpContext?.Request?.Headers["X-Forwarded-For"].ToString();
            if (!string.IsNullOrWhiteSpace(forwarded))
            {
                return forwarded.Split(',')[0].Trim();
            }
            return HttpContext?.Connection?.RemoteIpAddress?.ToString();
        }
    }
}

