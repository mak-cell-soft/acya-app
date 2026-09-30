using System;
using System.ComponentModel.DataAnnotations;

namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    public class MobileTenantUserDto
    {
        public int Id { get; set; }
        public string Login { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool CanView { get; set; }
        public bool CanDownload { get; set; }
    }

    public class SendMobileAppDto
    {
        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        public int UserId { get; set; }

        public string? Email { get; set; }
    }

    public class TenantSendMobileAppDto
    {
        [Required]
        public int UserId { get; set; }

        public string? Email { get; set; }
    }

    public class SendMobileAppResultDto
    {
        public bool Success { get; set; }
        public string Recipient { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public int BuildNumber { get; set; }
        public string PortalUrl { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
