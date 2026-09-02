using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Chantier
{
  /// <summary>
  /// Operational construction task belonging to a project phase.
  /// </summary>
  public class ChantierTask : IEntity
  {
    public int Id { get; set; }

    public int PhaseId { get; set; }
    public ChantierPhase? Phase { get; set; }

    public string Label { get; set; } = string.Empty;
    public string? SubLabel { get; set; }
    public string? Description { get; set; }

    public ChantierTaskStatus Status { get; set; } = ChantierTaskStatus.Planned;
    public int ProgressPct { get; set; } = 0;

    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? PlannedEndDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    // NOTE: Optional link to existing Person as the task supervisor / responsible.
    public int? ResponsiblePersonId { get; set; }
    public Person? ResponsiblePerson { get; set; }

    public int SortOrder { get; set; } = 0;
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; } = false;
  }
}
