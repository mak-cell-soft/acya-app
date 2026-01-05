using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.Interfaces
{
  public interface ITokenService
  {
    string CreateToken(AppUser user);
  }
}
