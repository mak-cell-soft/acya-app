namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IQuoteRequestRateLimiter
    {
        /// <summary>
        /// Evaluates whether an inbound quote request is allowed for the client IP and customer email.
        /// </summary>
        /// <param name="clientIp">Client IP address forwarded by trusted reverse proxy.</param>
        /// <param name="email">Customer contact email.</param>
        /// <param name="tenantSlug">Current tenant slug.</param>
        /// <param name="retryAfterSeconds">Seconds remaining before retry if rate limited.</param>
        /// <returns>True if allowed, false if rate limited.</returns>
        bool IsAllowed(string clientIp, string email, string? tenantSlug, out int retryAfterSeconds);
    }
}
