using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using System;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    public class UpdatePlatformSettingsDto
    {
        public bool IsRneRequired { get; set; }
    }

    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class SettingsController : ControllerBase
    {
        private readonly MasterDbContext _context;

        public SettingsController(MasterDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var rneSetting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == "RneRequired");
            bool isRneRequired = rneSetting == null || !rneSetting.Value.Equals("false", StringComparison.OrdinalIgnoreCase);

            return Ok(new
            {
                isRneRequired = isRneRequired,
                commandCenterVersion = "v1.0.0-PROD",
                gatewayDomain = "admin.acya.site"
            });
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdatePlatformSettingsDto dto)
        {
            var rneSetting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == "RneRequired");
            if (rneSetting == null)
            {
                rneSetting = new PlatformSetting
                {
                    Key = "RneRequired",
                    Value = dto.IsRneRequired ? "true" : "false",
                    UpdatedAt = DateTime.UtcNow
                };
                await _context.PlatformSettings.AddAsync(rneSetting);
            }
            else
            {
                rneSetting.Value = dto.IsRneRequired ? "true" : "false";
                rneSetting.UpdatedAt = DateTime.UtcNow;
                _context.PlatformSettings.Update(rneSetting);
            }

            await _context.SaveChangesAsync();
            return Ok(new
            {
                message = "Settings updated successfully",
                isRneRequired = dto.IsRneRequired
            });
        }
    }
}
