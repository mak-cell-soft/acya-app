using System;
using System.Collections.Generic;
using ms.webapp.api.acya.core.Entities.DTOs.Chantier;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Chantier
{
  /// <summary>
  /// Root aggregate entity representing a construction project (Chantier).
  /// Designed as an additive module with one-way navigation towards core entities.
  /// </summary>
  public class Chantier : IEntity
  {
    public int Id { get; set; }
    public Guid Guid { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Human-readable project code, e.g. "CH-2026-001".
    /// </summary>
    public string Reference { get; set; } = string.Empty;

    /// <summary>
    /// Descriptive name of the construction site.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
    public string? InternalNote { get; set; }

    /// <summary>
    /// Site physical address or geographic location.
    /// </summary>
    public string? Location { get; set; }

    /// <summary>
    /// Tunisian governorate or administrative area (e.g. Tunis, Ariana, Sfax).
    /// </summary>
    public string? Gouvernorate { get; set; }

    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? PlannedEndDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    public ChantierStatus Status { get; set; } = ChantierStatus.Planned;
    public ChantierFlag HealthFlag { get; set; } = ChantierFlag.Green;

    /// <summary>
    /// Global completion percentage [0..100], updated manually or calculated from phase completion.
    /// </summary>
    public int ProgressPct { get; set; } = 0;

    /// <summary>
    /// Total budget allocated for the construction site in TND.
    /// </summary>
    public decimal? BudgetTotal { get; set; }

    // NOTE: Foreign key to existing Person entity.
    // We intentionally maintain one-way navigation here so the core Person entity is not modified.
    public int? ArchitectPersonId { get; set; }
    public Person? ArchitectPerson { get; set; }

    public int? ProjectManagerPersonId { get; set; }
    public Person? ProjectManagerPerson { get; set; }

    // NOTE: Logical FK to CounterPart (client). Kept without a strict database constraint
    // following the existing ACYA ERP loose-coupling pattern across modules.
    public int? ClientCounterPartId { get; set; }

    public int CreatedById { get; set; }
    public int? UpdatedById { get; set; }
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; } = false;

    // Navigation collections owned by this chantier
    public ICollection<ChantierTeamMember> TeamMembers { get; set; } = new List<ChantierTeamMember>();
    public ICollection<ChantierPhase> Phases { get; set; } = new List<ChantierPhase>();
    public ICollection<ChantierMaterialRequirement> MaterialRequirements { get; set; } = new List<ChantierMaterialRequirement>();
    public ICollection<ChantierMaterialConsumption> MaterialConsumptions { get; set; } = new List<ChantierMaterialConsumption>();
    public ICollection<ChantierProgressEntry> ProgressEntries { get; set; } = new List<ChantierProgressEntry>();
    public ICollection<ChantierAlert> Alerts { get; set; } = new List<ChantierAlert>();
    public ICollection<ChantierVehicleAssignment> VehicleAssignments { get; set; } = new List<ChantierVehicleAssignment>();

    public Chantier()
    {
    }

    public Chantier(CreateChantierDto dto, int userId)
    {
      Reference = !string.IsNullOrWhiteSpace(dto.Reference) ? dto.Reference : $"CH-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(100, 999)}";
      Name = dto.Name;
      Description = dto.Description;
      InternalNote = dto.InternalNote;
      Location = dto.Location;
      Gouvernorate = dto.Gouvernorate;
      StartDate = dto.StartDate;
      PlannedEndDate = dto.PlannedEndDate;
      BudgetTotal = dto.BudgetTotal;
      ArchitectPersonId = dto.ArchitectPersonId;
      ProjectManagerPersonId = dto.ProjectManagerPersonId;
      ClientCounterPartId = dto.ClientCounterPartId;
      CreatedById = userId;
      CreationDate = DateTime.UtcNow;
      Status = ChantierStatus.Planned;
      HealthFlag = ChantierFlag.Green;
      ProgressPct = 0;
    }

    public void UpdateFromDto(UpdateChantierDto dto, int userId)
    {
      Name = dto.Name;
      Description = dto.Description;
      InternalNote = dto.InternalNote;
      Location = dto.Location;
      Gouvernorate = dto.Gouvernorate;
      StartDate = dto.StartDate;
      PlannedEndDate = dto.PlannedEndDate;
      ActualEndDate = dto.ActualEndDate;
      BudgetTotal = dto.BudgetTotal;
      ArchitectPersonId = dto.ArchitectPersonId;
      ProjectManagerPersonId = dto.ProjectManagerPersonId;
      ClientCounterPartId = dto.ClientCounterPartId;
      Status = dto.Status;
      HealthFlag = dto.HealthFlag;
      ProgressPct = Math.Clamp(dto.ProgressPct, 0, 100);
      UpdatedById = userId;
      UpdateDate = DateTime.UtcNow;
    }
  }
}
