namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IWorkspaceRecoveryRateLimiter
    {
        bool IsAllowed(string clientIp, string email, out int retryAfterSeconds);
    }
}
