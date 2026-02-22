using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.core.Entities.DTOs;
using System;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AccountController : ControllerBase
    {
        private readonly IAccountService _accountService;

        public AccountController(IAccountService accountService)
        {
            _accountService = accountService;
        }

        [HttpGet("statement/{counterpartId}")]
        public async Task<ActionResult<AccountStatementDto>> GetStatement(int counterpartId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                // Ensure default dates if not provided
                if (startDate == DateTime.MinValue) startDate = DateTime.UtcNow.AddMonths(-1);
                if (endDate == DateTime.MinValue) endDate = DateTime.UtcNow;

                var statement = await _accountService.GetStatementAsync(counterpartId, startDate, endDate);
                return Ok(statement);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        [HttpGet("balance/{counterpartId}")]
        public async Task<ActionResult<decimal>> GetBalance(int counterpartId)
        {
            try
            {
                var balance = await _accountService.GetCurrentBalanceAsync(counterpartId);
                return Ok(balance);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }
    }
}
