namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    /// <summary>
    /// Tenant configuration used by the mobile build pipeline.
    /// Dynamically generated from existing database records (TenantRegistry & Enterprise).
    /// </summary>
    public class MobileTenantConfigDto
    {
        public string TenantId { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string AppName { get; set; } = string.Empty;
        public string PackageName { get; set; } = string.Empty;
        public string Logo { get; set; } = string.Empty;
        public string PrimaryColor { get; set; } = "#1E3A8A";
        public string SecondaryColor { get; set; } = "#3B82F6";
        public string BaseUrl { get; set; } = string.Empty;
        public string Environment { get; set; } = "production";
        public string Language { get; set; } = "fr";
        public string Currency { get; set; } = "TND";
        public bool HasChantierModule { get; set; }
        public bool HasProductionModule { get; set; }
    }
}
