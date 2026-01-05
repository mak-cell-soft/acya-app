using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.DTOs.Authentication
{
  public class UserAuthDto
  {
    public string? fullname { get; set; }
    public string? token { get; set; }
    public bool isSuccess { get; set; }
    public string? message { get; set; }
  }
}
