namespace ms.webapp.api.acya.core.Interfaces
{
    /// <summary>
    /// Contract for rate-limiting diagnostic push notification tests.
    /// Limits requests per (Tenant + User) pair to prevent dispatch flooding.
    /// </summary>
    public interface IDeviceTestPushRateLimiter
    {
        /// <summary>
        /// Evaluates whether a diagnostic push request is allowed within the rate limit window.
        /// </summary>
        /// <param name="tenantSlug">Active tenant slug.</param>
        /// <param name="userId">Authenticated user ID.</param>
        /// <param name="retryAfterSeconds">Seconds remaining before a new request is permitted.</param>
        /// <returns>True if allowed, false if rate limited.</returns>
        bool IsAllowed(string? tenantSlug, int userId, out int retryAfterSeconds);
    }
}
