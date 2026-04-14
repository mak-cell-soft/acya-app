namespace ms.webapp.api.acya.api.Models
{
    /// <summary>
    /// Configuration settings for SMTP server.
    /// Values are loaded from appsettings.json.
    /// </summary>
    public class SmtpSettings
    {
        public string Server { get; set; } = string.Empty;
        public int Port { get; set; } = 587;
        public string SenderName { get; set; } = string.Empty;
        public string SenderEmail { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool EnableSsl { get; set; } = true;
    }
}
