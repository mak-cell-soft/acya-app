namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    /// <summary>
    /// Information on the next suggested semantic versions and sequential build number for a tenant.
    /// Note: NextBuildNumber is informational only and is never used as an authoritative reservation.
    /// </summary>
    public class NextMobileVersionDto
    {
        public string TenantId { get; set; } = string.Empty;
        public string SuggestedVersion { get; set; } = "1.0.0";
        public string PatchVersion { get; set; } = "1.0.0";
        public string MinorVersion { get; set; } = "1.0.0";
        public string MajorVersion { get; set; } = "1.0.0";
        public int NextBuildNumber { get; set; } = 1;
        public string? LatestVersion { get; set; }
        public string? LatestStatus { get; set; }
    }
}
