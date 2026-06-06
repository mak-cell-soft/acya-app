using ms.webapp.api.acya.core.Entities.DTOs;
using System;

namespace ms.webapp.api.acya.core.Entities
{
    public class BankTransaction : IEntity
    {
        public int Id { get; set; }
        public int BankId { get; set; }
        public DateTime TransactionDate { get; set; }
        public string? Description { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public string? Reference { get; set; }
        public bool IsReconciled { get; set; }
        
        public DateTime CreationDate { get; set; }
        public DateTime UpdateDate { get; set; }
        public bool? IsDeleted { get; set; }
        public int? UpdatedBy { get; set; }

        public Bank? Bank { get; set; }
        public AppUser? AppUser { get; set; }

        public BankTransaction()
        {
        }

        public BankTransaction(BankTransactionDto dto)
        {
            UpdateFromDto(dto);
        }

        public void UpdateFromDto(BankTransactionDto dto)
        {
            Id = dto.Id ?? 0;
            BankId = dto.BankId;
            TransactionDate = dto.TransactionDate;
            Description = dto.Description;
            Debit = dto.Debit;
            Credit = dto.Credit;
            Reference = dto.Reference;
            IsReconciled = dto.IsReconciled;
            CreationDate = dto.CreationDate ?? DateTime.UtcNow;
            UpdateDate = dto.UpdateDate ?? DateTime.UtcNow;
            IsDeleted = dto.IsDeleted ?? false;
            UpdatedBy = dto.UpdatedBy;
        }
    }
}
