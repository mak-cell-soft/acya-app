using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Permissions;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.api.Controllers;
using System.Security.Claims;

namespace ms.webapp.api.acya.Controllers
{
    [Authorize]
    public class PermissionsController : BaseApiController
    {
        private readonly UserPermissionsRepository _userPermissionsRepo;

        public PermissionsController(UserPermissionsRepository userPermissionsRepo)
        {
            _userPermissionsRepo = userPermissionsRepo;
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
