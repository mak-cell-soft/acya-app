using System.ComponentModel.DataAnnotations;

namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    public class CreateMobileBuildDto
    {
        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        public string Version { get; set; } = string.Empty;

        /// <summary>
        /// Optional build number. If omitted or 0, the system automatically assigns the next sequential number.
        /// </summary>
        public int BuildNumber { get; set; }

        public string? ReleaseNotes { get; set; }
        public string? GitBranch { get; set; } = "main";
        public string? Environment { get; set; } = "production";
    }
}
