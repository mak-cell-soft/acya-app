using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities.Chantier;
using ms.webapp.api.acya.core.Entities.DTOs.Chantier;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers
{
  /// <summary>
  /// REST API controller for construction site management (Chantier module).
  /// Implements module activation gating based on Enterprise.IsManagingConstructions.
  /// </summary>
  public class ChantierController : BaseApiController
  {
    private readonly IChantierRepository _chantierRepo;
    private readonly WoodAppContext _context;

    public ChantierController(IChantierRepository chantierRepo, WoodAppContext context)
    {
      _chantierRepo = chantierRepo;
      _context = context;
    }

    /// <summary>
    /// Checks if the Chantier module is enabled for the current tenant.
    /// Uses the existing Enterprise.IsManagingConstructions feature flag.
    /// </summary>
    private async Task<bool> IsModuleActiveAsync()
    {
      var enterprise = await _context.Enterprises.AsNoTracking().FirstOrDefaultAsync();
      // If flag is explicitly false, module is disabled. Defaults to active if null or true in dev.
      return enterprise == null || enterprise.IsManagingConstructions != false;
    }

    private int GetCurrentUserId()
    {
      var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("id");
      if (claim != null && int.TryParse(claim.Value, out var id))
      {
        return id;
      }
      return 1; // Fallback system admin user
    }

    #region Chantier CRUD

    [HttpGet]
    public async Task<ActionResult<List<ChantierListItemDto>>> GetAll(
      [FromQuery] ChantierStatus? status,
      [FromQuery] ChantierFlag? healthFlag,
      [FromQuery] string? search)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé pour cette entreprise.");
      }

      var items = await _chantierRepo.GetAllAsync(status, healthFlag, search);
      return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ChantierDetailDto>> GetById(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var detail = await _chantierRepo.GetDetailByIdAsync(id);
      if (detail == null)
      {
        return NotFound($"Chantier avec l'identifiant {id} introuvable.");
      }

      return Ok(detail);
    }

    [HttpPost]
    public async Task<ActionResult<ChantierDetailDto>> Create([FromBody] CreateChantierDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      if (string.IsNullOrWhiteSpace(dto.Name))
      {
        return BadRequest("Le nom du chantier est obligatoire.");
      }

      var userId = GetCurrentUserId();
      var created = await _chantierRepo.CreateAsync(dto, userId);
      var detail = await _chantierRepo.GetDetailByIdAsync(created.Id);

      return CreatedAtAction(nameof(GetById), new { id = created.Id }, detail);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateChantierDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var userId = GetCurrentUserId();
      var success = await _chantierRepo.UpdateAsync(id, dto, userId);
      if (!success)
      {
        return NotFound();
      }

      return NoContent();
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateChantierStatusDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var userId = GetCurrentUserId();
      var success = await _chantierRepo.UpdateStatusAsync(id, dto, userId);
      if (!success)
      {
        return NotFound();
      }

      return NoContent();
    }

    [HttpPatch("{id}/progress")]
    public async Task<IActionResult> UpdateProgress(int id, [FromBody] UpdateChantierProgressDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var userId = GetCurrentUserId();
      var success = await _chantierRepo.UpdateProgressAsync(id, dto.ProgressPct, userId);
      if (!success)
      {
        return NotFound();
      }

      return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> SoftDelete(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var userId = GetCurrentUserId();
      var success = await _chantierRepo.SoftDeleteAsync(id, userId);
      if (!success)
      {
        return NotFound();
      }

      return NoContent();
    }

    #endregion

    #region Team Members

    [HttpGet("{id}/team")]
    public async Task<ActionResult<List<ChantierTeamMemberDto>>> GetTeam(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var members = await _chantierRepo.GetTeamMembersAsync(id);
      return Ok(members);
    }

    [HttpPost("{id}/team")]
    public async Task<ActionResult<ChantierTeamMemberDto>> AssignTeamMember(int id, [FromBody] AssignTeamMemberDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      if (dto.PersonId <= 0 || string.IsNullOrWhiteSpace(dto.ChantierRole))
      {
        return BadRequest("Membre et rôle obligatoires.");
      }

      var userId = GetCurrentUserId();
      var member = await _chantierRepo.AssignTeamMemberAsync(id, dto, userId);
      if (member == null)
      {
        return NotFound("Chantier introuvable.");
      }

      return Ok(member);
    }

    [HttpDelete("{id}/team/{memberId}")]
    public async Task<IActionResult> ReleaseTeamMember(int id, int memberId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var userId = GetCurrentUserId();
      var success = await _chantierRepo.ReleaseTeamMemberAsync(id, memberId, userId);
      if (!success)
      {
        return NotFound();
      }

      return NoContent();
    }

    #endregion

    #region Production (Phases & Tasks)

    [HttpGet("{id}/phases")]
    public async Task<ActionResult<List<ChantierPhaseDto>>> GetPhases(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var phases = await _chantierRepo.GetPhasesAsync(id);
      return Ok(phases);
    }

    [HttpPost("{id}/phases")]
    public async Task<ActionResult<ChantierPhaseDto>> CreatePhase(int id, [FromBody] CreateChantierPhaseDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      if (string.IsNullOrWhiteSpace(dto.Name))
      {
        return BadRequest("Le nom de la phase est obligatoire.");
      }

      var phase = await _chantierRepo.CreatePhaseAsync(id, dto);
      return Ok(phase);
    }

    [HttpDelete("{id}/phases/{phaseId}")]
    public async Task<IActionResult> DeletePhase(int id, int phaseId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var success = await _chantierRepo.DeletePhaseAsync(phaseId);
      if (!success)
      {
        return NotFound();
      }

      return NoContent();
    }

    [HttpPost("{id}/phases/{phaseId}/tasks")]
    public async Task<ActionResult<ChantierTaskDto>> CreateTask(int id, int phaseId, [FromBody] CreateChantierTaskDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      if (string.IsNullOrWhiteSpace(dto.Label))
      {
        return BadRequest("Le libellé de la tâche est obligatoire.");
      }

      var task = await _chantierRepo.CreateTaskAsync(phaseId, dto);
      if (task == null)
      {
        return NotFound("Phase introuvable.");
      }

      return Ok(task);
    }

    [HttpPatch("{id}/phases/{phaseId}/tasks/{taskId}/status")]
    public async Task<IActionResult> UpdateTaskStatus(int id, int phaseId, int taskId, [FromBody] UpdateTaskStatusDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var success = await _chantierRepo.UpdateTaskStatusAsync(taskId, dto);
      if (!success)
      {
        return NotFound();
      }

      return NoContent();
    }

    [HttpDelete("{id}/phases/{phaseId}/tasks/{taskId}")]
    public async Task<IActionResult> DeleteTask(int id, int phaseId, int taskId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var success = await _chantierRepo.DeleteTaskAsync(taskId);
      if (!success)
      {
        return NotFound();
      }

      return NoContent();
    }

    #endregion

    #region Materials (Option C dedicated ledger)

    [HttpGet("{id}/materials")]
    public async Task<ActionResult<List<ChantierMaterialRequirementDto>>> GetMaterials(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var materials = await _chantierRepo.GetMaterialRequirementsAsync(id);
      return Ok(materials);
    }

    [HttpPost("{id}/materials")]
    public async Task<ActionResult<ChantierMaterialRequirementDto>> AddMaterialRequirement(int id, [FromBody] CreateMaterialRequirementDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      if (dto.MerchandiseId <= 0 || dto.RequiredQty <= 0)
      {
        return BadRequest("Article et quantité requise valides sont obligatoires.");
      }

      var result = await _chantierRepo.AddMaterialRequirementAsync(id, dto);
      if (result == null)
      {
        return BadRequest("Article introuvable dans le catalogue.");
      }

      return Ok(result);
    }

    [HttpDelete("{id}/materials/{reqId}")]
    public async Task<IActionResult> DeleteMaterialRequirement(int id, int reqId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var success = await _chantierRepo.DeleteMaterialRequirementAsync(reqId);
      if (!success)
      {
        return NotFound();
      }

      return NoContent();
    }

    [HttpGet("{id}/consumptions")]
    public async Task<ActionResult<List<ChantierMaterialConsumptionDto>>> GetConsumptions(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var consumptions = await _chantierRepo.GetMaterialConsumptionsAsync(id);
      return Ok(consumptions);
    }

    [HttpPost("{id}/consumptions")]
    public async Task<ActionResult<ChantierMaterialConsumptionDto>> LogConsumption(int id, [FromBody] LogMaterialConsumptionDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      if (dto.MerchandiseId <= 0 || dto.ConsumedQty <= 0)
      {
        return BadRequest("Article et quantité consommée valides sont obligatoires.");
      }

      var userId = GetCurrentUserId();
      var result = await _chantierRepo.LogMaterialConsumptionAsync(id, dto, userId);
      if (result == null)
      {
        return NotFound("Chantier introuvable.");
      }

      return Ok(result);
    }

    #endregion

    #region Suivi & Alerts

    [HttpGet("{id}/progress-entries")]
    public async Task<ActionResult<List<ChantierProgressEntryDto>>> GetProgressEntries(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var entries = await _chantierRepo.GetProgressEntriesAsync(id);
      return Ok(entries);
    }

    [HttpPost("{id}/progress-entries")]
    public async Task<ActionResult<ChantierProgressEntryDto>> AddProgressEntry(int id, [FromBody] CreateProgressEntryDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      if (string.IsNullOrWhiteSpace(dto.Title))
      {
        return BadRequest("Le titre de l'entrée est obligatoire.");
      }

      var userId = GetCurrentUserId();
      var entry = await _chantierRepo.AddProgressEntryAsync(id, dto, userId);
      return Ok(entry);
    }

    [HttpGet("{id}/alerts")]
    public async Task<ActionResult<List<ChantierAlertDto>>> GetAlerts(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var alerts = await _chantierRepo.GetAlertsAsync(id);
      return Ok(alerts);
    }

    [HttpPost("{id}/alerts")]
    public async Task<ActionResult<ChantierAlertDto>> AddAlert(int id, [FromBody] CreateChantierAlertDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      if (string.IsNullOrWhiteSpace(dto.Message))
      {
        return BadRequest("Le message de l'alerte est obligatoire.");
      }

      var alert = await _chantierRepo.AddAlertAsync(id, dto);
      return Ok(alert);
    }

    [HttpPatch("{id}/alerts/{alertId}/resolve")]
    public async Task<IActionResult> ResolveAlert(int id, int alertId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var success = await _chantierRepo.ResolveAlertAsync(alertId);
      if (!success)
      {
        return NotFound();
      }

      return NoContent();
    }

    #endregion

    #region Vehicles (Magasin)

    [HttpGet("{id}/vehicles")]
    public async Task<ActionResult<List<ChantierVehicleAssignmentDto>>> GetVehicles(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var list = await _chantierRepo.GetVehicleAssignmentsAsync(id);
      return Ok(list);
    }

    [HttpPost("{id}/vehicles")]
    public async Task<ActionResult<ChantierVehicleAssignmentDto>> AssignVehicle(int id, [FromBody] AssignChantierVehicleDto dto)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      if (dto.VehicleId <= 0)
      {
        return BadRequest("Identifiant du véhicule obligatoire.");
      }

      var assignment = await _chantierRepo.AssignVehicleAsync(id, dto);
      return Ok(assignment);
    }

    [HttpDelete("{id}/vehicles/{assignmentId}")]
    public async Task<IActionResult> ReleaseVehicle(int id, int assignmentId)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var success = await _chantierRepo.ReleaseVehicleAssignmentAsync(assignmentId);
      if (!success)
      {
        return NotFound();
      }

      return NoContent();
    }

    #endregion

    #region Statistics

    [HttpGet("{id}/statistics")]
    public async Task<ActionResult<ChantierStatisticsDto>> GetStatistics(int id)
    {
      if (!await IsModuleActiveAsync())
      {
        return StatusCode(StatusCodes.Status403Forbidden, "Module Chantier non activé.");
      }

      var stats = await _chantierRepo.GetStatisticsAsync(id);
      return Ok(stats);
    }

    #endregion
  }
}
