using System;

namespace ms.webapp.api.acya.core.Entities.Chantier
{
  /// <summary>
  /// Lifecycle status of a construction project.
  /// </summary>
  public enum ChantierStatus
  {
    Planned = 0,
    InProgress = 1,
    OnHold = 2,
    Completed = 3,
    Cancelled = 4
  }

  /// <summary>
  /// Health indicator flag for a chantier project.
  /// </summary>
  public enum ChantierFlag
  {
    Green = 0,
    Orange = 1,
    Red = 2
  }

  /// <summary>
  /// Phase progress status.
  /// </summary>
  public enum ChantierPhaseStatus
  {
    Planned = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
  }

  /// <summary>
  /// Individual operational task execution status.
  /// </summary>
  public enum ChantierTaskStatus
  {
    Planned = 0,
    InProgress = 1,
    Done = 2,
    Blocked = 3,
    Cancelled = 4
  }

  /// <summary>
  /// Classification of a timeline journal event.
  /// </summary>
  public enum ChantierEntryType
  {
    DailyReport = 0,
    Milestone = 1,
    Observation = 2,
    Issue = 3
  }

  /// <summary>
  /// Completion status of a progress entry.
  /// </summary>
  public enum ChantierEntryStatus
  {
    Done = 0,
    Pending = 1,
    Cancelled = 2
  }

  /// <summary>
  /// Severity classification of a chantier alert.
  /// </summary>
  public enum ChantierAlertType
  {
    Critical = 0,
    Warning = 1,
    Info = 2
  }
}
