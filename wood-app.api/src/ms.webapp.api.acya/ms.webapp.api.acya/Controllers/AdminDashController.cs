using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.api.Controllers
{
    public class AdminDashController : BaseApiController
    {
        private readonly IBalanceService _balanceService;

        public AdminDashController(IBalanceService balanceService)
        {
            _balanceService = balanceService;
        }

        [HttpGet("customer-balances")]
        public async Task<ActionResult<IEnumerable<BalanceEntryDto>>> GetCustomerBalances()
        {
            try
            {
                var result = await _balanceService.GetCustomerBalancesAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("supplier-balances")]
        public async Task<ActionResult<IEnumerable<BalanceEntryDto>>> GetSupplierBalances()
        {
            try
            {
                var result = await _balanceService.GetSupplierBalancesAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("refresh-balances")]
        public async Task<IActionResult> RefreshBalances()
        {
            try
            {
                await _balanceService.RefreshAllBalancesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
