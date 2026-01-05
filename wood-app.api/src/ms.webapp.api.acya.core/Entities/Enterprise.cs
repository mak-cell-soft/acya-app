using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
  public class Enterprise : IEntity
  {
    public int Id { get; set; }
    public string? Name { get; set; }
    public Guid Guid { get; set; }
    public string? Description { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? MobileOne { get; set; }
    public string? MobileTwo { get; set; }
    public string? MatriculeFiscal { get; set; }
    public string? Devise { get; set; }
    public string? NameResponsable { get; set; }
    public string? SurnameResponsable { get; set; }
    public string? PositionResponsable { get; set; }
    public string? SiegeAddress { get; set; }
    public string? CommercialRegister { get; set; }
    public string? Capital { get; set; }
    public bool? IsSalingWood { get; set; }

    public HashSet<SalesSite>? Sites { get; set; } = new HashSet<SalesSite>();

    public Enterprise()
    {
    }

    public Enterprise(EnterpriseDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(EnterpriseDto dto)
    {
      Id = dto.id;
      Name= dto.name;
      Description= dto.description;
      Guid = Guid.Parse(dto.guid!);
      Email= dto.email;
      Phone= dto.phone;
      MobileOne= dto.mobileOne;
      MobileTwo= dto.mobileTwo;
      MatriculeFiscal = dto.matriculeFiscal;
      Devise = dto.devise;
      NameResponsable= dto.nameResponsable;
      PositionResponsable = dto.positionResponsable;
      SurnameResponsable = dto.surnameResponsable!.ToUpper();
      SiegeAddress = dto.siegeAddress;
      CommercialRegister = dto.commercialregister;
      Capital = dto.capital;
      IsSalingWood = dto.issalingwood;

      if (dto.sites != null)
      {
        // Initialize Sites with a HashSet of transformed SiteDto objects
        Sites = new HashSet<SalesSite>(dto.sites.Select(siteDto => new SalesSite(siteDto)));
      }

      //if (dto.user != null)
      //{
      //  var userDto = dto.user.MoveToAppUserDto();
      //  if (userDto != null)
      //  {
      //    User = new AppUser();
      //    User.UpdateFromDto(userDto);
      //  }
      //}


    }
  }
}
