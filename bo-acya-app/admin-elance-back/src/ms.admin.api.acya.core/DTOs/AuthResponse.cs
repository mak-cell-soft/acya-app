namespace ms.admin.api.acya.core.DTOs
{
    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = "SUPER_ADMIN";
    }
}
