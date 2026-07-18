using ms.webapp.api.acya.core.Entities.Dtos;

namespace ms.webapp.api.acya.core.Entities.DTOs.Authentication
{
  public class AppUserPublicDto
  {
    public int id { get; set; }
    public string? login { get; set; }
    public string? email { get; set; }
    public bool isactive { get; set; }
    public int? defaultsite { get; set; }
    public int? identerprise { get; set; }
    public PersonSafeDto? person { get; set; }

    public AppUserPublicDto() {}

    public AppUserPublicDto(AppUser entity)
    {
      id = entity.Id;
      login = entity.Login!;
      email = entity.Email;
      isactive = entity.IsActive;
      defaultsite = entity.IdSalesSite;
      identerprise = entity.EnterpriseId;
      person = entity.Persons != null ? new PersonSafeDto(entity.Persons) : null;
    }

    public AppUserPublicDto(AppUserDto dto)
    {
      id = dto.id;
      login = dto.login;
      email = dto.email;
      isactive = dto.isactive;
      defaultsite = dto.defaultsite;
      identerprise = dto.identerprise;
      person = dto.person != null ? new PersonSafeDto(dto.person) : null;
    }
  }
}
