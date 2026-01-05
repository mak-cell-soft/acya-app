using System;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class EnterpriseDto
  {
    public int id { get; set; }
    public string? name { get; set; }
    public string? description { get; set; }
    public string? guid { get; set; }
    public string? email { get; set; }
    public string? phone { get; set; }
    public string? mobileOne { get; set; }
    public string? mobileTwo { get; set; }
    public string? matriculeFiscal { get; set; }
    public string? devise { get; set; }
    public string? nameResponsable { get; set; }
    public string? surnameResponsable { get; set; }
    public string? positionResponsable { get; set; }
    public string? siegeAddress { get; set; }
    public string? commercialregister { get; set; }
    public string? capital { get; set; }
    public bool? issalingwood { get; set; }
    public SiteDto[]? sites { get; set; }
    public AppUserEnterpriseDto? user { get; set; }

    public EnterpriseDto()
    {
    }

    public EnterpriseDto(Enterprise entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(Enterprise entity)
    {
      id = entity.Id;
      name = entity.Name;
      description = entity.Description;
      email = entity.Email;
      guid = entity.Guid.ToString();
      phone = entity.Phone;
      mobileOne = entity.MobileOne;
      mobileTwo = entity.MobileTwo;
      matriculeFiscal = entity.MatriculeFiscal;
      devise = entity.Devise;
      nameResponsable = entity.NameResponsable;
      surnameResponsable = entity.SurnameResponsable;
      positionResponsable = entity.PositionResponsable;
      siegeAddress = entity.SiegeAddress;
      commercialregister = entity.CommercialRegister;
      capital = entity.Capital;
      issalingwood = entity.IsSalingWood;
      if (entity.Sites != null)
      {
        sites = entity.Sites.Select(site => new SiteDto(site)).ToArray();
      }
    }
  }

  public class SiteDto
  {
    public int id { get; set; }
    public string? gov { get; set; }
    public string? codepost { get; set; }
    public string? address { get; set; }
    public bool isForsale { get; set; }
    public bool isdeleted { get; set; }
    public int? enterpriseid { get; set; }

    public SiteDto()
    {
    }

    public SiteDto(SalesSite entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(SalesSite entity)
    {
      id = entity.Id;
      gov = entity.Gouvernorate;
      codepost = entity.CodePost; 
      address = entity.Address;
      isForsale = entity.IsForSale;
      enterpriseid = entity.EnterpriseId;
    }
  }

  public class AppUserEnterpriseDto
  {
    public string? name { get; set; }
    public string? surname { get; set; }
    public string? email { get; set; }
    public string? password { get; set; }
    public string? role { get; set; }

    public AppUserEnterpriseDto() {}

    /**
     * Cette méthode nous permet de Transmettre les infos de l'utilisateur Initial lors de la
     * création de l'entreprise vers AppUserDto. Ce dernier contient le code nécessaire pour
     * continuer la création avec les entités de la Base de données.
     */
    public AppUserDto MoveToAppUserDto()
    {
      return new AppUserDto
      {
        email = this.email,
        password = this.password,
        isactive = true,
        login = this.surname!.ToLower() + '.' + this.name!.ToLower(),
        person = new PersonDto
        {
          lastname = this.name?.ToUpper() ?? string.Empty,
          firstname = this.surname,
          role = int.TryParse(this.role, out var parsedRole) ? parsedRole : 0,
          isappuser= true
        }
      };
    }

  }
}
