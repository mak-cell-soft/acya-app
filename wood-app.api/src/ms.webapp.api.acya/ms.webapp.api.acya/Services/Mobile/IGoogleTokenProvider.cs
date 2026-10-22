using System.Threading;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.Services.Mobile
{
    /// <summary>
    /// Abstraction for acquiring Google OAuth2 bearer tokens for service accounts.
    /// Allows isolated mockability in tests without accessing live Google endpoints.
    /// </summary>
    public interface IGoogleTokenProvider
    {
        Task<string> GetAccessTokenAsync(string credentialsPath, CancellationToken cancellationToken = default);
    }
}
