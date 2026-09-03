using System;
using System.Collections.Generic;
using System.Linq;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.core.Entities.DTOs.Chantier
{
  #region Core Chantier DTOs

  public class ChantierListItemDto
  {
    public int Id { get; set; }
    public Guid Guid { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Location { get; set; }
    public string? Gouvernorate { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public ChantierStatus Status { get; set; }
    public ChantierFlag HealthFlag { get; set; }
    public int ProgressPct { get; set; }
    public decimal? BudgetTotal { get; set; }
    public int? ArchitectPersonId { get; set; }
    public string? ArchitectName { get; set; }
    public int? ProjectManagerPersonId { get; set; }
    public string? ProjectManagerName { get; set; }
    public int ActiveTeamCount { get; set; }
    public int OpenAlertsCount { get; set; }
    public DateTime CreationDate { get; set; }

    public ChantierListItemDto() { }

    public ChantierListItemDto(Entities.Chantier.Chantier c)
    {
      Id = c.Id;
      Guid = c.Guid;
      Reference = c.Reference;
      Name = c.Name;
      Description = c.Description;
      Location = c.Location;
      Gouvernorate = c.Gouvernorate;
      StartDate = c.StartDate;
      PlannedEndDate = c.PlannedEndDate;
      ActualEndDate = c.ActualEndDate;
      Status = c.Status;
      HealthFlag = c.HealthFlag;
      ProgressPct = c.ProgressPct;
      BudgetTotal = c.BudgetTotal;
      ArchitectPersonId = c.ArchitectPersonId;
      ArchitectName = c.ArchitectPerson?.FullName;
      ProjectManagerPersonId = c.ProjectManagerPersonId;
      ProjectManagerName = c.ProjectManagerPerson?.FullName;
      ActiveTeamCount = c.TeamMembers?.Count(m => m.IsActive) ?? 0;
      OpenAlertsCount = c.Alerts?.Count(a => !a.IsResolved) ?? 0;
      CreationDate = c.CreationDate;
    }
  }

  public class ChantierDetailDto : ChantierListItemDto
  {
    public string? InternalNote { get; set; }
    public int? ClientCounterPartId { get; set; }
    public List<ChantierTeamMemberDto> TeamMembers { get; set; } = new();
    public List<ChantierPhaseDto> Phases { get; set; } = new();
    public List<ChantierMaterialRequirementDto> MaterialRequirements { get; set; } = new();
    public List<ChantierProgressEntryDto> ProgressEntries { get; set; } = new();
    public List<ChantierAlertDto> Alerts { get; set; } = new();
    public List<ChantierVehicleAssignmentDto> VehicleAssignments { get; set; } = new();

    public ChantierDetailDto() { }

    public ChantierDetailDto(Entities.Chantier.Chantier c) : base(c)
    {
      InternalNote = c.InternalNote;
      ClientCounterPartId = c.ClientCounterPartId;
      TeamMembers = c.TeamMembers?.Where(m => m.IsActive).Select(m => new ChantierTeamMemberDto(m)).ToList() ?? new();
      Phases = c.Phases?.Where(p => !p.IsDeleted).OrderBy(p => p.SortOrder).Select(p => new ChantierPhaseDto(p)).ToList() ?? new();
      MaterialRequirements = c.MaterialRequirements?.Where(m => !m.IsDeleted).Select(m => new ChantierMaterialRequirementDto(m)).ToList() ?? new();
      ProgressEntries = c.ProgressEntries?.Where(e => !e.IsDeleted).OrderByDescending(e => e.EntryDate).Select(e => new ChantierProgressEntryDto(e)).ToList() ?? new();
      Alerts = c.Alerts?.OrderByDescending(a => a.CreatedAt).Select(a => new ChantierAlertDto(a)).ToList() ?? new();
      VehicleAssignments = c.VehicleAssignments?.Where(v => v.IsActive).Select(v => new ChantierVehicleAssignmentDto(v)).ToList() ?? new();
    }
  }

  public record CreateChantierDto(
    string Name,
    string? Reference,
    string? Description,
    string? InternalNote,
    string? Location,
    string? Gouvernorate,
    DateTime StartDate,
    DateTime? PlannedEndDate,
    decimal? BudgetTotal,
    int? ArchitectPersonId,
    int? ProjectManagerPersonId,
    int? ClientCounterPartId
  );

  public record UpdateChantierDto(
    string Name,
    string? Description,
    string? InternalNote,
    string? Location,
    string? Gouvernorate,
    DateTime StartDate,
    DateTime? PlannedEndDate,
    DateTime? ActualEndDate,
    decimal? BudgetTotal,
    int? ArchitectPersonId,
    int? ProjectManagerPersonId,
    int? ClientCounterPartId,
    ChantierStatus Status,
    ChantierFlag HealthFlag,
    int ProgressPct
  );

  public record UpdateChantierStatusDto(
    ChantierStatus Status,
    ChantierFlag? HealthFlag
  );

  public record UpdateChantierProgressDto(
    int ProgressPct
  );

  #endregion

  #region Team DTOs

  public class ChantierTeamMemberDto
  {
    public int Id { get; set; }
    public int ChantierId { get; set; }
    public int PersonId { get; set; }
    public string PersonFullName { get; set; } = string.Empty;
    public string? PersonPhone { get; set; }
    public string? PersonEmail { get; set; }
    public string ChantierRole { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
    public DateTime? ReleasedAt { get; set; }
    public bool IsActive { get; set; }

    public ChantierTeamMemberDto() { }

    public ChantierTeamMemberDto(ChantierTeamMember m)
    {
      Id = m.Id;
      ChantierId = m.ChantierId;
      PersonId = m.PersonId;
      PersonFullName = m.Person?.FullName ?? string.Empty;
      PersonPhone = m.Person?.PhoneNumber;
      PersonEmail = null;
      ChantierRole = m.ChantierRole;
      AssignedAt = m.AssignedAt;
      ReleasedAt = m.ReleasedAt;
      IsActive = m.IsActive;
    }
  }

  public record AssignTeamMemberDto(
    int PersonId,
    string ChantierRole,
    DateTime? AssignedAt
  );

  #endregion

  #region Production (Phases & Tasks) DTOs

  public class ChantierPhaseDto
  {
    public int Id { get; set; }
    public int ChantierId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public int ProgressPct { get; set; }
    public string? Color { get; set; }
    public ChantierPhaseStatus Status { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public List<ChantierTaskDto> Tasks { get; set; } = new();

    public ChantierPhaseDto() { }

    public ChantierPhaseDto(ChantierPhase p)
    {
      Id = p.Id;
      ChantierId = p.ChantierId;
      Name = p.Name;
      Description = p.Description;
      SortOrder = p.SortOrder;
      ProgressPct = p.ProgressPct;
      Color = p.Color;
      Status = p.Status;
      StartDate = p.StartDate;
      PlannedEndDate = p.PlannedEndDate;
      ActualEndDate = p.ActualEndDate;
      Tasks = p.Tasks?.Where(t => !t.IsDeleted).OrderBy(t => t.SortOrder).Select(t => new ChantierTaskDto(t)).ToList() ?? new();
    }
  }

  public record CreateChantierPhaseDto(
    string Name,
    string? Description,
    int SortOrder,
    string? Color,
    DateTime StartDate,
    DateTime? PlannedEndDate
  );

  public class ChantierTaskDto
  {
    public int Id { get; set; }
    public int PhaseId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? SubLabel { get; set; }
    public string? Description { get; set; }
    public ChantierTaskStatus Status { get; set; }
    public int ProgressPct { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public int? ResponsiblePersonId { get; set; }
    public string? ResponsiblePersonName { get; set; }
    public int SortOrder { get; set; }

    public ChantierTaskDto() { }

    public ChantierTaskDto(ChantierTask t)
    {
      Id = t.Id;
      PhaseId = t.PhaseId;
      Label = t.Label;
      SubLabel = t.SubLabel;
      Description = t.Description;
      Status = t.Status;
      ProgressPct = t.ProgressPct;
      StartDate = t.StartDate;
      PlannedEndDate = t.PlannedEndDate;
      ActualEndDate = t.ActualEndDate;
      ResponsiblePersonId = t.ResponsiblePersonId;
      ResponsiblePersonName = t.ResponsiblePerson?.FullName;
      SortOrder = t.SortOrder;
    }
  }

  public record CreateChantierTaskDto(
    string Label,
    string? SubLabel,
    string? Description,
    DateTime StartDate,
    DateTime? PlannedEndDate,
    int? ResponsiblePersonId,
    int SortOrder
  );

  public record UpdateTaskStatusDto(
    ChantierTaskStatus Status,
    int? ProgressPct
  );

  #endregion

  #region Materials DTOs

  public class ChantierMaterialRequirementDto
  {
    public int Id { get; set; }
    public int ChantierId { get; set; }
    public int MerchandiseId { get; set; }
    public string MerchandiseRef { get; set; } = string.Empty;
    public string MerchandiseDesignation { get; set; } = string.Empty;
    public string Category { get; set; } = "Principal";
    public string MaterialType { get; set; } = "Principal";
    public double RequiredQty { get; set; }
    public string Unit { get; set; } = "Unité";
    public double MinimumQty { get; set; }
    public double ConsumedQty { get; set; }
    public double RemainingQty => Math.Max(0, RequiredQty - ConsumedQty);
    public bool IsLowStock => RemainingQty <= MinimumQty && RequiredQty > 0;

    public ChantierMaterialRequirementDto() { }

    public ChantierMaterialRequirementDto(ChantierMaterialRequirement r, double consumed = 0)
    {
      Id = r.Id;
      ChantierId = r.ChantierId;
      MerchandiseId = r.MerchandiseId;
      MerchandiseRef = r.MerchandiseRef;
      MerchandiseDesignation = r.MerchandiseDesignation;
      Category = r.Category;
      MaterialType = r.MaterialType;
      RequiredQty = r.RequiredQty;
      Unit = r.Unit;
      MinimumQty = r.MinimumQty;
      ConsumedQty = consumed;
    }
  }

  public record CreateMaterialRequirementDto(
    int MerchandiseId,
    string Category,
    string MaterialType,
    double RequiredQty,
    string Unit,
    double MinimumQty
  );

  public class ChantierMaterialConsumptionDto
  {
    public int Id { get; set; }
    public int ChantierId { get; set; }
    public int MerchandiseId { get; set; }
    public string? MerchandiseRef { get; set; }
    public string? MerchandiseDesignation { get; set; }
    public int? SourceStockMovementId { get; set; }
    public int? ChantierTaskId { get; set; }
    public string? TaskLabel { get; set; }
    public double ConsumedQty { get; set; }
    public string Unit { get; set; } = "Unité";
    public string? Notes { get; set; }
    public DateTime ConsumedAt { get; set; }
    public int RecordedById { get; set; }

    public ChantierMaterialConsumptionDto() { }

    public ChantierMaterialConsumptionDto(ChantierMaterialConsumption c)
    {
      Id = c.Id;
      ChantierId = c.ChantierId;
      MerchandiseId = c.MerchandiseId;
      MerchandiseRef = c.Merchandise?.PackageReference ?? c.Merchandise?.Articles?.Reference;
      MerchandiseDesignation = c.Merchandise?.Description ?? c.Merchandise?.Articles?.Description;
      SourceStockMovementId = c.SourceStockMovementId;
      ChantierTaskId = c.ChantierTaskId;
      TaskLabel = c.ChantierTask?.Label;
      ConsumedQty = c.ConsumedQty;
      Unit = c.Unit;
      Notes = c.Notes;
      ConsumedAt = c.ConsumedAt;
      RecordedById = c.RecordedById;
    }
  }

  public record LogMaterialConsumptionDto(
    int MerchandiseId,
    double ConsumedQty,
    string Unit,
    DateTime? ConsumedAt,
    int? ChantierTaskId,
    int? SourceStockMovementId,
    string? Notes
  );

  #endregion

  #region Suivi & Alerts DTOs

  public class ChantierProgressEntryDto
  {
    public int Id { get; set; }
    public int ChantierId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ChantierEntryType EntryType { get; set; }
    public ChantierEntryStatus EntryStatus { get; set; }
    public DateTime EntryDate { get; set; }
    public int RecordedById { get; set; }

    public ChantierProgressEntryDto() { }

    public ChantierProgressEntryDto(ChantierProgressEntry e)
    {
      Id = e.Id;
      ChantierId = e.ChantierId;
      Title = e.Title;
      Description = e.Description;
      EntryType = e.EntryType;
      EntryStatus = e.EntryStatus;
      EntryDate = e.EntryDate;
      RecordedById = e.RecordedById;
    }
  }

  public record CreateProgressEntryDto(
    string Title,
    string? Description,
    ChantierEntryType EntryType,
    ChantierEntryStatus EntryStatus,
    DateTime? EntryDate
  );

  public class ChantierAlertDto
  {
    public int Id { get; set; }
    public int ChantierId { get; set; }
    public string Message { get; set; } = string.Empty;
    public ChantierAlertType AlertType { get; set; }
    public bool IsResolved { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }

    public ChantierAlertDto() { }

    public ChantierAlertDto(ChantierAlert a)
    {
      Id = a.Id;
      ChantierId = a.ChantierId;
      Message = a.Message;
      AlertType = a.AlertType;
      IsResolved = a.IsResolved;
      CreatedAt = a.CreatedAt;
      ResolvedAt = a.ResolvedAt;
    }
  }

  public record CreateChantierAlertDto(
    string Message,
    ChantierAlertType AlertType
  );

  #endregion

  #region Vehicles DTOs

  public class ChantierVehicleAssignmentDto
  {
    public int Id { get; set; }
    public int ChantierId { get; set; }
    public int VehicleId { get; set; }
    public string VehicleRegistration { get; set; } = string.Empty;
    public string VehicleModel { get; set; } = string.Empty;
    public int? DriverPersonId { get; set; }
    public string? DriverPersonName { get; set; }
    public DateTime AssignedAt { get; set; }
    public DateTime? ReleasedAt { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }

    public ChantierVehicleAssignmentDto() { }

    public ChantierVehicleAssignmentDto(ChantierVehicleAssignment v)
    {
      Id = v.Id;
      ChantierId = v.ChantierId;
      VehicleId = v.VehicleId;
      VehicleRegistration = v.Vehicle?.SerialNumber ?? string.Empty;
      VehicleModel = v.Vehicle?.Brand ?? string.Empty;
      DriverPersonId = v.DriverPersonId;
      DriverPersonName = v.DriverPerson?.FullName;
      AssignedAt = v.AssignedAt;
      ReleasedAt = v.ReleasedAt;
      IsActive = v.IsActive;
      Notes = v.Notes;
    }
  }

  public record AssignChantierVehicleDto(
    int VehicleId,
    int? DriverPersonId,
    string? Notes
  );

  #endregion

  #region Statistics DTOs

  public class ChantierStatisticsDto
  {
    public int OverallProgressPct { get; set; }
    public decimal? TotalBudget { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int DelayedTasks { get; set; }
    public int ActiveTeamCount { get; set; }

    public List<MonthlyProgressPoint> ProgressCurve { get; set; } = new();
    public List<BudgetByPhasePoint> BudgetByPhase { get; set; } = new();
    public List<WeeklyWorkforcePoint> WorkforceEvolution { get; set; } = new();
    public List<MaterialStockStatusPoint> MaterialAlerts { get; set; } = new();
  }

  public record MonthlyProgressPoint(string Month, int Prevu, int? Reel);
  public record BudgetByPhasePoint(string Name, decimal Value, string Color);
  public record WeeklyWorkforcePoint(string Week, int Ouvriers, int Cadres);
  public record MaterialStockStatusPoint(string Reference, string Designation, double Required, double Consumed, double Remaining, bool IsLowStock);

  #endregion
}
