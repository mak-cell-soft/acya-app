using System;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class CreatePaymentDto
    {
        public int DocumentId { get; set; }
        public int CustomerId { get; set; }
        public int updatedbyid { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string? Currency { get; set; }
        public decimal ExchangeRate { get; set; } = 1.0m;
        public string? PaymentMethod { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public PaymentInstrumentDto? InstrumentDetails { get; set; }
    }

    public class UpdatePaymentDto
    {
        public int PaymentId { get; set; }
        public DateTime? PaymentDate { get; set; }
        public decimal? Amount { get; set; }
        public string? Currency { get; set; }
        public decimal? ExchangeRate { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public PaymentInstrumentDto? InstrumentDetails { get; set; }
    }

    public class PaymentDto
    {
        public int PaymentId { get; set; }
        public int? DocumentId { get; set; }
        public string? DocumentNumber { get; set; }
        public int CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string? Currency { get; set; }
        public decimal ExchangeRate { get; set; } = 1.0m;
        public string? PaymentMethod { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public string? Nature { get; set; }
        public PaymentInstrumentDto? Instrument { get; set; }
    }

    public class PaymentInstrumentDto
    {
        public int Id { get; set; }
        public int PaymentId { get; set; }
        public string? Type { get; set; }
        public string? InstrumentNumber { get; set; }
        public string? Bank { get; set; }
        public string? Owner { get; set; }
        public string? Porter { get; set; }
        public DateTime? IssueDate { get; set; }
        public DateTime? DueDate { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public bool IsPaidAtBank { get; set; }
        public DateTime? PaidAtBankDate { get; set; }
        public string? BankSettlementStatus { get; set; }
    }

    public class PaymentInstrumentExtendedDto : PaymentInstrumentDto
    {
        public decimal Amount { get; set; }
        public string? CustomerName { get; set; }
        public string? DocumentNumber { get; set; }
        public string? BordereauReference { get; set; }
        public string? CounterPartType { get; set; }
    }

    public class CreateBordereauDto
    {
        public int BankId { get; set; }
        public List<int> InstrumentIds { get; set; } = new();
        public DateTime DepositDate { get; set; } = DateTime.UtcNow;
        public string? Notes { get; set; }
        public int? SalesSiteId { get; set; }
        public int? CreatedByUserId { get; set; }
    }

    public class SupplierEcheanceDto
    {
        public DateTime DueDate { get; set; }
        public decimal TotalAmount { get; set; }
        public int InstrumentCount { get; set; }
        public List<EcheanceDetailDto> Details { get; set; } = new();
    }

    public class EcheanceDetailDto
    {
        public int PaymentId { get; set; }
        public int DocumentId { get; set; }
        public string? DocumentNumber { get; set; }
        public string? SupplierName { get; set; }
        public string? InstrumentNumber { get; set; }
        public string? Bank { get; set; }
        public decimal Amount { get; set; }
        public DateTime DueDate { get; set; }
        public bool IsPaidAtBank { get; set; }
    }

    public class MarkTraitePaidDto
    {
        public DateTime PaidAtBankDate { get; set; }
        public string? Notes { get; set; }
    }

    public class PaymentSearchDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int? CustomerId { get; set; }
        public int? DocumentId { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Search { get; set; }
        public string? Nature { get; set; }
        public string? CounterpartType { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class PagedResult<T>
    {
        public IEnumerable<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }
    public class DashboardPaymentDto
    {
        public int PaymentId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public string? CustomerName { get; set; }
        public string? InvoiceNumber { get; set; }
        public string? DeliveryNoteNumber { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateRecouvrementDto
    {
        public int CustomerId { get; set; }
        public int UpdatedByUserId { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string? Currency { get; set; }
        public decimal ExchangeRate { get; set; } = 1.0m;
        public string PaymentMethod { get; set; } = "ESPECE";
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public PaymentInstrumentDto? InstrumentDetails { get; set; }
        public int? DocumentId { get; set; } // Optional: user can choose to relate it to a specific document
    }

    public class CustomerRecouvrementDto
    {
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public decimal CurrentBalance { get; set; }
        public decimal TotalUnpaid { get; set; }
        public List<UnpaidInvoiceSummaryDto> UnpaidInvoices { get; set; } = new();
    }

    public class UnpaidInvoiceSummaryDto
    {
        public int DocumentId { get; set; }
        public string DocumentNumber { get; set; } = string.Empty;
        public DateTime CreationDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal Remaining { get; set; }
    }

    public class DisburseSupplierInstrumentsDto
    {
        public List<int> InstrumentIds { get; set; } = new();
        public int BankId { get; set; }
        public DateTime DisburseDate { get; set; }
        public string? Notes { get; set; }
        public int? CreatedByUserId { get; set; }
        public int? SalesSiteId { get; set; }
    }

    public class DeliverSupplierInstrumentsDto
    {
        public List<int> InstrumentIds { get; set; } = new();
        public DateTime DeliveryDate { get; set; }
        public int? CreatedByUserId { get; set; }
    }
}
