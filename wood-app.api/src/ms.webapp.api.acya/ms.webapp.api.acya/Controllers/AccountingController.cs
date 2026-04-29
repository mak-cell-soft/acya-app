using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.core.Entities.DTOs;
using System;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Controllers
{
    public class AccountingController : BaseApiController
    {
        private readonly IAccountService _accountService;
        private readonly IBalanceService _balanceService;

        public AccountingController(IAccountService accountService, IBalanceService balanceService)
        {
            _accountService = accountService;
            _balanceService = balanceService;
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
                if (startDate > endDate) return BadRequest(new { message = "Start date cannot be after end date." });
                
                var statement = await _accountService.GetStatementAsync(counterpartId, startDate, endDate);
                return Ok(statement);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("resync-all")]
        public async Task<ActionResult> ResyncAll()
        {
            try
            {
                await _accountService.ResyncAllLedgerAsync();
                await _balanceService.RefreshAllBalancesAsync();
                return Ok(new { message = "Ledger and balances re-synced successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
