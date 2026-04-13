namespace ms.webapp.api.acya.core.Entities.DTOs.Authentication
{
    public class ProfileUpdateDto
    {
        public string? Email { get; set; }
        public string? Login { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
    }
}
