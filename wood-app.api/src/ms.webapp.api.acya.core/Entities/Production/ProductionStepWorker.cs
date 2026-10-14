using System;
using System.Collections.Generic;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Production
{
  /// <summary>
  /// Represents the planned assignment of an employee to a manufacturing step.
  /// Preserves planned hours and default hourly rate used for estimates and work-log defaults.
  /// </summary>
  public class ProductionStepWorker : IEntity
  {
    public int Id { get; set; }
    public Guid Guid { get; set; } = Guid.NewGuid();

    public int ProductionStepId { get; set; }
    public ProductionStep? ProductionStep { get; set; }

    public int PersonId { get; set; }
    public Person? Person { get; set; }

    /// <summary>
    /// Snapshot of the employee's full name at the time of assignment.
    /// Preserves historical display fidelity even if the employee record is later deactivated or modified.
    /// </summary>
    public string EmployeeFullName { get; set; } = string.Empty;

    /// <summary>
    /// Planned working hours allocated to this worker for the manufacturing step.
    /// Used for cost estimation only; never automatically generates earned payroll.
    /// Precision: NUMERIC(18,3).
    /// </summary>
    public decimal PlannedHours { get; set; } = 0m;

    /// <summary>
    /// Manually entered default hourly rate (in TND) applicable to this worker on this step.
    /// Precision: NUMERIC(18,3).
    /// </summary>
    public decimal DefaultHourlyRate { get; set; } = 0m;

    /// <summary>
    /// PlannedHours * DefaultHourlyRate.
    /// Contributes to estimated order costs; strictly separated from actual payable amounts.
    /// </summary>
    public decimal EstimatedLaborAmount { get; set; } = 0m;

    public string? Notes { get; set; }

    // ── Audit ───────────────────────────────────────────────────────────────────
    public int CreatedById { get; set; }
    public int? UpdatedById { get; set; }
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdateDate { get; set; }

    // ── Navigation Collections ──────────────────────────────────────────────────
    /// <summary>
    /// Dated actual work sessions performed by this employee for this step.
    /// </summary>
    public ICollection<ProductionStepWorkLog> WorkLogs { get; set; } = new List<ProductionStepWorkLog>();

    public ProductionStepWorker()
    {
    }
  }
}
