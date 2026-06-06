using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class BankTransactionsController : ControllerBase
    {
        private readonly IBankTransactionService _bankTransactionService;

        public BankTransactionsController(IBankTransactionService bankTransactionService)
        {
            _bankTransactionService = bankTransactionService;
        }

        [HttpGet("statement")]
        public async Task<ActionResult<BankStatementResponseDto>> GetStatement([FromQuery] int bankId, [FromQuery] int year, [FromQuery] int month)
        {
            try
            {
                var statement = await _bankTransactionService.GetStatementAsync(bankId, year, month);
                return Ok(statement);
            }
            catch (System.ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost]
        public async Task<ActionResult<BankTransactionDto>> Create(BankTransactionDto dto)
        {
            var result = await _bankTransactionService.CreateTransactionAsync(dto);
            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<BankTransactionDto>> Update(int id, BankTransactionDto dto)
        {
            if (id != dto.Id) return BadRequest("ID mismatch");
            
            try
            {
                var result = await _bankTransactionService.UpdateTransactionAsync(dto);
                return Ok(result);
            }
            catch (System.ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _bankTransactionService.DeleteTransactionAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
