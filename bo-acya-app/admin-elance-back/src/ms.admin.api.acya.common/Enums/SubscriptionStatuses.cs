namespace ms.admin.api.acya.common.Enums
{
    /// <summary>
    /// Standardized SaaS subscription statuses.
    /// Reuses and normalizes existing status values while supporting full billing lifecycle states.
    /// </summary>
    public static class SubscriptionStatuses
    {
        public const string Trial = "TRIAL";
        public const string Active = "ACTIVE";
        public const string PaymentDue = "PAYMENT_DUE";
        public const string Overdue = "OVERDUE";
        public const string Suspended = "SUSPENDED";
        public const string Cancelled = "CANCELLED";
        public const string Expired = "EXPIRED";

        public static readonly string[] All = new[]
        {
            Trial,
            Active,
            PaymentDue,
            Overdue,
            Suspended,
            Cancelled,
            Expired
        };

        public static string Normalize(string? status, TenantPlan? plan = null)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return plan == TenantPlan.Trial ? Trial : Active;
            }

            var s = status.Trim().ToUpperInvariant().Replace(" ", "_").Replace("-", "_");
            return s switch
            {
                "TRIAL" => Trial,
                "ACTIVE" => plan == TenantPlan.Trial ? Trial : Active,
                "PAYMENT_DUE" or "PAYMENTDUE" or "DUE" => PaymentDue,
                "OVERDUE" or "PAST_DUE" => Overdue,
                "SUSPENDED" => Suspended,
                "CANCELLED" or "CANCELED" => Cancelled,
                "EXPIRED" => Expired,
                _ => s
            };
        }

        public static bool IsValid(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            var normalized = Normalize(status);
            foreach (var item in All)
            {
                if (string.Equals(item, normalized, System.StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }
    }

    public static class InvoiceStatuses
    {
        public const string Unpaid = "UNPAID";
        public const string PartiallyPaid = "PARTIALLY_PAID";
        public const string Paid = "PAID";
        public const string Overdue = "OVERDUE";
        public const string Cancelled = "CANCELLED";

        public static string Normalize(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return Unpaid;
            var s = status.Trim().ToUpperInvariant().Replace(" ", "_").Replace("-", "_");
            return s switch
            {
                "PAID" => Paid,
                "PARTIALLY_PAID" or "PARTIAL" => PartiallyPaid,
                "OVERDUE" => Overdue,
                "CANCELLED" or "CANCELED" => Cancelled,
                _ => Unpaid
            };
        }
    }
}
