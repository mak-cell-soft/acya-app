using System.ComponentModel.DataAnnotations;

namespace ms.webapp.api.acya.core.Entities.DTOs.Notifications
{
    public class RegisterDeviceTokenDto
    {
        [Required(ErrorMessage = "Token is required.")]
        [StringLength(512, MinimumLength = 1, ErrorMessage = "Token length must be between 1 and 512 characters.")]
        public string Token { get; set; } = string.Empty;

        [Required(ErrorMessage = "Platform is required.")]
        [StringLength(30, ErrorMessage = "Platform must not exceed 30 characters.")]
        public string Platform { get; set; } = "android";

        [StringLength(50, ErrorMessage = "AppVersion must not exceed 50 characters.")]
        public string? AppVersion { get; set; }
    }

    public class UnregisterDeviceTokenDto
    {
        [Required(ErrorMessage = "Token is required.")]
        [StringLength(512, MinimumLength = 1, ErrorMessage = "Token length must be between 1 and 512 characters.")]
        public string Token { get; set; } = string.Empty;
    }

    public class DeviceTokenResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
