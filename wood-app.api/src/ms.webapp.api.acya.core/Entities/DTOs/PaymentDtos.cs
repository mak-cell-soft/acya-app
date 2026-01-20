using System;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class CreatePaymentDto
    {
        public int DocumentId { get; set; }
        public int CustomerId { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
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
}
