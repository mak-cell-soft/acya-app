using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities
{
    public class BankDeposit : IEntity, IAuditable
    {
        public int Id { get; set; }
        public int BankId { get; set; }
        public Bank? Bank { get; set; }
        public DateTime DepositDate { get; set; }
        public string DepositType { get; set; } = "ESPECE"; // ESPECE | CHEQUE | TRAITE | VIREMENT
        public decimal AmountHT { get; set; }
        public decimal FeeHT { get; set; }
        public decimal TaxRate { get; set; }
        public decimal FeeWithTax { get; set; }
        public decimal NetAmount { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public int? PaymentInstrumentId { get; set; }
        public PaymentInstrument? PaymentInstrument { get; set; }
        public int? SalesSiteId { get; set; }
        public SalesSite? SalesSite { get; set; }

        public DateTime? CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? CreatedByUserId { get; set; }
        public bool IsDeleted { get; set; }

        public BankDeposit()
        {
            CreatedAt = DateTime.UtcNow;
            IsDeleted = false;
        }
    }
}
