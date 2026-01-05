
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.infrastructure;

namespace brandpulse.api.Controllers.Authentication
{
  public class ApiHealthController : BaseApiController
  {
    private readonly WoodAppContext _context;
    public ApiHealthController(WoodAppContext context)
    {
      _context = context;
    }

    [HttpGet("HealthCheck")]
    public async Task<ActionResult<IEnumerable<PersonDto?>>> GetHealthCheck()
    {
      try
      {
        var users = await _context.AppUsers.ToListAsync();
        if (users.Count == 0)
        {
          return NoContent();
        }
        return Ok(users);
      }
      catch (Exception ex)
      {
        return NotFound(ex.Message);
      }
    }

  }
}
