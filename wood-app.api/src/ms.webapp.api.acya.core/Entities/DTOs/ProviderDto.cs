using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class ProviderDto
  {
    public int? id { get; set; }
    public string? prefix { get; set; }
    public string? name { get; set; }
    public string? description { get; set; }
    public string? representedbyname { get; set; }
    public string? representedbysurname { get; set; }
    public string? representedbyfullname { get; set; }
    public string? address { get; set; }
    public string? email { get; set; }
    public string? category { get; set; } // Entrepreneur, Artisant, Service, ...
    public string? taxregistrationnumber { get; set; } // Matricule Fiscal
    public string? phonenumberone { get; set; }
    public string? phonenumbertwo { get; set; }
    public string? bankname { get; set; }
    public string? bankaccountnumber { get; set; }
    public bool isdeleted { get; set; }
    public bool isactive { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    public int updatedbyid { get; set; }
    public bool? editing { get; set; } = false;

    public ProviderDto()
    {

    }

    public ProviderDto(Provider entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(Provider entity)
    {
      id = entity.Id; prefix = entity.Prefix;
      name = entity.Name; description = entity.Description;
      representedbyname = entity.RepresentedByName;
      representedbysurname = entity.RepresentedBySurname;
      representedbyfullname = entity.RepresentedByFullname;
      address = entity.Address;
      email= entity.Email;
      category = entity.Category;
      taxregistrationnumber = entity.TaxRegistrationNumber;
      phonenumberone = entity.PhoneNumberOne;
      phonenumbertwo = entity.PhoneNumberTwo;
      bankname = entity.BankName;
      bankaccountnumber = entity.BankAccountNumber;
      creationdate = entity.CreationDate;
      updatedate = entity.UpdateDate;
      updatedbyid = entity.UpdatedById;
    }

  }
}
