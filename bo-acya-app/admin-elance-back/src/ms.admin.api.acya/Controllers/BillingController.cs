using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.common.Enums;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class BillingController : ControllerBase
    {
        private readonly MasterDbContext _context;

        public BillingController(MasterDbContext context)
        {
            _context = context;
        }

        [HttpGet("subscriptions/{tenantId}")]
        public async Task<IActionResult> GetSubscriptions(long tenantId)
        {
            var subs = await _context.TenantSubscriptions
                .Where(s => s.TenantId == tenantId)
                .OrderByDescending(s => s.StartDate)
                .ToListAsync();

            return Ok(subs);
        }

        public class UpdatePlanRequest
        {
            public TenantPlan Plan { get; set; }
            public decimal Price { get; set; }
            public int DurationDays { get; set; }
        }

        [HttpPost("subscriptions/{tenantId}")]
        public async Task<IActionResult> UpdateSubscription(long tenantId, [FromBody] UpdatePlanRequest request)
        {
            var tenant = await _context.Enterprises.FindAsync(tenantId);
            if (tenant == null) return NotFound("Tenant not found.");

            tenant.Plan = request.Plan;
            tenant.Status = TenantStatus.Active;
            tenant.IsActive = true;
            tenant.ActivatedAt = DateTime.UtcNow;

            var sub = new TenantSubscription
            {
                TenantId = tenantId,
                Plan = request.Plan,
                Status = "Active",
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(request.DurationDays),
                Price = request.Price,
                CreatedAt = DateTime.UtcNow
            };

            await _context.TenantSubscriptions.AddAsync(sub);

            var auditLog = new MasterAuditLog
            {
                TenantId = tenantId,
                Action = "Subscription Plan Updated",
                Details = $"SaaS plan changed to {request.Plan} for price {request.Price} with duration {request.DurationDays} days.",
                PerformedBy = "Super Admin",
                Timestamp = DateTime.UtcNow
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);

            await _context.SaveChangesAsync();

            return Ok(sub);
        }

        [HttpGet("invoices/{tenantId}")]
        public async Task<IActionResult> GetInvoices(long tenantId)
        {
            var invoices = await _context.TenantInvoices
                .Where(i => i.TenantId == tenantId)
                .OrderByDescending(i => i.BillingDate)
                .ToListAsync();

            return Ok(invoices);
        }

        public class CreateInvoiceRequest
        {
            public decimal Amount { get; set; }
            public string Currency { get; set; } = "EUR";
            public int DueDays { get; set; } = 30;
        }

        [HttpPost("invoices/{tenantId}")]
        public async Task<IActionResult> CreateInvoice(long tenantId, [FromBody] CreateInvoiceRequest request)
        {
            var tenant = await _context.Enterprises.FindAsync(tenantId);
            if (tenant == null) return NotFound("Tenant not found.");

            var invoiceNumber = $"INV-{DateTime.UtcNow.Year}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";

            var invoice = new TenantInvoice
            {
                TenantId = tenantId,
                InvoiceNumber = invoiceNumber,
                Amount = request.Amount,
                Currency = request.Currency,
                Status = "Unpaid",
                BillingDate = DateTime.UtcNow,
                DueDate = DateTime.UtcNow.AddDays(request.DueDays),
                CreatedAt = DateTime.UtcNow
            };

            await _context.TenantInvoices.AddAsync(invoice);

            var auditLog = new MasterAuditLog
            {
                TenantId = tenantId,
                Action = "Invoice Generated",
                Details = $"Manual Invoice {invoiceNumber} generated for amount {request.Amount} {request.Currency}.",
                PerformedBy = "Super Admin",
                Timestamp = DateTime.UtcNow
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);

            await _context.SaveChangesAsync();

            return Ok(invoice);
        }

        public class RegisterPaymentRequest
        {
            public decimal Amount { get; set; }
            public string PaymentMethod { get; set; } = "WireTransfer";
            public string TransactionId { get; set; } = string.Empty;
        }

        [HttpPost("payments/{invoiceId}")]
        public async Task<IActionResult> RegisterPayment(long invoiceId, [FromBody] RegisterPaymentRequest request)
        {
            var invoice = await _context.TenantInvoices.FindAsync(invoiceId);
            if (invoice == null) return NotFound("Invoice not found.");

            invoice.Status = "Paid";

            var payment = new TenantPayment
            {
                TenantId = invoice.TenantId,
                InvoiceId = invoiceId,
                Amount = request.Amount,
                PaymentDate = DateTime.UtcNow,
                PaymentMethod = request.PaymentMethod,
                TransactionId = request.TransactionId,
                Status = "Completed",
                CreatedAt = DateTime.UtcNow
            };

            await _context.TenantPayments.AddAsync(payment);

            var auditLog = new MasterAuditLog
            {
                TenantId = invoice.TenantId,
                Action = "Payment Registered",
                Details = $"Payment of {request.Amount} registered for Invoice {invoice.InvoiceNumber}.",
                PerformedBy = "Super Admin",
                Timestamp = DateTime.UtcNow
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);

            await _context.SaveChangesAsync();

            return Ok(payment);
        }
    }
}
