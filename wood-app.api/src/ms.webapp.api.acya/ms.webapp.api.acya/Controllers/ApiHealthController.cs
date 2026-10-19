using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.infrastructure;

namespace brandpulse.api.Controllers.Authentication
{
  public class ApiHealthController : BaseApiController
  {
    private readonly WoodAppContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger<ApiHealthController>? _logger;

    public ApiHealthController(
        WoodAppContext context, 
        IConfiguration config, 
        ILogger<ApiHealthController>? logger = null)
    {
      _context = context;
      _config = config;
      _logger = logger;
    }

    [HttpGet("HealthCheck")]
    public async Task<IActionResult> GetHealthCheck(CancellationToken cancellationToken = default)
    {
      try
      {
        var canConnect = await _context.Database.CanConnectAsync(cancellationToken);
        if (!canConnect)
        {
          _logger?.LogWarning("Health check failed: database connectivity check returned false.");
          return StatusCode(StatusCodes.Status503ServiceUnavailable, new
          {
            status = "Unhealthy",
            database = "Unavailable"
          });
        }

        return Ok(new
        {
          status = "Healthy",
          database = "Connected"
        });
      }
      catch (Exception ex)
      {
        _logger?.LogError(ex, "Health check probe failed due to an unhandled exception.");
        return StatusCode(StatusCodes.Status503ServiceUnavailable, new
        {
          status = "Unhealthy",
          database = "Unavailable"
        });
      }
    }
  }
}
