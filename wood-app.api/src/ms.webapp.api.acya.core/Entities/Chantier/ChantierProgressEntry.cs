using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Chantier
{
  /// <summary>
  /// Timeline diary entry (journal de chantier) tracking milestones, observations, daily reports, or issues.
  /// </summary>
  public class ChantierProgressEntry : IEntity
  {
    public int Id { get; set; }

    public int ChantierId { get; set; }
    public Chantier? Chantier { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ChantierEntryType EntryType { get; set; } = ChantierEntryType.DailyReport;
    public ChantierEntryStatus EntryStatus { get; set; } = ChantierEntryStatus.Done;

    public DateTime EntryDate { get; set; } = DateTime.UtcNow;
    public int RecordedById { get; set; }
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
  }
}
