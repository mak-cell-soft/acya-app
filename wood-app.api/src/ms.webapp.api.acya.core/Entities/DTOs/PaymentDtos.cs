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
        public string? PaymentMethod { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
    }

    public class PaymentDto
    {
        public int PaymentId { get; set; }
        public int DocumentId { get; set; }
        public string? DocumentNumber { get; set; }
        public int CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
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
        public DateTime? IssueDate { get; set; }
        public DateTime? DueDate { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public bool IsPaidAtBank { get; set; }
        public DateTime? PaidAtBankDate { get; set; }
        public string? BankSettlementStatus { get; set; }
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
}
