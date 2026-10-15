using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Production
{
  /// <summary>
  /// Represents payable work performed by an employee outside manufacturing orders.
  /// Contributes strictly to monthly employee payment calculations; NEVER contributes to production order costs.
  /// </summary>
  public class ProductionOtherWorkEntry : IEntity
  {
    public int Id { get; set; }
    public Guid Guid { get; set; } = Guid.NewGuid();

    public int PersonId { get; set; }
    public Person? Person { get; set; }

    /// <summary>
    /// Snapshot of the employee's full name at the time of work recording.
    /// </summary>
    public string EmployeeFullName { get; set; } = string.Empty;

    /// <summary>
    /// Calendar date when the work was performed.
    /// Stored as PostgreSQL DATE for precise calendar month attribution.
    /// </summary>
    public DateTime WorkDate { get; set; }

    /// <summary>
    /// Number of hours worked.
    /// Precision: NUMERIC(18,3).
    /// </summary>
    public decimal Hours { get; set; } = 0m;

    /// <summary>
    /// Manually entered hourly rate applicable to this work (in TND).
    /// Precision: NUMERIC(18,3).
    /// </summary>
    public decimal HourlyRate { get; set; } = 0m;

    /// <summary>
    /// Hours * HourlyRate.
    /// Earned compensation for this entry (in TND).
    /// Precision: NUMERIC(18,3).
    /// </summary>
    public decimal CalculatedAmount { get; set; } = 0m;

    /// <summary>
    /// Mandatory description of the work performed (e.g. workshop maintenance, wood sorting).
    /// </summary>
    public string Description { get; set; } = string.Empty;

    // ── Audit & Soft Delete ─────────────────────────────────────────────────────
    public int CreatedById { get; set; }
    public int? UpdatedById { get; set; }
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; } = false;

    public ProductionOtherWorkEntry()
    {
    }
  }
}
