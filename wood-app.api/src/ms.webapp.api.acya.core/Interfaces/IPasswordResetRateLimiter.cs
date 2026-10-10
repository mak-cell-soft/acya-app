namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IPasswordResetRateLimiter
    {
        /// <summary>
        /// Evaluates whether a password reset request is allowed for the client IP and target email.
        /// </summary>
        /// <param name="clientIp">Client IP address from reverse proxy chain.</param>
        /// <param name="email">Target account email.</param>
        /// <param name="tenantSlug">Current tenant slug.</param>
        /// <param name="retryAfterSeconds">Seconds remaining before retry if rate limited.</param>
        /// <returns>True if allowed, false if rate limited.</returns>
        bool IsAllowed(string clientIp, string email, string? tenantSlug, out int retryAfterSeconds);
    }
}
