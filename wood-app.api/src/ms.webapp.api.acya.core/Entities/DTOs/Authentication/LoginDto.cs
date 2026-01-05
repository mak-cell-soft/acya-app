namespace ms.webapp.api.acya.core.Entities.DTOs.Authentication
{
  public class LoginRequestDto
  {
    public string? login { get; set; }
    public string? password { get; set; }
    public string? enterpriseRef { get; set; }
  }
}
