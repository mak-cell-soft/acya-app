namespace ms.webapp.api.acya.core.Entities.DTOs.Authentication
{
    public class PasswordResetDto
    {
        public string? Token { get; set; }
        public string? NewPassword { get; set; }
        public string? ConfirmPassword { get; set; }
    }
}
