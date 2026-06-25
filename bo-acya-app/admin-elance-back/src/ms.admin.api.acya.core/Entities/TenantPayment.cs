using System;

namespace ms.admin.api.acya.core.Entities
{
    public class TenantPayment
    {
        public long Id { get; set; }
        public long TenantId { get; set; }
        public long InvoiceId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string PaymentMethod { get; set; } = string.Empty; // e.g. "Bank Transfer", "Credit Card", "Cheque"
        public string? TransactionId { get; set; }
        public string Status { get; set; } = string.Empty; // e.g. "Completed", "Failed", "Refunded"
        public DateTime CreatedAt { get; set; }

        public MasterEnterprise? Tenant { get; set; }
        public TenantInvoice? Invoice { get; set; }
    }
}
