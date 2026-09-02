using System;
using System.Collections.Generic;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Chantier
{
  /// <summary>
  /// Work phase inside a construction project (e.g. Gros œuvre, Second œuvre, Finitions).
  /// Configurable and reorderable via SortOrder.
  /// </summary>
  public class ChantierPhase : IEntity
  {
    public int Id { get; set; }

    public int ChantierId { get; set; }
    public Chantier? Chantier { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; } = 0;
    public int ProgressPct { get; set; } = 0;
    public string? Color { get; set; }
    public ChantierPhaseStatus Status { get; set; } = ChantierPhaseStatus.Planned;

    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? PlannedEndDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;

    public ICollection<ChantierTask> Tasks { get; set; } = new List<ChantierTask>();
  }
}
