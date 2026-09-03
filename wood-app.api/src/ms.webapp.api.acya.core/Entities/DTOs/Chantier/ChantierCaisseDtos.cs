using System;
using System.Collections.Generic;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.core.Entities.DTOs.Chantier
{
  public class ChantierCaisseTransactionDto
  {
    public int Id { get; set; }
    public Guid Guid { get; set; }
    public int ChantierId { get; set; }
    public ChantierCaisseTransactionType Type { get; set; }
    public string TypeName { get; set; } = string.Empty;
    public ChantierCaisseTransactionStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Reference { get; set; }
    public int? BeneficiaryPersonId { get; set; }
    public string? BeneficiaryPersonName { get; set; }
    public int CreatedById { get; set; }
    public int? ValidatedById { get; set; }
    public DateTime? ValidationDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreationDate { get; set; }

    public ChantierCaisseTransactionDto() { }

    public ChantierCaisseTransactionDto(ChantierCaisseTransaction tx)
    {
      Id = tx.Id;
      Guid = tx.Guid;
      ChantierId = tx.ChantierId;
      Type = tx.Type;
      TypeName = tx.Type == ChantierCaisseTransactionType.Alimentation ? "Alimentation" : "Sortie";
      Status = tx.Status;
      StatusName = tx.Status == ChantierCaisseTransactionStatus.Completed ? "Validé" :
                   tx.Status == ChantierCaisseTransactionStatus.Pending ? "En attente" : "Rejeté";
      Amount = tx.Amount;
      TransactionDate = tx.TransactionDate;
      Reason = tx.Reason;
      Reference = tx.Reference;
      BeneficiaryPersonId = tx.BeneficiaryPersonId;
      BeneficiaryPersonName = tx.BeneficiaryPerson?.FullName;
      CreatedById = tx.CreatedById;
      ValidatedById = tx.ValidatedById;
      ValidationDate = tx.ValidationDate;
      Notes = tx.Notes;
      CreationDate = tx.CreationDate;
    }
  }

  public record CreateChantierCaisseAlimentationDto(
    decimal Amount,
    DateTime? TransactionDate,
    string Reason,
    string? Reference,
    string? Notes
  );

  public record CreateChantierCaisseSortieDto(
    decimal Amount,
    DateTime? TransactionDate,
    string Reason,
    int? BeneficiaryPersonId,
    string? Reference,
    string? Notes,
    bool IsMobileRequest = false
  );

  public record ValidateCaisseRequestDto(
    bool Approve
  );

  public class ChantierCaisseSummaryDto
  {
    public int ChantierId { get; set; }
    public decimal CurrentBalance { get; set; }
    public decimal TotalAlimentations { get; set; }
    public decimal TotalSorties { get; set; }
    public int PendingRequestsCount { get; set; }
    public decimal PendingRequestsAmount { get; set; }
    public DateTime? LastMovementDate { get; set; }
    public List<ChantierCaisseTransactionDto> RecentTransactions { get; set; } = new();
  }
}
