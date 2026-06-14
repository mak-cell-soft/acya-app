using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.admin.api.acya.core.Interfaces;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
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
        public async Task<IActionResult> Provision(long id)
        {
            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();

            var success = await _provisioningService.ProvisionTenantAsync(enterprise);
            if (!success) return StatusCode(500, "Provisioning failed");

            return Ok(new { Message = "Provisioned successfully" });
        }
    }
}
