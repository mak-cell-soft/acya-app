using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers
{
    [Route("api/[controller]")]
    public class LeaveController : BaseApiController
    {
        private readonly EmployeeLeaveRepository _repository;

        public LeaveController(EmployeeLeaveRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EmployeeLeaveDto>>> GetAll()
        {
            var leaves = await _repository.GetAllAsync();
            return Ok(leaves.Select(l => new EmployeeLeaveDto(l)));
        }

        [HttpGet("Employee/{employeeId}")]
        public async Task<ActionResult<IEnumerable<EmployeeLeaveDto>>> GetByEmployee(int employeeId)
        {
            var leaves = await _repository.GetByEmployeeId(employeeId);
            return Ok(leaves.Select(l => new EmployeeLeaveDto(l)));
        }

        [HttpPost]
        public async Task<ActionResult<EmployeeLeaveDto>> Add(EmployeeLeaveDto dto)
        {
            var entity = new EmployeeLeave(dto);
            await _repository.Add(entity);
            return Ok(new EmployeeLeaveDto(entity));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<EmployeeLeaveDto>> Update(int id, EmployeeLeaveDto dto)
        {
            var existing = await _repository.Get(id);
            if (existing == null) return NotFound();

            existing.UpdateFromDto(dto);
            await _repository.Update(existing);
            return Ok(new EmployeeLeaveDto(existing));
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
