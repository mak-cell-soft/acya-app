using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.infrastructure;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.api.Controllers
{
  public class CounterPartController : BaseApiController
  {
    private readonly CounterPartRepository _repository;
    private readonly WoodAppContext _context;
    private readonly IAccountService _accountService;

    public CounterPartController(CounterPartRepository repository, WoodAppContext context, IAccountService accountService)
    {
      _repository = repository;
      _context = context;
      _accountService = accountService;
    }

    [HttpGet("{id}/supplier-dashboard")]
    public async Task<ActionResult<SupplierDashboardDto>> GetSupplierDashboard(int id)
    {
      var supplier = await _repository.Get(id);
      if (supplier == null) return NotFound();

      var dashboard = new SupplierDashboardDto();
      dashboard.SupplierName = !string.IsNullOrEmpty(supplier.Name) ? supplier.Name : (supplier.Fullname ?? "Inconnu");

      // 1. Current Balance
      dashboard.CurrentBalance = await _accountService.GetCurrentBalanceAsync(id);

      // 2. Total Paid (to supplier)
      var ledgerEntries = await _context.AccountLedgers
          .Where(l => l.CounterPartId == id)
          .ToListAsync();
      
      dashboard.TotalPaid = ledgerEntries.Where(l => l.Type == "Payment" || l.Type == "RS").Sum(l => l.Debit);

      // 3. Pending Orders (BC-F not fully completed/validated)
      var pendingOrders = await _context.Documents
          .Include(d => d.Payments)
          .Include(d => d.HoldingTaxes)
          .Where(d => d.CounterPartId == id && d.Type == DocumentTypes.supplierOrder && d.DocStatus != DocStatus.Validated)
          .OrderByDescending(d => d.CreationDate)
          .ToListAsync();

      dashboard.PendingOrders = pendingOrders.Select(d => new DocumentDto(d)).ToList();
          
      // 4. Pending Receipts (BR not fully invoiced)
      var pendingReceipts = await _context.Documents
          .Include(d => d.Payments)
          .Include(d => d.HoldingTaxes)
          .Where(d => d.CounterPartId == id && d.Type == DocumentTypes.supplierReceipt && !d.IsInvoiced)
          .OrderByDescending(d => d.CreationDate)
          .ToListAsync();

      dashboard.PendingReceipts = pendingReceipts.Select(d => new DocumentDto(d)).ToList();

      // 5. Recent History (last 30 days or last 10 transactions)
      var startDate = DateTime.UtcNow.AddDays(-30);
      var endDate = DateTime.UtcNow;
      var statement = await _accountService.GetStatementAsync(id, startDate, endDate);
      dashboard.RecentTransactions = statement.Transactions.OrderByDescending(t => t.TransactionDate).Take(10).ToList();

      return Ok(dashboard);
    }

    [HttpPost("Add")]
    public async Task<ActionResult> Add(CounterPartDto dto)
    {
      // Check if the Provider with the given reference already exists
      var exists = await _repository.ExistsAsync(dto);
      if (exists.Exists)
      {
        return Conflict("Counter Part Already exists");
      }

      // Create the new Counter Part
      var newCP = new CounterPart(dto);
      newCP.Guid = Guid.NewGuid();

      newCP.AppUsers = await _context.AppUsers.FindAsync(dto.updatedbyid);
      if (newCP.AppUsers == null)
      {
        return BadRequest(new { message = "The referenced AppUser does not exist." });
      }

      if (newCP.Transporter != null)
      {
        _context.Entry(newCP.Transporter).State = EntityState.Unchanged;
      }

      var addedCP = await _repository.Add(newCP);
      if (addedCP == null)
      {
        return BadRequest("Failed to add the new Counter Part");
      }

      // Return the created article with its history
      return Ok(new { cpId = addedCP.Id, message = "Counter Part Added Succefully" });
      //return CreatedAtAction(nameof(Get), new { dto!.id }, dto);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> Get(int id)
    {
      var _provider = await _repository.Get(id);
      if (_provider == null)
      {
        return NotFound();
      }
      return Ok();
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CounterPartDto?>> Put(int id, CounterPartDto dto)
    {
      // Fetch the existing entity by id
      var existingCounterpart = await _repository.Get(id);
      if (existingCounterpart == null)
      {
        return NotFound();
      }

      // Check if there's another Counter Part with the same reference but a different ID
      var counterpartWithSameName = await _repository.ExistsAsync(dto);
      if (counterpartWithSameName.Exists && counterpartWithSameName.Dto!.id != id)
      {
        return Conflict(new { message = "Counter Part with the same Name already exists." });
      }

      // Update the properties using the constructor
      existingCounterpart.UpdateFromDto(dto);

      // Test the existence of Transporter
      if (existingCounterpart.Transporter != null)
      {
        _context.Entry(existingCounterpart.Transporter).State = EntityState.Unchanged;
      }

      // Update the entity in the repository
      var updatedEntity = await _repository.Update(existingCounterpart);
      if (updatedEntity != null)
      {
        var updatedDto = new CounterPartDto(updatedEntity);
        return Ok(updatedDto);
      }
      return NoContent();
    }

    /**
     * return all Provider where IsDeleted == false.
     * 
     */

    [HttpGet("GetAll/{_type}")]
    public async Task<ActionResult<IEnumerable<CounterPartDto>>> GetAll(string _type)
    {
      var allDtos = await _repository.GetAllAsync(_type);
      return Ok(allDtos);
    }

    [HttpDelete("DeleteSoft/{id}")]
    public async Task<ActionResult> DeleteSoft(int id)
    {
      var _p = await _repository.Get(id);
      if (_p == null)
      {
        return NotFound();
      }
      _p.IsDeleted = true;
      var updateDel = await _repository.Update(_p);
      return Ok();
    }
  }
}
