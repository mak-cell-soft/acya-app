using System.ComponentModel.DataAnnotations;

namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    public class CreateMobileBuildDto
    {
        [Required]
        public string TenantId { get; set; } = string.Empty;

        /// <summary>
        /// Semantic version string (e.g. "1.0.1"). If omitted, empty, or "auto", the server
        /// automatically calculates the next version based on previous builds/releases.
        /// </summary>
        [MaxLength(50)]
        public string? Version { get; set; }

        /// <summary>
        /// Deprecated client parameter. Build numbers are strictly server-assigned to ensure
        /// atomic sequential allocation and prevent collisions. Any supplied value is ignored.
        /// </summary>
        public int BuildNumber { get; set; }

        public string? ReleaseNotes { get; set; }
        public string? GitBranch { get; set; } = "main";
        public string? Environment { get; set; } = "production";
    }
}
