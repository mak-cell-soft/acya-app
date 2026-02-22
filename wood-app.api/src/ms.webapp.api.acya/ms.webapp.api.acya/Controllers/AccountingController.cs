using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.core.Entities.DTOs;
using System;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Controllers
{
    [Authorize]
    public class AccountingController : BaseApiController
    {
        private readonly IAccountService _accountService;

        public AccountingController(IAccountService accountService)
        {
            _accountService = accountService;
        }

        [HttpGet("balance/{counterpartId}")]
        public async Task<ActionResult<decimal>> GetBalance(int counterpartId)
        {
            try
            {
                var balance = await _accountService.GetCurrentBalanceAsync(counterpartId);
                return Ok(balance);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("statement/{counterpartId}")]
        public async Task<ActionResult<AccountStatementDto>> GetStatement(int counterpartId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                if (startDate > endDate) return BadRequest("Start date cannot be after end date.");
                
                var statement = await _accountService.GetStatementAsync(counterpartId, startDate, endDate);
                return Ok(statement);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
