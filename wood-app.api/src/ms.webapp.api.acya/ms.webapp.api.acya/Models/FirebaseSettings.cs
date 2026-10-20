namespace ms.webapp.api.acya.api.Models
{
    /// <summary>
    /// Configuration options for Firebase Admin SDK integration.
    /// Loaded securely from environment variables or configuration providers without committing secrets.
    /// </summary>
    public class FirebaseSettings
    {
        /// <summary>
        /// Absolute or relative path to a Firebase service-account JSON key file located outside the repository.
        /// </summary>
        public string? CredentialsPath { get; set; }

        /// <summary>
        /// Target Google Cloud / Firebase Project ID.
        /// </summary>
        public string? ProjectId { get; set; }
    }
}
