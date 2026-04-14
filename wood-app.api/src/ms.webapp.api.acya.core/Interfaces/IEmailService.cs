namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IEmailService
    {
        /// <summary>
        /// Sends a basic text or HTML email.
        /// </summary>
        Task SendEmailAsync(string to, string subject, string body, bool isHtml = true);
    }
}
