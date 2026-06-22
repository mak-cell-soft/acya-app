using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.admin.api.acya.core.Interfaces;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    public class ProvisionRequest
    {
        public string AdminUsername { get; set; } = "admin";
        public string AdminEmail { get; set; } = string.Empty;
        public string AdminPassword { get; set; } = string.Empty;
    }

    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class ProvisioningController : ControllerBase
    {
        private readonly ITenantProvisioningService _provisioningService;
        private readonly IEnterpriseRepository _enterpriseRepository;

        public ProvisioningController(ITenantProvisioningService provisioningService, IEnterpriseRepository enterpriseRepository)
        {
            _provisioningService = provisioningService;
            _enterpriseRepository = enterpriseRepository;
        }

        [HttpPost("provision/{id}")]
        public async Task<IActionResult> Provision(long id, [FromBody] ProvisionRequest request)
        {
            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();

            if (string.IsNullOrWhiteSpace(request.AdminUsername) || 
                string.IsNullOrWhiteSpace(request.AdminEmail) || 
                string.IsNullOrWhiteSpace(request.AdminPassword))
            {
                return BadRequest("Admin Username, Email, and Password are required.");
            }

            var success = await _provisioningService.ProvisionTenantAsync(
                enterprise, 
                request.AdminUsername, 
                request.AdminEmail, 
                request.AdminPassword
            );

            if (!success) return StatusCode(500, "Provisioning failed");

            return Ok(new { Message = "Provisioned successfully" });
        }
    }
}
