using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities.DTOs.Production;
using ms.webapp.api.acya.core.Entities.Production;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers
{
  /// <summary>
  /// REST API controller for the Production module.
  /// Enforces tenant module activation gating based on Enterprise.IsManagingProduction.
  /// </summary>
  [Authorize]
  public class ProductionController : BaseApiController
  {
    private readonly IProductionRepository _productionRepo;
    private readonly IProductionService _productionService;
    private readonly WoodAppContext _context;

    public ProductionController(
      IProductionRepository productionRepo,
      IProductionService productionService,
      WoodAppContext context)
    {
      _productionRepo = productionRepo;
      _productionService = productionService;
      _context = context;
    }

    /// <summary>
    /// Checks if the Production module is enabled for the current enterprise tenant.
    /// Opt-in: requires Enterprise.IsManagingProduction == true.
    /// In dev environments without an enterprise row, defaults to true.
    /// </summary>
    private async Task<bool> IsModuleActiveAsync()
    {
      var enterprise = await _context.Enterprises.AsNoTracking().FirstOrDefaultAsync();
      return enterprise == null || enterprise.IsManagingProduction == true;
    }

    private int GetCurrentUserId()
    {
      var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("id");
      if (claim != null && int.TryParse(claim.Value, out var id) && id > 0)
      {
        return id;
      }
      return 0;
    }

    private bool IsUserAdmin()
    {
      return User.IsInRole("Admin") || User.IsInRole("SuperAdmin") ||
             User.HasClaim(ClaimTypes.Role, "Admin") || User.HasClaim(ClaimTypes.Role, "SuperAdmin") ||
             User.HasClaim(ClaimTypes.Role, "10") || User.HasClaim(ClaimTypes.Role, "20");
    }

    #region Order Endpoints

    [HttpGet]
    public async Task<ActionResult<List<ProductionOrderDto>>> GetAll(
      [FromQuery] ProductionStatus? status,
      [FromQuery] int? salesSiteId,
      [FromQuery] string? search)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      var orders = await _productionRepo.GetAllOrdersAsync(status, salesSiteId, search);
      return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductionOrderDto>> GetById(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      var order = await _productionRepo.GetOrderByIdAsync(id);
      if (order == null)
      {
        return NotFound(new { message = $"Ordre de fabrication #{id} introuvable." });
      }

      return Ok(order);
    }

    [HttpPost]
    public async Task<ActionResult<ProductionOrderDto>> Create([FromBody] CreateProductionOrderDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var created = await _productionRepo.CreateOrderAsync(dto, userId);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
      }
      catch (Exception ex)
      {
        return BadRequest(new { message = ex.Message });
      }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, [FromBody] UpdateProductionOrderDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var success = await _productionRepo.UpdateOrderAsync(id, dto, userId);
        if (!success)
        {
          return NotFound(new { message = $"Ordre #{id} introuvable ou supprimé." });
        }

        var updated = await _productionRepo.GetOrderByIdAsync(id);
        return Ok(updated);
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!IsUserAdmin())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Action réservée aux administrateurs." });
      }

      try
      {
        int userId = GetCurrentUserId();
        var success = await _productionRepo.SoftDeleteOrderAsync(id, userId);
        if (!success)
        {
          return NotFound(new { message = $"Ordre #{id} introuvable." });
        }

        return Ok(new { message = "Ordre supprimé avec succès." });
      }
      catch (InvalidOperationException ex) when (ex.Message.Contains("pointages des employés") || ex.Message.Contains("heures de travail"))
      {
        return StatusCode(StatusCodes.Status409Conflict, new { message = ex.Message });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    #endregion

    #region Workflow State Transitions

    [HttpPost("{id}/start")]
    public async Task<ActionResult<ProductionOrderDto>> StartOrder(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      int userId = GetCurrentUserId();
      if (userId <= 0)
      {
        return Unauthorized(new { message = "Utilisateur non authentifié ou identifiant invalide." });
      }

      var result = await _productionService.StartOrderAsync(id, userId);
      if (!result.Success)
      {
        return BadRequest(new { message = result.Message });
      }

      return Ok(result.Order);
    }

    [HttpPost("{id}/validate")]
    public async Task<ActionResult<ProductionOrderDto>> ValidateOrder(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      int userId = GetCurrentUserId();
      if (userId <= 0)
      {
        return Unauthorized(new { message = "Utilisateur non authentifié ou identifiant invalide." });
      }

      var result = await _productionService.ValidateOrderAsync(id, userId);
      if (!result.Success)
      {
        return BadRequest(new { message = result.Message });
      }

      return Ok(result.Order);
    }

    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<ProductionOrderDto>> CancelOrder(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      int userId = GetCurrentUserId();
      if (userId <= 0)
      {
        return Unauthorized(new { message = "Utilisateur non authentifié ou identifiant invalide." });
      }

      var result = await _productionService.CancelOrderAsync(id, userId);
      if (!result.Success)
      {
        return BadRequest(new { message = result.Message });
      }

      return Ok(result.Order);
    }

    #endregion

    #region Steps Endpoints

    [HttpPost("{id}/steps")]
    public async Task<ActionResult<ProductionStepDto>> AddStep(int id, [FromBody] CreateProductionStepDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var step = await _productionRepo.AddStepAsync(id, dto, userId);
        if (step == null)
        {
          return NotFound(new { message = $"Ordre #{id} introuvable." });
        }

        return Ok(step);
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    [HttpPut("steps/{stepId}")]
    public async Task<ActionResult> UpdateStep(int stepId, [FromBody] UpdateProductionStepDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var success = await _productionRepo.UpdateStepAsync(stepId, dto, userId);
        if (!success)
        {
          return NotFound(new { message = $"Étape #{stepId} introuvable." });
        }

        return Ok(new { message = "Étape mise à jour avec succès." });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    [HttpDelete("steps/{stepId}")]
    public async Task<ActionResult> DeleteStep(int stepId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      try
      {
        var success = await _productionRepo.DeleteStepAsync(stepId);
        if (!success)
        {
          return NotFound(new { message = $"Étape #{stepId} introuvable." });
        }

        return Ok(new { message = "Étape supprimée avec succès." });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    [HttpPost("steps/{stepId}/complete")]
    public async Task<ActionResult<ProductionStepDto>> CompleteStep(int stepId, [FromBody] CompleteStepDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      try
      {
        int userId = GetCurrentUserId();
        var step = await _productionRepo.CompleteStepAsync(stepId, dto, userId);
        if (step == null)
        {
          return NotFound(new { message = $"Étape #{stepId} introuvable." });
        }

        return Ok(step);
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    #endregion

    #region Inputs Endpoints

    [HttpPost("steps/{stepId}/inputs")]
    public async Task<ActionResult<ProductionInputDto>> AddInput(int stepId, [FromBody] CreateProductionInputDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var input = await _productionRepo.AddInputAsync(stepId, dto, userId);
        if (input == null)
        {
          return NotFound(new { message = $"Étape #{stepId} introuvable." });
        }

        return Ok(input);
      }
      catch (ArgumentException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    [HttpDelete("inputs/{inputId}")]
    public async Task<ActionResult> DeleteInput(int inputId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      try
      {
        var success = await _productionRepo.DeleteInputAsync(inputId);
        if (!success)
        {
          return NotFound(new { message = $"Matière #{inputId} introuvable." });
        }

        return Ok(new { message = "Matière supprimée avec succès." });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    #endregion

    #region On-the-fly Merchandise Creation (Q3 Decision)

    [HttpPost("quick-merchandise")]
    public async Task<ActionResult> QuickCreateMerchandise([FromBody] QuickCreateMerchandiseDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var merchandise = await _productionRepo.QuickCreateMerchandiseAsync(dto, userId);
        return Ok(new
        {
          id = merchandise.Id,
          packageReference = merchandise.PackageReference,
          description = merchandise.Description,
          articleId = merchandise.ArticleId
        });
      }
      catch (ArgumentException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    #endregion

    #region Step Workers Endpoints

    [HttpGet("steps/{stepId}/workers")]
    public async Task<ActionResult<List<ProductionStepWorkerDto>>> GetStepWorkers(int stepId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      var workers = await _productionRepo.GetStepWorkersAsync(stepId);
      return Ok(workers);
    }

    [HttpPost("steps/{stepId}/workers")]
    public async Task<ActionResult<ProductionStepWorkerDto>> AddStepWorker(int stepId, [FromBody] CreateProductionStepWorkerDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var worker = await _productionRepo.AddStepWorkerAsync(stepId, dto, userId);
        if (worker == null)
        {
          return NotFound(new { message = $"Étape #{stepId} introuvable." });
        }

        return Ok(worker);
      }
      catch (ArgumentException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    [HttpPut("workers/{workerId}")]
    public async Task<ActionResult> UpdateStepWorker(int workerId, [FromBody] UpdateProductionStepWorkerDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var success = await _productionRepo.UpdateStepWorkerAsync(workerId, dto, userId);
        if (!success)
        {
          return NotFound(new { message = $"Affectation d'ouvrier #{workerId} introuvable." });
        }

        return Ok(new { message = "Affectation mise à jour avec succès." });
      }
      catch (ArgumentException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    [HttpDelete("workers/{workerId}")]
    public async Task<ActionResult> DeleteStepWorker(int workerId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      try
      {
        var success = await _productionRepo.DeleteStepWorkerAsync(workerId);
        if (!success)
        {
          return NotFound(new { message = $"Affectation d'ouvrier #{workerId} introuvable." });
        }

        return Ok(new { message = "Affectation supprimée avec succès." });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    #endregion

    #region Step Work Logs Endpoints

    [HttpGet("steps/{stepId}/work-logs")]
    public async Task<ActionResult<List<ProductionStepWorkLogDto>>> GetStepWorkLogs(int stepId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      var workLogs = await _productionRepo.GetStepWorkLogsAsync(stepId);
      return Ok(workLogs);
    }

    [HttpPost("steps/{stepId}/work-logs")]
    public async Task<ActionResult<ProductionStepWorkLogDto>> AddStepWorkLog(int stepId, [FromBody] CreateProductionStepWorkLogDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var workLog = await _productionRepo.AddStepWorkLogAsync(stepId, dto, userId);
        if (workLog == null)
        {
          return NotFound(new { message = $"Étape #{stepId} introuvable." });
        }

        return Ok(workLog);
      }
      catch (ArgumentException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    [HttpPut("work-logs/{workLogId}")]
    public async Task<ActionResult> UpdateStepWorkLog(int workLogId, [FromBody] UpdateProductionStepWorkLogDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var success = await _productionRepo.UpdateStepWorkLogAsync(workLogId, dto, userId);
        if (!success)
        {
          return NotFound(new { message = $"Session de travail #{workLogId} introuvable." });
        }

        return Ok(new { message = "Session de travail mise à jour avec succès." });
      }
      catch (ArgumentException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    [HttpDelete("work-logs/{workLogId}")]
    public async Task<ActionResult> DeleteStepWorkLog(int workLogId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      try
      {
        var success = await _productionRepo.DeleteStepWorkLogAsync(workLogId);
        if (!success)
        {
          return NotFound(new { message = $"Session de travail #{workLogId} introuvable." });
        }

        return Ok(new { message = "Session de travail supprimée avec succès." });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    #endregion

    #region Other Work Entries Endpoints

    [HttpGet("other-work")]
    public async Task<ActionResult<List<ProductionOtherWorkEntryDto>>> GetOtherWorkEntries(
      [FromQuery] DateTime? startDate,
      [FromQuery] DateTime? endDate,
      [FromQuery] int? personId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      var entries = await _productionRepo.GetOtherWorkEntriesAsync(startDate, endDate, personId);
      return Ok(entries);
    }

    [HttpGet("other-work/{id}")]
    public async Task<ActionResult<ProductionOtherWorkEntryDto>> GetOtherWorkEntryById(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      var entry = await _productionRepo.GetOtherWorkEntryByIdAsync(id);
      if (entry == null)
      {
        return NotFound(new { message = $"Prestation de travail #{id} introuvable." });
      }

      return Ok(entry);
    }

    [HttpPost("other-work")]
    public async Task<ActionResult<ProductionOtherWorkEntryDto>> CreateOtherWorkEntry([FromBody] CreateProductionOtherWorkEntryDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var created = await _productionRepo.CreateOtherWorkEntryAsync(dto, userId);
        return CreatedAtAction(nameof(GetOtherWorkEntryById), new { id = created.Id }, created);
      }
      catch (ArgumentException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    [HttpPut("other-work/{id}")]
    public async Task<ActionResult> UpdateOtherWorkEntry(int id, [FromBody] UpdateProductionOtherWorkEntryDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (!ModelState.IsValid)
      {
        return BadRequest(ModelState);
      }

      try
      {
        int userId = GetCurrentUserId();
        var success = await _productionRepo.UpdateOtherWorkEntryAsync(id, dto, userId);
        if (!success)
        {
          return NotFound(new { message = $"Prestation de travail #{id} introuvable ou supprimée." });
        }

        var updated = await _productionRepo.GetOtherWorkEntryByIdAsync(id);
        return Ok(updated);
      }
      catch (ArgumentException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    [HttpDelete("other-work/{id}")]
    public async Task<ActionResult> DeleteOtherWorkEntry(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      try
      {
        int userId = GetCurrentUserId();
        var success = await _productionRepo.DeleteOtherWorkEntryAsync(id, userId);
        if (!success)
        {
          return NotFound(new { message = $"Prestation de travail #{id} introuvable." });
        }

        return Ok(new { message = "Prestation supprimée avec succès." });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    #endregion

    #region Monthly Payables Endpoints

    [HttpGet("payables/monthly")]
    public async Task<ActionResult<MonthlyEmployeePayableSummaryDto>> GetMonthlyPayableSummary(
      [FromQuery] int year,
      [FromQuery] int month)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Le module Production n'est pas activé pour cette entreprise." });
      }

      if (year < 2000 || year > 2100)
      {
        return BadRequest(new { message = "L'année doit être comprise entre 2000 et 2100." });
      }

      if (month < 1 || month > 12)
      {
        return BadRequest(new { message = "Le mois doit être compris entre 1 et 12." });
      }

      try
      {
        var summary = await _productionRepo.GetMonthlyPayableSummaryAsync(year, month);
        return Ok(summary);
      }
      catch (ArgumentException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    #endregion
  }
}
