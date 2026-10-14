using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Production
{
  /// <summary>
  /// Represents an actual dated work session executed by an employee on a manufacturing step.
  /// Contributes to actual manufacturing step costs and monthly employee payable calculations.
  /// </summary>
  public class ProductionStepWorkLog : IEntity
  {
    public int Id { get; set; }
    public Guid Guid { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Direct reference to the employee-step assignment.
    /// </summary>
    public int StepWorkerId { get; set; }
    public ProductionStepWorker? StepWorker { get; set; }

    /// <summary>
    /// Direct reference to the production step for efficient cost rollups and step cascade.
    /// Consistent with StepWorker.ProductionStepId.
    /// </summary>
    public int ProductionStepId { get; set; }
    public ProductionStep? ProductionStep { get; set; }

    /// <summary>
    /// Direct reference to the person for indexed monthly reporting queries.
    /// Consistent with StepWorker.PersonId.
    /// </summary>
    public int PersonId { get; set; }
    public Person? Person { get; set; }

    /// <summary>
    /// Snapshot of the employee's full name at the time of work recording.
    /// </summary>
    public string EmployeeFullName { get; set; } = string.Empty;

    /// <summary>
    /// The specific calendar date this work was performed.
    /// Stored as PostgreSQL DATE for precise calendar month attribution.
    /// </summary>
    public DateTime WorkDate { get; set; }

    /// <summary>
    /// Actual hours worked during this work session.
    /// Precision: NUMERIC(18,3).
    /// </summary>
    public decimal ActualHours { get; set; } = 0m;

    /// <summary>
    /// Hourly rate snapshot (in TND) applied to this specific work session.
    /// Immutable: subsequent changes to assignment rates do not rewrite historical logs.
    /// Precision: NUMERIC(18,3).
    /// </summary>
    public decimal HourlyRate { get; set; } = 0m;

    /// <summary>
    /// ActualHours * HourlyRate.
    /// Calculated labor cost for this session (in TND).
    /// Precision: NUMERIC(18,3).
    /// </summary>
    public decimal CalculatedLaborAmount { get; set; } = 0m;

    public string? Notes { get; set; }

    // ── Audit ───────────────────────────────────────────────────────────────────
    public int CreatedById { get; set; }
    public int? UpdatedById { get; set; }
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdateDate { get; set; }

    public ProductionStepWorkLog()
    {
    }
  }
}
