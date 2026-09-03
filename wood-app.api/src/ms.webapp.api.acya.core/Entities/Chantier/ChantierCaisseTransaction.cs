using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Chantier
{
  /// <summary>
  /// Petty cash register transaction for a Chantier project (Alimentation, Sortie, or pending mobile request).
  /// </summary>
  public class ChantierCaisseTransaction : IEntity
  {
    public int Id { get; set; }
    public Guid Guid { get; set; } = Guid.NewGuid();

    public int ChantierId { get; set; }
    public Chantier? Chantier { get; set; }

    public ChantierCaisseTransactionType Type { get; set; } = ChantierCaisseTransactionType.Alimentation;
    public ChantierCaisseTransactionStatus Status { get; set; } = ChantierCaisseTransactionStatus.Completed;

    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;

    public string Reason { get; set; } = string.Empty;
    public string? Reference { get; set; }

    public int? BeneficiaryPersonId { get; set; }
    public Person? BeneficiaryPerson { get; set; }

    public int CreatedById { get; set; }
    public int? ValidatedById { get; set; }
    public DateTime? ValidationDate { get; set; }

    public string? Notes { get; set; }

    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
  }
}
