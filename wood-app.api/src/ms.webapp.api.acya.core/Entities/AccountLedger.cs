using System;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities
{
    public class AccountLedger : IEntity
    {
        public int Id { get; set; }
        public int CounterPartId { get; set; }
        public CounterPart? CounterPart { get; set; }
        public DateTime TransactionDate { get; set; }
        public string Type { get; set; } = string.Empty; // OpeningBalance, Invoice, Payment, Adjustment, CreditNote, Return
        public int? RelatedId { get; set; } // References tbl_document.id or tbl_payments.id
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public AccountLedger()
        {
            TransactionDate = DateTime.UtcNow;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }
    }
}
