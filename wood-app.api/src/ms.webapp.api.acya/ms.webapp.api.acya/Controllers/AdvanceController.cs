using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers
{
    [Route("api/[controller]")]
    public class AdvanceController : BaseApiController
    {
        private readonly EmployeeAdvanceRepository _repository;

        public AdvanceController(EmployeeAdvanceRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EmployeeAdvanceDto>>> GetAll()
        {
            var advances = await _repository.GetAllAsync();
            return Ok(advances.Select(a => new EmployeeAdvanceDto(a)));
        }

        [HttpGet("Employee/{employeeId}")]
        public async Task<ActionResult<IEnumerable<EmployeeAdvanceDto>>> GetByEmployee(int employeeId)
        {
            var advances = await _repository.GetByEmployeeId(employeeId);
            return Ok(advances.Select(a => new EmployeeAdvanceDto(a)));
        }

        [HttpPost]
        public async Task<ActionResult<EmployeeAdvanceDto>> Add(EmployeeAdvanceDto dto)
        {
            var entity = new EmployeeAdvance(dto);
            await _repository.Add(entity);
            return Ok(new EmployeeAdvanceDto(entity));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<EmployeeAdvanceDto>> Update(int id, EmployeeAdvanceDto dto)
        {
            var existing = await _repository.Get(id);
            if (existing == null) return NotFound();

            existing.UpdateFromDto(dto);
            await _repository.Update(existing);
            return Ok(new EmployeeAdvanceDto(existing));
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var existing = await _repository.Get(id);
            if (existing == null) return NotFound();

            await _repository.Delete(id);
            return Ok();
        }
    }
}
