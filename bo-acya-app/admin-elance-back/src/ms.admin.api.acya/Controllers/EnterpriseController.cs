using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.common.Enums;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class EnterpriseController : ControllerBase
    {
        private readonly IEnterpriseRepository _enterpriseRepository;
        private readonly ITenantProvisioningService _provisioningService;

        public EnterpriseController(IEnterpriseRepository enterpriseRepository, ITenantProvisioningService provisioningService)
        {
            _enterpriseRepository = enterpriseRepository;
            _provisioningService = provisioningService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var enterprises = await _enterpriseRepository.GetAllAsync();
            return Ok(enterprises);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(long id)
        {
            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();
            return Ok(enterprise);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MasterEnterprise enterprise)
        {
            enterprise.CreatedAt = System.DateTime.UtcNow;
            enterprise.Status = TenantStatus.Pending;
            enterprise.IsActive = false;

            var created = await _enterpriseRepository.AddAsync(enterprise);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id}/activate")]
        public async Task<IActionResult> Activate(long id)
        {
            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();

            enterprise.IsActive = true;
            enterprise.Status = TenantStatus.Active;
            enterprise.ActivatedAt = System.DateTime.UtcNow;

            await _enterpriseRepository.UpdateAsync(enterprise);
            return NoContent();
        }

        [HttpPut("{id}/suspend")]
        public async Task<IActionResult> Suspend(long id)
        {
            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();

            enterprise.IsActive = false;
            enterprise.Status = TenantStatus.Suspended;

            await _enterpriseRepository.UpdateAsync(enterprise);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(long id)
        {
            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();

            var deprovisionSuccess = await _provisioningService.DeprovisionTenantAsync(enterprise);
            if (!deprovisionSuccess)
            {
                return StatusCode(500, "Deprovisioning database schema failed. Tenant registry entry was not removed.");
            }

            await _enterpriseRepository.DeleteAsync(enterprise);
            return NoContent();
        }
    }
}
