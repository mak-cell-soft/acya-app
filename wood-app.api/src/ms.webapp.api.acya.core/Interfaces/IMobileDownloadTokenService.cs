using System;

namespace ms.webapp.api.acya.core.Interfaces
{
    public class ValidatedDownloadToken
    {
        public int ReleaseId { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public int? UserId { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    /// <summary>
    /// Service to generate and validate short-lived, tamper-proof download tokens.
    /// Eliminates the need for public URLs while avoiding direct storage path exposure.
    /// </summary>
    public interface IMobileDownloadTokenService
    {
        /// <summary>
        /// Generates a signed, short-lived token for authorized APK download.
        /// </summary>
        string GenerateToken(int releaseId, string tenantId, int? userId, TimeSpan? lifetime = null);

        /// <summary>
        /// Validates a raw download token, checking signature and expiration.
        /// </summary>
        bool TryValidateToken(string rawToken, out ValidatedDownloadToken? validatedToken);
    }
}
