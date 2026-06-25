using System;

namespace ms.admin.api.acya.core.Entities
{
    public class TenantInvoice
    {
        public long Id { get; set; }
        public long TenantId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "TND";
        public string Status { get; set; } = string.Empty; // e.g. "Paid", "Unpaid", "Overdue"
        public DateTime BillingDate { get; set; }
        public DateTime DueDate { get; set; }
        public DateTime CreatedAt { get; set; }

        public MasterEnterprise? Tenant { get; set; }
    }
}
