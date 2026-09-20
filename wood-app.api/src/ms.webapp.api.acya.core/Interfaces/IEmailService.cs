namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IEmailService
    {
        /// <summary>
        /// Sends a basic text or HTML email.
        /// </summary>
        Task SendEmailAsync(string to, string subject, string body, bool isHtml = true);

        /// <summary>
        /// Sends a text or HTML email with a file attachment.
        /// </summary>
        Task SendEmailWithAttachmentAsync(string to, string subject, string body, byte[] attachmentBytes, string fileName, string contentType = "application/pdf", bool isHtml = true);
    }
}
