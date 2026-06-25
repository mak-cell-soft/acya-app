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
    public int AuditRetentionMonths { get; set; } = 12; // Default to 12 months
    public string? DocumentNumberingConfig { get; set; }
    public string? LogoUrl { get; set; }
    public string? FaviconUrl { get; set; }
    public string? PrimaryColor { get; set; }
    public string? CustomDomain { get; set; }
    public string? Language { get; set; }
    public string? Currency { get; set; }

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
      // NOTE: Ensure the ID matches.
      Id = dto.id;
      Name = dto.name;
      Description = dto.description;
      
      // NOTE: Only parse the Guid if it is provided and valid, otherwise retain the existing Guid identifier.
      // This protects against ArgumentNullExceptions during partial API updates.
      if (!string.IsNullOrEmpty(dto.guid))
      {
        Guid = Guid.Parse(dto.guid);
      }
      
      Email = dto.email;
      Phone = dto.phone;
      MobileOne = dto.mobileOne;
      MobileTwo = dto.mobileTwo;
      MatriculeFiscal = dto.matriculeFiscal;
      Devise = dto.devise;
      
      // NOTE: Normalize responsible name to uppercase for consistency in branding/reporting.
      NameResponsable = dto.nameResponsable?.ToUpper();
      PositionResponsable = dto.positionResponsable;
      
      // NOTE: Handle possible null value gracefully to prevent null reference exceptions.
      SurnameResponsable = dto.surnameResponsable;
      SiegeAddress = dto.siegeAddress;
      CommercialRegister = dto.commercialregister;
      Capital = dto.capital;
      IsSalingWood = dto.issalingwood;
      AuditRetentionMonths = dto.auditRetentionMonths;
      DocumentNumberingConfig = dto.documentNumberingConfig;
      LogoUrl = dto.logoUrl;
      FaviconUrl = dto.faviconUrl;
      PrimaryColor = dto.primaryColor;
      CustomDomain = dto.customDomain;
      Language = dto.language;
      Currency = dto.currency;

      if (dto.sites != null)
      {
        // NOTE: Initialize Sites with a HashSet of transformed SiteDto objects.
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
