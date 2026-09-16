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
      if (claim != null && int.TryParse(claim.Value, out var id))
      {
        return id;
      }
      return 1;
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
  }
}
