using System.ComponentModel.DataAnnotations;

namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    public class UpdateMobileBuildStatusDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;

        public string? ArtifactPath { get; set; }
        public long? ArtifactSize { get; set; }
        public string? Sha256 { get; set; }
        public string? ErrorMessage { get; set; }
        public string? GitCommitHash { get; set; }
        public string? WorkflowRunId { get; set; }
    }
}
