using System.Security.Claims;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.Interfaces
{
  public interface ITokenService
  {
    string CreateToken(AppUser user, string? permissionsJson = null, string? sessionId = null);

    /// <summary>
    /// Validates a JWT's cryptographic signature, signing algorithm (HS256), issuer, and audience
    /// while ignoring expiration so an expired token can still safely identify its own session on logout.
    /// Returns null if the token is missing, malformed, unsigned, or fails signature/issuer/audience validation.
    /// </summary>
    ClaimsPrincipal? ValidateTokenIgnoringLifetime(string token);
  }
}
