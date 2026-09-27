using System;

namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    public class MobileDownloadResponseDto
    {
        public int ReleaseId { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string DownloadUrl { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }
}
