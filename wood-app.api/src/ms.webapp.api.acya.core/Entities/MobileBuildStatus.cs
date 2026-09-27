namespace ms.webapp.api.acya.core.Entities
{
    public static class MobileBuildStatus
    {
        public const string Pending = "Pending";
        public const string Building = "Building";
        public const string Succeeded = "Succeeded";
        public const string Failed = "Failed";
        public const string Cancelled = "Cancelled";

        public static readonly string[] ValidStatuses = new[]
        {
            Pending, Building, Succeeded, Failed, Cancelled
        };

        public static bool IsValid(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            return ValidStatuses.Contains(status, StringComparer.OrdinalIgnoreCase);
        }
    }
}
