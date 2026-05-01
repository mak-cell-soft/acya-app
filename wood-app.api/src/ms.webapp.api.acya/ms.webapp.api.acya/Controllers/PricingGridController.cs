using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.core.Entities.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Controllers
{
    [Route("api/[controller]")]
    public class PricingGridController : BaseApiController
    {
        private readonly IPricingGridService _service;

        public PricingGridController(IPricingGridService service)
        {
            _service = service;
        }

        [HttpGet("{counterPartId}")]
        public async Task<ActionResult<IEnumerable<PricingGridDto>>> GetForCounterPart(int counterPartId)
        {
            var result = await _service.GetForCounterPartAsync(counterPartId);
            return Ok(result);
        }

        [HttpGet("{counterPartId}/lookup")]
        public async Task<ActionResult<IEnumerable<PricingGridLookupDto>>> GetLookup(int counterPartId)
        {
            var result = await _service.GetLookupAsync(counterPartId);
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<PricingGridDto>> Create(PricingGridDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<PricingGridDto>> Update(int id, PricingGridDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            if (!success) return NotFound();
            return Ok();
        }
    }
}
