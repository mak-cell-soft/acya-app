using System;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities
{
    public class PaymentInstrument : IEntity, IAuditable
    {
        public int Id { get; set; }
        public int PaymentId { get; set; }
        public Payment? Payment { get; set; }
        
        public string? InstrumentNumber { get; set; } // Traite or Cheque number
        public string? Type { get; set; }             // "TRAITE" | "CHEQUE"
        public string? Bank { get; set; }
        public string? Owner { get; set; }
        
        public DateTime? IssueDate { get; set; }
        public DateTime? DueDate { get; set; }         // Échéance
        public DateTime? ExpirationDate { get; set; }
        
        public string? BankSettlementStatus { get; set; } // "PENDING" | "PAID_AT_BANK" | "BOUNCED"
        public DateTime? PaidAtBankDate { get; set; }
        public bool IsPaidAtBank { get; set; } = false;
        
        public string? Notes { get; set; }

        public DateTime? CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedById { get; set; }

        public PaymentInstrument()
        {
            CreatedAt = DateTime.UtcNow;
            BankSettlementStatus = "PENDING";
        }
    }
}
