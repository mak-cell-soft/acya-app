using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Interfaces;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExchangeRateController : ControllerBase
    {
        private readonly IExchangeRateService _exchangeRateService;

        public ExchangeRateController(IExchangeRateService exchangeRateService)
        {
            _exchangeRateService = exchangeRateService;
        }

        [HttpGet]
        public async Task<IActionResult> GetRate([FromQuery] string from, [FromQuery] string to)
        {
            if (string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to))
            {
                return BadRequest("From and To currencies are required.");
            }

            var rate = await _exchangeRateService.GetExchangeRateAsync(from, to);
            return Ok(rate);
        }
    }
}
