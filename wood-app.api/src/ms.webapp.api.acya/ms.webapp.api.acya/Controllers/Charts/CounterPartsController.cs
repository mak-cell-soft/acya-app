using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.DTOs.Charts;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers.Charts
{
  public class CounterPartsController : BaseApiController
  {
    private readonly CounterPartRepository _cpRepositorey;
    public CounterPartsController(CounterPartRepository counterPartRepository) 
    {
      _cpRepositorey= counterPartRepository;
    }

    [HttpPost("Invoices")]
    public Task<ActionResult<InvoicesDTO>?> GetInvoices()
    {
      return null!;
    }
  }
}
