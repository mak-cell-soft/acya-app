using System;

namespace ms.webapp.api.acya.core.Entities
{
  /// <summary>
  /// Read/write entity mapping to public.bo_tbl_tenant_subscriptions for SaaS billing & reminder evaluation.
  /// </summary>
  public class MasterTenantSubscription
  {
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Plan { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Price { get; set; }
    public DateTime CreatedAt { get; set; }
  }

  /// <summary>
  /// Read/write entity mapping to public.bo_tbl_tenant_invoices for SaaS billing & reminder evaluation.
  /// </summary>
  public class MasterTenantInvoice
  {
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TND";
    public string Status { get; set; } = string.Empty;
    public DateTime BillingDate { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
  }

  /// <summary>
  /// Read/write entity mapping to public.bo_tbl_tenant_payments for SaaS billing & reminder evaluation.
  /// </summary>
  public class MasterTenantPayment
  {
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string? TransactionId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
  }
}
