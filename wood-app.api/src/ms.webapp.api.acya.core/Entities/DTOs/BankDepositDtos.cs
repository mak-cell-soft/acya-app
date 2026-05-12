using System;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class BankDepositDto
    {
        public int Id { get; set; }
        public int BankId { get; set; }
        public string? BankName { get; set; }
        public DateTime DepositDate { get; set; }
        public string DepositType { get; set; } = "ESPECE";
        public decimal AmountHT { get; set; }
        public decimal FeeHT { get; set; }
        public decimal TaxRate { get; set; }
        public decimal FeeWithTax { get; set; }
        public decimal NetAmount { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public int? PaymentInstrumentId { get; set; }
        public int? SalesSiteId { get; set; }
        public string? SalesSiteName { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
    }

    public class CreateBankDepositDto
    {
        public int BankId { get; set; }
        public string DepositType { get; set; } = "ESPECE";
        public decimal AmountHT { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public int? PaymentInstrumentId { get; set; }
        public int? SalesSiteId { get; set; }
        public int? CreatedByUserId { get; set; }
    }
}
