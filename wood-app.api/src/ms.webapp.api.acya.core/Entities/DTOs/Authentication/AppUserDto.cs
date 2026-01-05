using ms.webapp.api.acya.core.Entities.Dtos;

namespace ms.webapp.api.acya.core.Entities.DTOs.Authentication
{
  public class AppUserDto
  {
    public int id { get; set; }
    public string? login { get; set; }
    public string? email { get; set; }
    public bool isactive { get; set; }
    public int? defaultsite { get; set; }
    public int? identerprise { get; set; }
    public string? password { get; set; }
    public PersonDto? person { get; set; }

    public AppUserDto() {}

    public AppUserDto(AppUser entity)
    {
      id = entity.Id;
      login = entity.Login!;
      email = entity.Email;
      isactive= entity.IsActive;
      defaultsite = entity.IdSalesSite;
      identerprise = entity.EnterpriseId;
      person = entity.Persons != null ? new PersonDto(entity.Persons) : null;
    }
  }
}
