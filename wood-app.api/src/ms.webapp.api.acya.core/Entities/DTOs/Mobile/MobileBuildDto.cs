using System;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    public class MobileBuildDto
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public int BuildNumber { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ArtifactPath { get; set; }
        public long? ArtifactSize { get; set; }
        public string? Sha256 { get; set; }
        public string? ReleaseNotes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? ErrorMessage { get; set; }
        public string? CreatedBy { get; set; }
        public string? GitCommitHash { get; set; }
        public string? GitBranch { get; set; }
        public string? WorkflowRunId { get; set; }
        public bool IsActive { get; set; }

        public MobileBuildDto() { }

        public MobileBuildDto(MobileBuild build)
        {
            Id = build.Id;
            TenantId = build.TenantId;
            Version = build.Version;
            BuildNumber = build.BuildNumber;
            Status = build.Status;
            ArtifactPath = build.ArtifactPath;
            ArtifactSize = build.ArtifactSize;
            Sha256 = build.Sha256;
            ReleaseNotes = build.ReleaseNotes;
            CreatedAt = build.CreatedAt;
            StartedAt = build.StartedAt;
            CompletedAt = build.CompletedAt;
            ErrorMessage = build.ErrorMessage;
            CreatedBy = build.CreatedBy;
            GitCommitHash = build.GitCommitHash;
            GitBranch = build.GitBranch;
            WorkflowRunId = build.WorkflowRunId;
            IsActive = build.IsActive;
        }
    }
}
