using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ms.admin.api.acya.common.Enums;
using ms.admin.api.acya.core.Entities;

namespace ms.admin.api.acya.core.DTOs
{
    public class BillingReminderIntervalsConfig
    {
        public List<int> BeforeDueDays { get; set; } = new() { 7, 3 };
        public bool OnDueDate { get; set; } = true;
        public int AfterDueIntervalDays { get; set; } = 7;
        public List<int> SubscriptionExpiringBeforeDays { get; set; } = new() { 7, 3 };
    }

    public class TenantConnectionSummaryDto
    {
        public long TenantId { get; set; }
        public string TenantSlug { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public int MaxConnectedUsers { get; set; } = 5;
        public int ConnectedUsers { get; set; }
        public int AvailableSlots { get; set; }
        public bool IsExceedingLimit { get; set; }
        public List<ActiveSessionItemDto> ActiveSessions { get; set; } = new();
    }

    public class ActiveSessionItemDto
    {
        public string SessionId { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime LastActivityAt { get; set; }
    }

    public class UpdateConnectionLimitRequest
    {
        public int MaxConnectedUsers { get; set; }
    }

    public class InvoiceDetailDto
    {
        public long Id { get; set; }
        public long TenantId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingBalance { get; set; }
        public string Currency { get; set; } = "TND";
        public string Status { get; set; } = string.Empty;
        public DateTime BillingDate { get; set; }
        public DateTime DueDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<TenantPayment> Payments { get; set; } = new();
    }

    public class TenantBillingSummaryDto
    {
        public long TenantId { get; set; }
        public string TenantName { get; set; } = string.Empty;
        public string TenantSlug { get; set; } = string.Empty;
        public string CurrentPlan { get; set; } = string.Empty;
        public string SubscriptionStatus { get; set; } = string.Empty;
        public string TenantConnectionStatus { get; set; } = string.Empty;
        public bool IsConnectionActive { get; set; }
        public DateTime? SubscriptionStartDate { get; set; }
        public DateTime? SubscriptionEndDate { get; set; }
        public decimal OutstandingBalance { get; set; }
        public string Currency { get; set; } = "TND";
        public Dictionary<string, decimal> HistoricalBalancesByCurrency { get; set; } = new();
        public DateTime? LastPaymentDate { get; set; }
        public int ConnectedUsers { get; set; }
        public int MaxConnectedUsers { get; set; } = 5;
        public int AvailableSlots { get; set; }
    }
}
