using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Permissions;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.api.Controllers;
using System.Security.Claims;

namespace ms.webapp.api.acya.Controllers
{
    [Authorize]
    public class PermissionsController : BaseApiController
    {
        private readonly UserPermissionsRepository _userPermissionsRepo;
        private readonly WoodAppContext _context;

        public PermissionsController(UserPermissionsRepository userPermissionsRepo, WoodAppContext context)
        {
            _userPermissionsRepo = userPermissionsRepo;
            _context = context;
        }

        [HttpGet("{userId}")]
        [Authorize(Policy = "RequireAdminRole")]
        public async Task<ActionResult<UserPermissionsDto>> GetUserPermissions(int userId)
        {
            var userPerms = await _userPermissionsRepo.GetByUserIdAsync(userId);
            
            var dto = new UserPermissionsDto { UserId = userId };
            if (userPerms != null && !string.IsNullOrEmpty(userPerms.Permissions))
            {
                try
                {
                    dto.Permissions = JsonSerializer.Deserialize<AppPermissionsMap>(userPerms.Permissions, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) 
                                      ?? new AppPermissionsMap();
                }
                catch
                {
                    // If parsing fails, return default empty permissions
                }
            }

            // NOTE: Defense-in-depth: if enterprise does not manage constructions, zero out Chantier permissions
            var enterprise = await _context.Enterprises.AsNoTracking().FirstOrDefaultAsync();
            if (enterprise != null && enterprise.IsManagingConstructions != true && dto.Permissions?.Chantier != null)
            {
                dto.Permissions.Chantier.CanRead = false;
                dto.Permissions.Chantier.CanAdd = false;
                dto.Permissions.Chantier.CanUpdate = false;
                dto.Permissions.Chantier.CanDelete = false;
            }
            
            return Ok(dto);
        }

        [HttpPut("{userId}")]
        [Authorize(Policy = "RequireAdminRole")]
        public async Task<ActionResult<UserPermissionsDto>> UpdateUserPermissions(int userId, [FromBody] UserPermissionsDto updateDto)
        {
            if (userId != updateDto.UserId)
            {
                return BadRequest("User ID mismatch");
            }

            // NOTE: Defense-in-depth: if enterprise does not manage constructions, force Chantier permissions to false
            var enterprise = await _context.Enterprises.AsNoTracking().FirstOrDefaultAsync();
            if (enterprise != null && enterprise.IsManagingConstructions != true && updateDto.Permissions?.Chantier != null)
            {
                updateDto.Permissions.Chantier.CanRead = false;
                updateDto.Permissions.Chantier.CanAdd = false;
                updateDto.Permissions.Chantier.CanUpdate = false;
                updateDto.Permissions.Chantier.CanDelete = false;
            }

            var permissionsJson = JsonSerializer.Serialize(updateDto.Permissions, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            
            var updated = await _userPermissionsRepo.UpsertAsync(userId, permissionsJson);

            return Ok(updateDto);
        }

        [HttpGet("mine")]
        public async Task<ActionResult<UserPermissionsDto>> GetMyPermissions()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var userPerms = await _userPermissionsRepo.GetByUserIdAsync(userId);
            
            var dto = new UserPermissionsDto { UserId = userId };
            if (userPerms != null && !string.IsNullOrEmpty(userPerms.Permissions))
            {
                try
                {
                    dto.Permissions = JsonSerializer.Deserialize<AppPermissionsMap>(userPerms.Permissions, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) 
                                      ?? new AppPermissionsMap();
                }
                catch
                {
                }
            }
            
            return Ok(dto);
        }
    }
}
