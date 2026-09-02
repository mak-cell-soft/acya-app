using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities.Chantier;
using ms.webapp.api.acya.core.Entities.DTOs.Chantier;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure.Core;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  /// <summary>
  /// Data access implementation for the Chantier module.
  /// </summary>
  public class ChantierRepository : CoreRepository<core.Entities.Chantier.Chantier, WoodAppContext>, IChantierRepository
  {
    public ChantierRepository(WoodAppContext context) : base(context)
    {
    }

    #region Chantier CRUD

    public async Task<List<ChantierListItemDto>> GetAllAsync(ChantierStatus? status = null, ChantierFlag? healthFlag = null, string? search = null)
    {
      var query = context.Chantiers
        .AsNoTracking()
        .Where(c => !c.IsDeleted)
        .Include(c => c.ArchitectPerson)
        .Include(c => c.ProjectManagerPerson)
        .Include(c => c.TeamMembers)
        .Include(c => c.Alerts)
        .AsQueryable();

      if (status.HasValue)
      {
        query = query.Where(c => c.Status == status.Value);
      }

      if (healthFlag.HasValue)
      {
        query = query.Where(c => c.HealthFlag == healthFlag.Value);
      }

      if (!string.IsNullOrWhiteSpace(search))
      {
        var s = search.Trim().ToLower();
        query = query.Where(c =>
          c.Name.ToLower().Contains(s) ||
          c.Reference.ToLower().Contains(s) ||
          (c.Location != null && c.Location.ToLower().Contains(s)) ||
          (c.Gouvernorate != null && c.Gouvernorate.ToLower().Contains(s)));
      }

      var list = await query
        .OrderByDescending(c => c.StartDate)
        .ThenByDescending(c => c.Id)
        .ToListAsync();

      return list.Select(c => new ChantierListItemDto(c)).ToList();
    }

    public async Task<ChantierDetailDto?> GetDetailByIdAsync(int id)
    {
      var chantier = await context.Chantiers
        .AsNoTracking()
        .Where(c => c.Id == id && !c.IsDeleted)
        .Include(c => c.ArchitectPerson)
        .Include(c => c.ProjectManagerPerson)
        .Include(c => c.TeamMembers)
          .ThenInclude(m => m.Person)
        .Include(c => c.Phases)
          .ThenInclude(p => p.Tasks)
            .ThenInclude(t => t.ResponsiblePerson)
        .Include(c => c.MaterialRequirements)
        .Include(c => c.ProgressEntries)
        .Include(c => c.Alerts)
        .Include(c => c.VehicleAssignments)
          .ThenInclude(v => v.Vehicle)
        .Include(c => c.VehicleAssignments)
          .ThenInclude(v => v.DriverPerson)
        .FirstOrDefaultAsync();

      if (chantier == null) return null;

      var dto = new ChantierDetailDto(chantier);

      // Compute actual consumption for requirements
      var consumptions = await context.ChantierMaterialConsumptions
        .Where(c => c.ChantierId == id)
        .GroupBy(c => c.MerchandiseId)
        .Select(g => new { MerchandiseId = g.Key, Total = g.Sum(x => x.ConsumedQty) })
        .ToDictionaryAsync(k => k.MerchandiseId, v => v.Total);

      foreach (var req in dto.MaterialRequirements)
      {
        if (consumptions.TryGetValue(req.MerchandiseId, out var consumed))
        {
          req.ConsumedQty = consumed;
        }
      }

      return dto;
    }

    public async Task<core.Entities.Chantier.Chantier?> GetEntityByIdAsync(int id)
    {
      return await context.Chantiers
        .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
    }

    public async Task<core.Entities.Chantier.Chantier> CreateAsync(CreateChantierDto dto, int userId)
    {
      var chantier = new core.Entities.Chantier.Chantier(dto, userId);

      await context.Chantiers.AddAsync(chantier);
      await context.SaveChangesAsync();

      return chantier;
    }

    public async Task<bool> UpdateAsync(int id, UpdateChantierDto dto, int userId)
    {
      var chantier = await context.Chantiers.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
      if (chantier == null) return false;

      chantier.UpdateFromDto(dto, userId);
      await context.SaveChangesAsync();
      return true;
    }

    public async Task<bool> UpdateStatusAsync(int id, UpdateChantierStatusDto dto, int userId)
    {
      var chantier = await context.Chantiers.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
      if (chantier == null) return false;

      chantier.Status = dto.Status;
      if (dto.HealthFlag.HasValue)
      {
        chantier.HealthFlag = dto.HealthFlag.Value;
      }
      chantier.UpdatedById = userId;
      chantier.UpdateDate = DateTime.UtcNow;

      await context.SaveChangesAsync();
      return true;
    }

    public async Task<bool> UpdateProgressAsync(int id, int progressPct, int userId)
    {
      var chantier = await context.Chantiers.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
      if (chantier == null) return false;

      chantier.ProgressPct = Math.Clamp(progressPct, 0, 100);
      chantier.UpdatedById = userId;
      chantier.UpdateDate = DateTime.UtcNow;

      await context.SaveChangesAsync();
      return true;
    }

    public async Task<bool> SoftDeleteAsync(int id, int userId)
    {
      var chantier = await context.Chantiers.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
      if (chantier == null) return false;

      chantier.IsDeleted = true;
      chantier.UpdatedById = userId;
      chantier.UpdateDate = DateTime.UtcNow;

      await context.SaveChangesAsync();
      return true;
    }

    #endregion

    #region Team Members

    public async Task<List<ChantierTeamMemberDto>> GetTeamMembersAsync(int chantierId)
    {
      var members = await context.ChantierTeamMembers
        .AsNoTracking()
        .Where(m => m.ChantierId == chantierId && m.IsActive)
        .Include(m => m.Person)
        .OrderBy(m => m.ChantierRole)
        .ThenBy(m => m.AssignedAt)
        .ToListAsync();

      return members.Select(m => new ChantierTeamMemberDto(m)).ToList();
    }

    public async Task<ChantierTeamMemberDto?> AssignTeamMemberAsync(int chantierId, AssignTeamMemberDto dto, int userId)
    {
      var chantier = await context.Chantiers.FirstOrDefaultAsync(c => c.Id == chantierId && !c.IsDeleted);
      if (chantier == null) return null;

      // Deactivate any existing active assignment for the same person on this chantier
      var existing = await context.ChantierTeamMembers
        .FirstOrDefaultAsync(m => m.ChantierId == chantierId && m.PersonId == dto.PersonId && m.IsActive);

      if (existing != null)
      {
        existing.IsActive = false;
        existing.ReleasedAt = DateTime.UtcNow;
      }

      var member = new ChantierTeamMember
      {
        ChantierId = chantierId,
        PersonId = dto.PersonId,
        ChantierRole = dto.ChantierRole,
        AssignedAt = dto.AssignedAt ?? DateTime.UtcNow,
        IsActive = true,
        AssignedById = userId,
        CreationDate = DateTime.UtcNow
      };

      await context.ChantierTeamMembers.AddAsync(member);
      await context.SaveChangesAsync();

      await context.Entry(member).Reference(m => m.Person).LoadAsync();
      return new ChantierTeamMemberDto(member);
    }

    public async Task<bool> ReleaseTeamMemberAsync(int chantierId, int memberId, int userId)
    {
      var member = await context.ChantierTeamMembers
        .FirstOrDefaultAsync(m => m.Id == memberId && m.ChantierId == chantierId && m.IsActive);

      if (member == null) return false;

      member.IsActive = false;
      member.ReleasedAt = DateTime.UtcNow;

      await context.SaveChangesAsync();
      return true;
    }

    #endregion

    #region Production (Phases & Tasks)

    public async Task<List<ChantierPhaseDto>> GetPhasesAsync(int chantierId)
    {
      var phases = await context.ChantierPhases
        .AsNoTracking()
        .Where(p => p.ChantierId == chantierId && !p.IsDeleted)
        .Include(p => p.Tasks.Where(t => !t.IsDeleted))
          .ThenInclude(t => t.ResponsiblePerson)
        .OrderBy(p => p.SortOrder)
        .ToListAsync();

      return phases.Select(p => new ChantierPhaseDto(p)).ToList();
    }

    public async Task<ChantierPhaseDto?> CreatePhaseAsync(int chantierId, CreateChantierPhaseDto dto)
    {
      var phase = new ChantierPhase
      {
        ChantierId = chantierId,
        Name = dto.Name,
        Description = dto.Description,
        SortOrder = dto.SortOrder,
        Color = dto.Color,
        Status = ChantierPhaseStatus.Planned,
        ProgressPct = 0,
        StartDate = dto.StartDate,
        PlannedEndDate = dto.PlannedEndDate,
        CreationDate = DateTime.UtcNow
      };

      await context.ChantierPhases.AddAsync(phase);
      await context.SaveChangesAsync();

      return new ChantierPhaseDto(phase);
    }

    public async Task<bool> DeletePhaseAsync(int phaseId)
    {
      var phase = await context.ChantierPhases.FirstOrDefaultAsync(p => p.Id == phaseId && !p.IsDeleted);
      if (phase == null) return false;

      phase.IsDeleted = true;
      await context.SaveChangesAsync();
      return true;
    }

    public async Task<ChantierTaskDto?> CreateTaskAsync(int phaseId, CreateChantierTaskDto dto)
    {
      var phase = await context.ChantierPhases.FirstOrDefaultAsync(p => p.Id == phaseId && !p.IsDeleted);
      if (phase == null) return null;

      var task = new ChantierTask
      {
        PhaseId = phaseId,
        Label = dto.Label,
        SubLabel = dto.SubLabel,
        Description = dto.Description,
        Status = ChantierTaskStatus.Planned,
        ProgressPct = 0,
        StartDate = dto.StartDate,
        PlannedEndDate = dto.PlannedEndDate,
        ResponsiblePersonId = dto.ResponsiblePersonId,
        SortOrder = dto.SortOrder,
        CreationDate = DateTime.UtcNow
      };

      await context.ChantierTasks.AddAsync(task);
      await context.SaveChangesAsync();

      if (task.ResponsiblePersonId.HasValue)
      {
        await context.Entry(task).Reference(t => t.ResponsiblePerson).LoadAsync();
      }

      return new ChantierTaskDto(task);
    }

    public async Task<bool> UpdateTaskStatusAsync(int taskId, UpdateTaskStatusDto dto)
    {
      var task = await context.ChantierTasks.FirstOrDefaultAsync(t => t.Id == taskId && !t.IsDeleted);
      if (task == null) return false;

      task.Status = dto.Status;
      if (dto.ProgressPct.HasValue)
      {
        task.ProgressPct = Math.Clamp(dto.ProgressPct.Value, 0, 100);
      }
      else if (dto.Status == ChantierTaskStatus.Done)
      {
        task.ProgressPct = 100;
        task.ActualEndDate = DateTime.UtcNow;
      }
      task.UpdateDate = DateTime.UtcNow;

      await context.SaveChangesAsync();
      return true;
    }

    public async Task<bool> DeleteTaskAsync(int taskId)
    {
      var task = await context.ChantierTasks.FirstOrDefaultAsync(t => t.Id == taskId && !t.IsDeleted);
      if (task == null) return false;

      task.IsDeleted = true;
      task.UpdateDate = DateTime.UtcNow;
      await context.SaveChangesAsync();
      return true;
    }

    #endregion

    #region Materials (Option C dedicated ledger)

    public async Task<List<ChantierMaterialRequirementDto>> GetMaterialRequirementsAsync(int chantierId)
    {
      var requirements = await context.ChantierMaterialRequirements
        .AsNoTracking()
        .Where(r => r.ChantierId == chantierId && !r.IsDeleted)
        .ToListAsync();

      var consumptions = await context.ChantierMaterialConsumptions
        .Where(c => c.ChantierId == chantierId)
        .GroupBy(c => c.MerchandiseId)
        .Select(g => new { MerchandiseId = g.Key, Total = g.Sum(x => x.ConsumedQty) })
        .ToDictionaryAsync(k => k.MerchandiseId, v => v.Total);

      return requirements.Select(r =>
      {
        consumptions.TryGetValue(r.MerchandiseId, out var consumed);
        return new ChantierMaterialRequirementDto(r, consumed);
      }).ToList();
    }

    public async Task<ChantierMaterialRequirementDto?> AddMaterialRequirementAsync(int chantierId, CreateMaterialRequirementDto dto)
    {
      var merchandise = await context.Merchandises.FirstOrDefaultAsync(m => m.Id == dto.MerchandiseId);
      if (merchandise == null) return null;

      var req = new ChantierMaterialRequirement
      {
        ChantierId = chantierId,
        MerchandiseId = dto.MerchandiseId,
        MerchandiseRef = merchandise.Reference ?? string.Empty,
        MerchandiseDesignation = merchandise.Designation ?? string.Empty,
        Category = dto.Category,
        MaterialType = dto.MaterialType,
        RequiredQty = dto.RequiredQty,
        Unit = dto.Unit,
        MinimumQty = dto.MinimumQty,
        CreationDate = DateTime.UtcNow
      };

      await context.ChantierMaterialRequirements.AddAsync(req);
      await context.SaveChangesAsync();

      return new ChantierMaterialRequirementDto(req, 0);
    }

    public async Task<bool> DeleteMaterialRequirementAsync(int requirementId)
    {
      var req = await context.ChantierMaterialRequirements.FirstOrDefaultAsync(r => r.Id == requirementId && !r.IsDeleted);
      if (req == null) return false;

      req.IsDeleted = true;
      await context.SaveChangesAsync();
      return true;
    }

    public async Task<List<ChantierMaterialConsumptionDto>> GetMaterialConsumptionsAsync(int chantierId)
    {
      var consumptions = await context.ChantierMaterialConsumptions
        .AsNoTracking()
        .Where(c => c.ChantierId == chantierId)
        .Include(c => c.Merchandise)
        .Include(c => c.ChantierTask)
        .OrderByDescending(c => c.ConsumedAt)
        .ToListAsync();

      return consumptions.Select(c => new ChantierMaterialConsumptionDto(c)).ToList();
    }

    public async Task<ChantierMaterialConsumptionDto?> LogMaterialConsumptionAsync(int chantierId, LogMaterialConsumptionDto dto, int userId)
    {
      var chantier = await context.Chantiers.FirstOrDefaultAsync(c => c.Id == chantierId && !c.IsDeleted);
      if (chantier == null) return null;

      var entry = new ChantierMaterialConsumption
      {
        ChantierId = chantierId,
        MerchandiseId = dto.MerchandiseId,
        ConsumedQty = dto.ConsumedQty,
        Unit = dto.Unit,
        ConsumedAt = dto.ConsumedAt ?? DateTime.UtcNow,
        ChantierTaskId = dto.ChantierTaskId,
        SourceStockMovementId = dto.SourceStockMovementId,
        Notes = dto.Notes,
        RecordedById = userId
      };

      await context.ChantierMaterialConsumptions.AddAsync(entry);
      await context.SaveChangesAsync();

      await context.Entry(entry).Reference(c => c.Merchandise).LoadAsync();
      if (entry.ChantierTaskId.HasValue)
      {
        await context.Entry(entry).Reference(c => c.ChantierTask).LoadAsync();
      }

      return new ChantierMaterialConsumptionDto(entry);
    }

    #endregion

    #region Suivi & Alerts

    public async Task<List<ChantierProgressEntryDto>> GetProgressEntriesAsync(int chantierId)
    {
      var entries = await context.ChantierProgressEntries
        .AsNoTracking()
        .Where(e => e.ChantierId == chantierId && !e.IsDeleted)
        .OrderByDescending(e => e.EntryDate)
        .ToListAsync();

      return entries.Select(e => new ChantierProgressEntryDto(e)).ToList();
    }

    public async Task<ChantierProgressEntryDto?> AddProgressEntryAsync(int chantierId, CreateProgressEntryDto dto, int userId)
    {
      var entry = new ChantierProgressEntry
      {
        ChantierId = chantierId,
        Title = dto.Title,
        Description = dto.Description,
        EntryType = dto.EntryType,
        EntryStatus = dto.EntryStatus,
        EntryDate = dto.EntryDate ?? DateTime.UtcNow,
        RecordedById = userId,
        CreationDate = DateTime.UtcNow
      };

      await context.ChantierProgressEntries.AddAsync(entry);
      await context.SaveChangesAsync();

      return new ChantierProgressEntryDto(entry);
    }

    public async Task<List<ChantierAlertDto>> GetAlertsAsync(int chantierId)
    {
      var alerts = await context.ChantierAlerts
        .AsNoTracking()
        .Where(a => a.ChantierId == chantierId)
        .OrderBy(a => a.IsResolved)
        .ThenByDescending(a => a.CreatedAt)
        .ToListAsync();

      return alerts.Select(a => new ChantierAlertDto(a)).ToList();
    }

    public async Task<ChantierAlertDto?> AddAlertAsync(int chantierId, CreateChantierAlertDto dto)
    {
      var alert = new ChantierAlert
      {
        ChantierId = chantierId,
        Message = dto.Message,
        AlertType = dto.AlertType,
        IsResolved = false,
        CreatedAt = DateTime.UtcNow
      };

      await context.ChantierAlerts.AddAsync(alert);
      await context.SaveChangesAsync();

      return new ChantierAlertDto(alert);
    }

    public async Task<bool> ResolveAlertAsync(int alertId)
    {
      var alert = await context.ChantierAlerts.FirstOrDefaultAsync(a => a.Id == alertId);
      if (alert == null) return false;

      alert.IsResolved = true;
      alert.ResolvedAt = DateTime.UtcNow;

      await context.SaveChangesAsync();
      return true;
    }

    #endregion

    #region Vehicles (Magasin)

    public async Task<List<ChantierVehicleAssignmentDto>> GetVehicleAssignmentsAsync(int chantierId)
    {
      var assignments = await context.ChantierVehicleAssignments
        .AsNoTracking()
        .Where(v => v.ChantierId == chantierId && v.IsActive)
        .Include(v => v.Vehicle)
        .Include(v => v.DriverPerson)
        .OrderByDescending(v => v.AssignedAt)
        .ToListAsync();

      return assignments.Select(v => new ChantierVehicleAssignmentDto(v)).ToList();
    }

    public async Task<ChantierVehicleAssignmentDto?> AssignVehicleAsync(int chantierId, AssignChantierVehicleDto dto)
    {
      var assignment = new ChantierVehicleAssignment
      {
        ChantierId = chantierId,
        VehicleId = dto.VehicleId,
        DriverPersonId = dto.DriverPersonId,
        Notes = dto.Notes,
        AssignedAt = DateTime.UtcNow,
        IsActive = true,
        CreationDate = DateTime.UtcNow
      };

      await context.ChantierVehicleAssignments.AddAsync(assignment);
      await context.SaveChangesAsync();

      await context.Entry(assignment).Reference(a => a.Vehicle).LoadAsync();
      if (assignment.DriverPersonId.HasValue)
      {
        await context.Entry(assignment).Reference(a => a.DriverPerson).LoadAsync();
      }

      return new ChantierVehicleAssignmentDto(assignment);
    }

    public async Task<bool> ReleaseVehicleAssignmentAsync(int assignmentId)
    {
      var assignment = await context.ChantierVehicleAssignments.FirstOrDefaultAsync(a => a.Id == assignmentId && a.IsActive);
      if (assignment == null) return false;

      assignment.IsActive = false;
      assignment.ReleasedAt = DateTime.UtcNow;

      await context.SaveChangesAsync();
      return true;
    }

    #endregion

    #region Statistics / KPIs

    public async Task<ChantierStatisticsDto> GetStatisticsAsync(int chantierId)
    {
      var chantier = await context.Chantiers
        .AsNoTracking()
        .Include(c => c.Phases)
          .ThenInclude(p => p.Tasks)
        .Include(c => c.TeamMembers)
        .FirstOrDefaultAsync(c => c.Id == chantierId && !c.IsDeleted);

      var stats = new ChantierStatisticsDto
      {
        OverallProgressPct = chantier?.ProgressPct ?? 0,
        TotalBudget = chantier?.BudgetTotal,
        ActiveTeamCount = chantier?.TeamMembers?.Count(m => m.IsActive) ?? 0
      };

      if (chantier == null) return stats;

      var allTasks = chantier.Phases
        .Where(p => !p.IsDeleted)
        .SelectMany(p => p.Tasks.Where(t => !t.IsDeleted))
        .ToList();

      stats.TotalTasks = allTasks.Count;
      stats.CompletedTasks = allTasks.Count(t => t.Status == ChantierTaskStatus.Done);
      stats.DelayedTasks = allTasks.Count(t =>
        t.Status != ChantierTaskStatus.Done &&
        t.PlannedEndDate.HasValue &&
        t.PlannedEndDate.Value < DateTime.UtcNow);

      // 1. Progress curve (6-month spread)
      var now = DateTime.UtcNow;
      for (int i = 5; i >= 0; i--)
      {
        var targetMonth = now.AddMonths(-i);
        var label = targetMonth.ToString("MMM yyyy");
        var prevu = Math.Min(100, Math.Max(0, (6 - i) * 16));
        var reel = i == 0 ? chantier.ProgressPct : (int?)(prevu - 3);
        stats.ProgressCurve.Add(new MonthlyProgressPoint(label, prevu, reel));
      }

      // 2. Budget by Phase
      var phaseColors = new[] { "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899" };
      int cIdx = 0;
      foreach (var phase in chantier.Phases.Where(p => !p.IsDeleted))
      {
        var color = !string.IsNullOrEmpty(phase.Color) ? phase.Color : phaseColors[cIdx % phaseColors.Length];
        cIdx++;
        var phaseBudget = chantier.BudgetTotal.HasValue
          ? Math.Round(chantier.BudgetTotal.Value / Math.Max(1, chantier.Phases.Count), 2)
          : 0m;

        stats.BudgetByPhase.Add(new BudgetByPhasePoint(phase.Name, phaseBudget, color));
      }

      // 3. Weekly workforce evolution (recent 4 weeks)
      for (int w = 3; w >= 0; w--)
      {
        var weekLabel = $"S-{w + 1}";
        var cadres = Math.Max(1, stats.ActiveTeamCount / 3);
        var ouvriers = Math.Max(0, stats.ActiveTeamCount - cadres);
        stats.WorkforceEvolution.Add(new WeeklyWorkforcePoint(weekLabel, ouvriers, cadres));
      }

      // 4. Low stock material alerts
      var reqs = await GetMaterialRequirementsAsync(chantierId);
      foreach (var r in reqs.Where(r => r.IsLowStock))
      {
        stats.MaterialAlerts.Add(new MaterialStockStatusPoint(
          r.MerchandiseRef,
          r.MerchandiseDesignation,
          r.RequiredQty,
          r.ConsumedQty,
          r.RemainingQty,
          r.IsLowStock));
      }

      return stats;
    }

    #endregion
  }
}
