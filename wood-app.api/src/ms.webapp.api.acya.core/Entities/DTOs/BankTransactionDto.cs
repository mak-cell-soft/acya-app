using System;
using System.Collections.Generic;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class BankTransactionDto
    {
        public int? Id { get; set; }
        public int BankId { get; set; }
        public DateTime TransactionDate { get; set; }
        public string? Description { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public string? Reference { get; set; }
        public bool IsReconciled { get; set; }
        
        public DateTime? CreationDate { get; set; }
        public DateTime? UpdateDate { get; set; }
        public bool? IsDeleted { get; set; }
        public int? UpdatedBy { get; set; }

        public BankTransactionDto()
        {
        }

        public BankTransactionDto(BankTransaction entity)
        {
            Id = entity.Id;
            BankId = entity.BankId;
            TransactionDate = entity.TransactionDate;
            Description = entity.Description;
            Debit = entity.Debit;
            Credit = entity.Credit;
            Reference = entity.Reference;
            IsReconciled = entity.IsReconciled;
            CreationDate = entity.CreationDate;
            UpdateDate = entity.UpdateDate;
            IsDeleted = entity.IsDeleted;
            UpdatedBy = entity.UpdatedBy;
        }
    }

    public class BankStatementResponseDto
    {
        public decimal InitialBalance { get; set; }
        public List<BankTransactionDto> Transactions { get; set; } = new List<BankTransactionDto>();
    }
}
